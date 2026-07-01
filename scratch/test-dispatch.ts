import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { SosRequestEntity } from '../src/infrastructure/database/entities/sos-request.entity';
import { RescueTeamEntity } from '../src/infrastructure/database/entities/rescue-team.entity';
import { DispatchQueueEntity } from '../src/infrastructure/database/entities/dispatch-queue.entity';
import { DispatchOrchestratorService } from '../src/modules/sos-request/application/services/dispatch-orchestrator.service';
import { SystemSettingService } from '../src/modules/system-setting/application/services/system-setting.service';
import { SosStatus } from '../src/shared/core/enums/sosStatus.enum';
import { TeamStatus } from '../src/shared/core/enums/teamStatus.enum';
import { TeamType } from '../src/shared/core/enums/teamType.enum';
import { SosRequestType } from '../src/shared/core/enums/sosType.enum';
import { Severity } from '../src/shared/core/enums/level.enum';
import { SosSource } from '../src/shared/core/enums/sosSource.enum';

async function bootstrap() {
  console.log('⚡ Bootstrapping NestJS context for Auto-Dispatch v6 simulation...');
  const appContext = await NestFactory.createApplicationContext(AppModule);
  
  const orchestrator = appContext.get(DispatchOrchestratorService);
  const systemSetting = appContext.get(SystemSettingService);
  const dataSource = appContext.get(DataSource);
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  console.log('📝 Configuring temporary settings in DB...');
  // Đảm bảo cấu hình mặc định có trong system_settings hoặc sử dụng fallback
  await systemSetting.updateSettings({
    'dispatch.radius_steps': '5000,10000,20000',
    'dispatch.score_acceptable_threshold': '0.5',
    'dispatch.distance_delta_threshold_meters': '3000',
    'dispatch.max_simultaneous_dual_dispatches': '4',
  });

  // Insert mock rescue teams
  console.log('🚒 Creating mock rescue teams...');
  const teams: Partial<RescueTeamEntity>[] = [
    {
      provinceId: 1,
      adminUnitId: 1,
      name: 'Đội Dân Phòng A (Gần, Rảnh, Sai chuyên môn)',
      teamType: TeamType.DAN_PHONG,
      status: TeamStatus.AVAILABLE,
      activeCasesCount: 0,
      maxCapacity: 5,
      currentLocation: { type: 'Point', coordinates: [106.7000, 10.7580] }, // ~1.1km
      baseLocation: { type: 'Point', coordinates: [106.7000, 10.7580] },
      totalMissions: 10,
    },
    {
      provinceId: 1,
      adminUnitId: 1,
      name: 'Đội PCCC B (Hơi xa, Đang bận, Đúng chuyên môn)',
      teamType: TeamType.PCCC,
      status: TeamStatus.BUSY,
      activeCasesCount: 2, // Đang bận 2 ca
      maxCapacity: 5,
      currentLocation: { type: 'Point', coordinates: [106.7150, 10.7650] }, // ~2.8km
      baseLocation: { type: 'Point', coordinates: [106.7150, 10.7650] },
      totalMissions: 25,
    },
    {
      provinceId: 1,
      adminUnitId: 1,
      name: 'Đội Y Tế C (Xa, Rảnh, Sai chuyên môn)',
      teamType: TeamType.Y_TE,
      status: TeamStatus.AVAILABLE,
      activeCasesCount: 0,
      maxCapacity: 5,
      currentLocation: { type: 'Point', coordinates: [106.7500, 10.7800] }, // ~6.2km
      baseLocation: { type: 'Point', coordinates: [106.7500, 10.7800] },
      totalMissions: 5,
    }
  ];

  const dbTeams: RescueTeamEntity[] = [];
  for (const t of teams) {
    const created = dataSource.getRepository(RescueTeamEntity).create(t);
    dbTeams.push(await dataSource.getRepository(RescueTeamEntity).save(created));
  }
  console.log(`✅ Mock teams created with IDs: ${dbTeams.map(t => `${t.name} (ID: ${t.id})`).join(', ')}`);

  // Create Mock SOS Request
  console.log('🚨 Creating mock SOS request (Hỏa hoạn FIRE_FIGHTING, CRITICAL, Cần thiết bị chuyên dụng)...');
  const sosRequestData: Partial<SosRequestEntity> = {
    provinceId: 1,
    adminUnitId: 1,
    requestType: SosRequestType.FIRE_FIGHTING,
    status: SosStatus.PENDING,
    severity: Severity.CRITICAL,
    trappedPeopleCount: 2,
    imageUrls: [],
    source: SosSource.WEB,
    requiresEquipment: true, // Kích hoạt điều phối kép Dual Dispatch
    location: { type: 'Point', coordinates: [106.6920, 10.7550] },
  };

  const createdSos = dataSource.getRepository(SosRequestEntity).create(sosRequestData);
  const dbSos = await dataSource.getRepository(SosRequestEntity).save(createdSos);
  console.log(`✅ Mock SOS request created with ID: ${dbSos.id}`);

  console.log('\n🚀 Triggering DispatchOrchestrator.dispatch()...');
  try {
    const outcome = await orchestrator.dispatch(dbSos as any);
    console.log('\n════════════════════ SIMULATION RESULT ════════════════════');
    console.log(`Outcome Type: ${outcome.type.toUpperCase()}`);
    console.log(`Assigned Primary Team ID: ${outcome.assignedTeamId}`);
    if (outcome.assignedTeamId) {
      const primary = dbTeams.find(t => t.id === outcome.assignedTeamId);
      console.log(`Primary Team Name: ${primary?.name} (Type: ${primary?.teamType})`);
    }
    console.log(`Second (Queued) Team ID: ${outcome.secondTeamId}`);
    if (outcome.secondTeamId) {
      const second = dbTeams.find(t => t.id === outcome.secondTeamId);
      console.log(`Second Team Name: ${second?.name} (Type: ${second?.teamType})`);
    }
    
    // Check queue entry in DB
    const queues = await dataSource.getRepository(DispatchQueueEntity).find({ where: { sosRequestId: dbSos.id } });
    console.log(`Active Queue Entries for this SOS: ${queues.length}`);
    queues.forEach(q => {
      console.log(` - Queue ID: ${q.id}, Team ID: ${q.teamId}, Is Dual Dispatch: ${q.isDualDispatch}, Priority Score: ${q.priorityScore}`);
    });
    
    // Check updated SOS Request
    const updatedSos = await dataSource.getRepository(SosRequestEntity).findOne({ where: { id: dbSos.id } });
    console.log(`Updated SOS Request Status: ${updatedSos?.status}`);
    console.log(`Updated SOS Request Assigned Team: ${updatedSos?.assignedTeamId}`);

    console.log('═══════════════════════════════════════════════════════════\n');

    // Simulate Team completing task
    if (outcome.assignedTeamId) {
      console.log(`🔄 Simulating Primary Team ${outcome.assignedTeamId} completing task (Atomic Handoff)...`);
      await orchestrator.releaseTeamAndResolveQueue(outcome.assignedTeamId);
      
      const teamAfterRelease = await dataSource.getRepository(RescueTeamEntity).findOne({ where: { id: outcome.assignedTeamId } });
      console.log(`Primary Team status after release: ${teamAfterRelease?.status} (Active cases: ${teamAfterRelease?.activeCasesCount})`);
      
      if (outcome.secondTeamId) {
        const specialistAfterHandoff = await dataSource.getRepository(RescueTeamEntity).findOne({ where: { id: outcome.secondTeamId } });
        console.log(`Specialist Team status after handoff: ${specialistAfterHandoff?.status} (Active cases: ${specialistAfterHandoff?.activeCasesCount})`);
        
        const updatedSosAfterHandoff = await dataSource.getRepository(SosRequestEntity).findOne({ where: { id: dbSos.id } });
        console.log(`SOS Request assigned team after handoff: ${updatedSosAfterHandoff?.assignedTeamId}`);
        console.log(`SOS Request status after handoff: ${updatedSosAfterHandoff?.status}`);
      }
    }
  } catch (error) {
    console.error('❌ Simulation execution failed!', error);
  } finally {
    console.log('\n🧹 Cleaning up mock database records...');
    // Delete queue entries
    await dataSource.getRepository(DispatchQueueEntity).delete({ sosRequestId: dbSos.id });
    // Delete SOS
    await dataSource.getRepository(SosRequestEntity).delete({ id: dbSos.id });
    // Delete Teams
    for (const t of dbTeams) {
      await dataSource.getRepository(RescueTeamEntity).delete({ id: t.id });
    }
    console.log('🧹 Clean up completed.');
    
    await queryRunner.release();
    await appContext.close();
    process.exit(0);
  }
}

bootstrap();
