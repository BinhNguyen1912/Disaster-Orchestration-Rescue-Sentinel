"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const typeorm_1 = require("typeorm");
const sos_request_entity_1 = require("../src/infrastructure/database/entities/sos-request.entity");
const rescue_team_entity_1 = require("../src/infrastructure/database/entities/rescue-team.entity");
const dispatch_queue_entity_1 = require("../src/infrastructure/database/entities/dispatch-queue.entity");
const dispatch_orchestrator_service_1 = require("../src/modules/sos-request/application/services/dispatch-orchestrator.service");
const system_setting_service_1 = require("../src/modules/system-setting/application/services/system-setting.service");
const sosStatus_enum_1 = require("../src/shared/core/enums/sosStatus.enum");
const teamStatus_enum_1 = require("../src/shared/core/enums/teamStatus.enum");
const teamType_enum_1 = require("../src/shared/core/enums/teamType.enum");
const sosType_enum_1 = require("../src/shared/core/enums/sosType.enum");
const level_enum_1 = require("../src/shared/core/enums/level.enum");
const sosSource_enum_1 = require("../src/shared/core/enums/sosSource.enum");
async function bootstrap() {
    console.log('⚡ Bootstrapping NestJS context for Auto-Dispatch v6 simulation...');
    const appContext = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const orchestrator = appContext.get(dispatch_orchestrator_service_1.DispatchOrchestratorService);
    const systemSetting = appContext.get(system_setting_service_1.SystemSettingService);
    const dataSource = appContext.get(typeorm_1.DataSource);
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    console.log('📝 Configuring temporary settings in DB...');
    await systemSetting.updateSettings({
        'dispatch.radius_steps': '5000,10000,20000',
        'dispatch.score_acceptable_threshold': '0.5',
        'dispatch.distance_delta_threshold_meters': '3000',
        'dispatch.max_simultaneous_dual_dispatches': '4',
    });
    console.log('🚒 Creating mock rescue teams...');
    const teams = [
        {
            provinceId: 1,
            adminUnitId: 1,
            name: 'Đội Dân Phòng A (Gần, Rảnh, Sai chuyên môn)',
            teamType: teamType_enum_1.TeamType.DAN_PHONG,
            status: teamStatus_enum_1.TeamStatus.AVAILABLE,
            activeCasesCount: 0,
            maxCapacity: 5,
            currentLocation: { type: 'Point', coordinates: [106.7000, 10.7580] },
            baseLocation: { type: 'Point', coordinates: [106.7000, 10.7580] },
            totalMissions: 10,
        },
        {
            provinceId: 1,
            adminUnitId: 1,
            name: 'Đội PCCC B (Hơi xa, Đang bận, Đúng chuyên môn)',
            teamType: teamType_enum_1.TeamType.PCCC,
            status: teamStatus_enum_1.TeamStatus.BUSY,
            activeCasesCount: 2,
            maxCapacity: 5,
            currentLocation: { type: 'Point', coordinates: [106.7150, 10.7650] },
            baseLocation: { type: 'Point', coordinates: [106.7150, 10.7650] },
            totalMissions: 25,
        },
        {
            provinceId: 1,
            adminUnitId: 1,
            name: 'Đội Y Tế C (Xa, Rảnh, Sai chuyên môn)',
            teamType: teamType_enum_1.TeamType.Y_TE,
            status: teamStatus_enum_1.TeamStatus.AVAILABLE,
            activeCasesCount: 0,
            maxCapacity: 5,
            currentLocation: { type: 'Point', coordinates: [106.7500, 10.7800] },
            baseLocation: { type: 'Point', coordinates: [106.7500, 10.7800] },
            totalMissions: 5,
        }
    ];
    const dbTeams = [];
    for (const t of teams) {
        const created = dataSource.getRepository(rescue_team_entity_1.RescueTeamEntity).create(t);
        dbTeams.push(await dataSource.getRepository(rescue_team_entity_1.RescueTeamEntity).save(created));
    }
    console.log(`✅ Mock teams created with IDs: ${dbTeams.map(t => `${t.name} (ID: ${t.id})`).join(', ')}`);
    console.log('🚨 Creating mock SOS request (Hỏa hoạn FIRE_FIGHTING, CRITICAL, Cần thiết bị chuyên dụng)...');
    const sosRequestData = {
        provinceId: 1,
        adminUnitId: 1,
        requestType: sosType_enum_1.SosRequestType.FIRE_FIGHTING,
        status: sosStatus_enum_1.SosStatus.PENDING,
        severity: level_enum_1.Severity.CRITICAL,
        trappedPeopleCount: 2,
        imageUrls: [],
        source: sosSource_enum_1.SosSource.WEB,
        requiresEquipment: true,
        location: { type: 'Point', coordinates: [106.6920, 10.7550] },
    };
    const createdSos = dataSource.getRepository(sos_request_entity_1.SosRequestEntity).create(sosRequestData);
    const dbSos = await dataSource.getRepository(sos_request_entity_1.SosRequestEntity).save(createdSos);
    console.log(`✅ Mock SOS request created with ID: ${dbSos.id}`);
    console.log('\n🚀 Triggering DispatchOrchestrator.dispatch()...');
    try {
        const outcome = await orchestrator.dispatch(dbSos);
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
        const queues = await dataSource.getRepository(dispatch_queue_entity_1.DispatchQueueEntity).find({ where: { sosRequestId: dbSos.id } });
        console.log(`Active Queue Entries for this SOS: ${queues.length}`);
        queues.forEach(q => {
            console.log(` - Queue ID: ${q.id}, Team ID: ${q.teamId}, Is Dual Dispatch: ${q.isDualDispatch}, Priority Score: ${q.priorityScore}`);
        });
        const updatedSos = await dataSource.getRepository(sos_request_entity_1.SosRequestEntity).findOne({ where: { id: dbSos.id } });
        console.log(`Updated SOS Request Status: ${updatedSos?.status}`);
        console.log(`Updated SOS Request Assigned Team: ${updatedSos?.assignedTeamId}`);
        console.log('═══════════════════════════════════════════════════════════\n');
        if (outcome.assignedTeamId) {
            console.log(`🔄 Simulating Primary Team ${outcome.assignedTeamId} completing task (Atomic Handoff)...`);
            await orchestrator.releaseTeamAndResolveQueue(outcome.assignedTeamId);
            const teamAfterRelease = await dataSource.getRepository(rescue_team_entity_1.RescueTeamEntity).findOne({ where: { id: outcome.assignedTeamId } });
            console.log(`Primary Team status after release: ${teamAfterRelease?.status} (Active cases: ${teamAfterRelease?.activeCasesCount})`);
            if (outcome.secondTeamId) {
                const specialistAfterHandoff = await dataSource.getRepository(rescue_team_entity_1.RescueTeamEntity).findOne({ where: { id: outcome.secondTeamId } });
                console.log(`Specialist Team status after handoff: ${specialistAfterHandoff?.status} (Active cases: ${specialistAfterHandoff?.activeCasesCount})`);
                const updatedSosAfterHandoff = await dataSource.getRepository(sos_request_entity_1.SosRequestEntity).findOne({ where: { id: dbSos.id } });
                console.log(`SOS Request assigned team after handoff: ${updatedSosAfterHandoff?.assignedTeamId}`);
                console.log(`SOS Request status after handoff: ${updatedSosAfterHandoff?.status}`);
            }
        }
    }
    catch (error) {
        console.error('❌ Simulation execution failed!', error);
    }
    finally {
        console.log('\n🧹 Cleaning up mock database records...');
        await dataSource.getRepository(dispatch_queue_entity_1.DispatchQueueEntity).delete({ sosRequestId: dbSos.id });
        await dataSource.getRepository(sos_request_entity_1.SosRequestEntity).delete({ id: dbSos.id });
        for (const t of dbTeams) {
            await dataSource.getRepository(rescue_team_entity_1.RescueTeamEntity).delete({ id: t.id });
        }
        console.log('🧹 Clean up completed.');
        await queryRunner.release();
        await appContext.close();
        process.exit(0);
    }
}
bootstrap();
//# sourceMappingURL=test-dispatch.js.map