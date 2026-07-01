import { DistanceBasedDispatchStrategy } from '../src/modules/sos-request/application/services/distance-based-dispatch.strategy';
import { SosRequest } from '../src/modules/sos-request/domain/entities/sos-request.entity';
import { SosStatus } from '../src/shared/core/enums/sosStatus.enum';
import { TeamStatus } from '../src/shared/core/enums/teamStatus.enum';
import { TeamType } from '../src/shared/core/enums/teamType.enum';
import { SosRequestType } from '../src/shared/core/enums/sosType.enum';
import { Severity } from '../src/shared/core/enums/level.enum';
import { SosSource } from '../src/shared/core/enums/sosSource.enum';

async function run() {
  console.log('⚡ Running Auto-Dispatch v6 In-Memory Simulation...');

  // Mock settings
  const mockSettings = {
    'dispatch.radius_steps': '5000,10000,20000',
    'dispatch.score_acceptable_threshold': '0.5',
    'dispatch.distance_delta_threshold_meters': '3000',
    'dispatch.max_simultaneous_dual_dispatches': '4',
    'dispatch.weight_matrix': JSON.stringify({
      CRITICAL: { dist: 0.8, cases: 0.1, skill: 0.1 },
      HIGH: { dist: 0.6, cases: 0.2, skill: 0.2 },
      DEFAULT: { dist: 0.5, cases: 0.3, skill: 0.2 },
    }),
    'dispatch.skill_mapping': JSON.stringify({
      FIRE_FIGHTING: {
        PCCC: 0.0,
        TONG_HOP: 0.3,
        QUAN_SU: 0.5,
        DAN_PHONG: 0.8,
        Y_TE: 0.9,
        TINH_NGUYEN: 0.7,
      },
    }),
  };

  const mockSystemSettingService: any = {
    getAllSettings: async () => mockSettings,
  };

  // Mock teams
  const mockTeams = [
    {
      id: 10,
      name: 'Đội Dân Phòng A (Gần, Rảnh, Sai chuyên môn)',
      teamType: TeamType.DAN_PHONG,
      status: TeamStatus.AVAILABLE,
      activeCasesCount: 0,
      maxCapacity: 5,
      distance_meters: 1100, // 1.1km
    },
    {
      id: 20,
      name: 'Đội PCCC B (Hơi xa, Đang bận, Đúng chuyên môn)',
      teamType: TeamType.PCCC,
      status: TeamStatus.BUSY,
      activeCasesCount: 2,
      maxCapacity: 5,
      distance_meters: 2800, // 2.8km
    },
    {
      id: 30,
      name: 'Đội Y Tế C (Xa, Rảnh, Sai chuyên môn)',
      teamType: TeamType.Y_TE,
      status: TeamStatus.AVAILABLE,
      activeCasesCount: 0,
      maxCapacity: 5,
      distance_meters: 6200, // 6.2km
    },
  ];

  const mockTeamRepo: any = {
    findAvailableTeamsInRadius: async (lat: number, lng: number, radiusMeters: number, provinceId: number) => {
      // Return teams inside current scanning radius
      return mockTeams.filter(t => t.distance_meters <= radiusMeters);
    },
  };

  const strategy = new DistanceBasedDispatchStrategy(mockTeamRepo, mockSystemSettingService);

  // Mock SOS Request
  const sampleSos: SosRequest = {
    id: 99,
    provinceId: 1,
    adminUnitId: 1,
    requestType: SosRequestType.FIRE_FIGHTING,
    status: SosStatus.PENDING,
    severity: Severity.CRITICAL,
    trappedPeopleCount: 2,
    imageUrls: [],
    source: SosSource.WEB,
    requiresEquipment: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    location: {
      type: 'Point',
      coordinates: [106.6920, 10.7550],
    },
  };

  console.log('\n🚨 Mock SOS Request details:');
  console.log(` - Type: ${sampleSos.requestType}`);
  console.log(` - Severity: ${sampleSos.severity}`);
  console.log(` - Requires Equipment: ${sampleSos.requiresEquipment}`);
  console.log(` - Location coordinates: [${sampleSos.location.coordinates.join(', ')}]`);

  console.log('\n🚒 Mock candidate teams in pool:');
  mockTeams.forEach(t => {
    console.log(` - ID: ${t.id}, Name: ${t.name}, Distance: ${t.distance_meters}m, Status: ${t.status}, Active cases: ${t.activeCasesCount}`);
  });

  console.log('\n📢 Executing DistanceBasedDispatchStrategy...');
  
  const startSingle = process.hrtime.bigint();
  const result = await strategy.assignTeam(sampleSos);
  const endSingle = process.hrtime.bigint();
  const singleNs = endSingle - startSingle;
  const singleMs = Number(singleNs) / 1_000_000;

  console.log('\n════════════════════ STRATEGY RESULT ════════════════════');
  if (result) {
    console.log(`Best Team Selected ID: ${result.bestTeamId}`);
    console.log(`Best Score (Penalty): ${result.bestScore}`);
    console.log(`Pool Size Gathered: ${result.poolSize}`);
    console.log('\nRanked Candidates:');
    result.rankedCandidates.forEach((c, idx) => {
      console.log(` ${idx + 1}. Team ID: ${c.teamId}, Score: ${c.score.toFixed(4)}, Distance: ${c.distanceMeters}m, Type: ${c.teamType}, Active Cases: ${c.activeCasesCount}`);
    });
  } else {
    console.log('No teams assigned.');
  }
  console.log('═════════════════════════════════════════════════════════\n');

  console.log('⏱️ Performance Benchmark:');
  console.log(`- Single run duration: ${singleMs.toFixed(4)} ms (${singleNs.toLocaleString()} ns)`);

  const iterations = 10000;
  console.log(`\n🔄 Running benchmark with ${iterations.toLocaleString()} iterations...`);
  const startBench = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    await strategy.assignTeam(sampleSos);
  }
  const endBench = process.hrtime.bigint();
  const totalNs = endBench - startBench;
  const avgNs = totalNs / BigInt(iterations);
  const totalMs = Number(totalNs) / 1_000_000;
  const avgMs = Number(avgNs) / 1_000_000;
  console.log(`- Total Time for ${iterations.toLocaleString()} runs: ${totalMs.toFixed(2)} ms`);
  console.log(`- Average Time per Execution: ${avgMs.toFixed(4)} ms (${avgNs.toLocaleString()} ns)`);
  console.log('═════════════════════════════════════════════════════════\n');
}

run();
