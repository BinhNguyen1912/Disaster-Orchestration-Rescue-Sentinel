import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IDispatchStrategy,
  DispatchResult,
  RankedCandidate,
} from './dispatch.strategy.interface';
import { SosRequest } from '../../domain/entities/sos-request.entity';
import type { IRescueTeamRepository } from '../../../rescue-team/domain/repositories/rescue-team.repository.interface';
import { SystemSettingService } from '../../../system-setting/application/services/system-setting.service';
import {
  DISPATCH_KEYS,
  DISPATCH_DEFAULTS,
} from '@shared/common/constants/dispatch.constant';
import { RawCandidate } from '../interfaces/rawCandidate.interface';
import { ResolvedWeights } from '../interfaces/resolveWeight.interface';

@Injectable()
export class DistanceBasedDispatchStrategy implements IDispatchStrategy {
  private readonly logger = new Logger(DistanceBasedDispatchStrategy.name);

  constructor(
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    private readonly systemSettingService: SystemSettingService,
  ) {}

  async assignTeam(sosRequest: SosRequest): Promise<DispatchResult | null> {
    const { location, provinceId } = sosRequest;

    if (!location || !location.coordinates) {
      this.logger.warn(
        `SOS request ${sosRequest.id} has no coordinates, cannot auto dispatch.`,
      );
      return null;
    }

    const [lng, lat] = location.coordinates;

    // ── 1. Load config từ system_setting ─────────────────────────────────────
    const settings = await this.systemSettingService.getAllSettings();

    const radiusSteps = this.parseRadiusSteps(settings);
    const weights = this.resolveWeights(settings, sosRequest.severity);
    const skillMapping = this.parseSkillMapping(settings);
    const scoreThreshold = parseFloat(
      settings[DISPATCH_KEYS.SCORE_ACCEPTABLE_THRESHOLD] ??
        String(DISPATCH_DEFAULTS.SCORE_ACCEPTABLE_THRESHOLD),
    );
    const deltaThreshold = parseFloat(
      settings[DISPATCH_KEYS.DISTANCE_DELTA_THRESHOLD_METERS] ??
        String(DISPATCH_DEFAULTS.DISTANCE_DELTA_THRESHOLD_METERS),
    );

    this.logger.log(
      `[v6] Starting Two-Phase Dispatch for SOS ${sosRequest.id} in province ${provinceId}. ` +
        `Steps: [${radiusSteps.join(', ')}]m. Weights: Dist=${weights.dist}, Cases=${weights.cases}, Skill=${weights.skill}`,
    );

    // ── PHA 1: GOM CANDIDATE POOL ────────────────────────────────────────────
    const pool = await this.gatherCandidatePool(
      lat,
      lng,
      provinceId,
      radiusSteps,
      weights,
      skillMapping,
      sosRequest.requestType,
      scoreThreshold,
    );

    if (pool.size === 0) {
      this.logger.warn(
        `[v6] No candidates found in any radius up to ${radiusSteps[radiusSteps.length - 1]}m.`,
      );
      return null;
    }

    // ── PHA 2: CHUẨN HÓA & TÍNH SCORE ĐỒNG BỘ ──────────────────────────────
    const candidates = Array.from(pool.values());
    const ranked = this.scoreAndRank(
      candidates,
      weights,
      skillMapping,
      sosRequest.requestType,
      deltaThreshold,
    );

    const best = ranked[0];
    this.logger.log(
      `[v6] Selected Team ${best.teamId} (type: ${best.teamType}) ` +
        `with best score: ${best.score.toFixed(4)} (pool size: ${ranked.length})`,
    );

    return {
      bestTeamId: best.teamId,
      bestScore: best.score,
      rankedCandidates: ranked,
      poolSize: ranked.length,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHA 1: GOM CANDIDATE POOL
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Loop qua từng bước bán kính, tích lũy ứng viên vào Map (deduplicate theo teamId).
   * Dùng Heuristic Stopping Score để quyết định dừng sớm.
   */
  private async gatherCandidatePool(
    lat: number,
    lng: number,
    provinceId: number,
    radiusSteps: number[],
    weights: ResolvedWeights,
    skillMapping: Record<string, Record<string, number>>,
    requestType: string,
    scoreThreshold: number,
  ): Promise<Map<number, RawCandidate>> {
    const pool = new Map<number, RawCandidate>();

    for (const radiusMeters of radiusSteps) {
      this.logger.log(`[Pha 1] Scanning radius: ${radiusMeters}m...`);

      const teams = await this.teamRepo.findAvailableTeamsInRadius(
        lat,
        lng,
        radiusMeters,
        provinceId,
      );

      if (!teams || teams.length === 0) {
        this.logger.log(`[Pha 1] No teams in ${radiusMeters}m, expanding...`);
        continue;
      }

      // Tích lũy vào pool (không ghi đè nếu đội đã có — khoảng cách nhỏ nhất giữ nguyên)
      for (const team of teams) {
        if (!pool.has(team.id)) {
          pool.set(team.id, {
            teamId: team.id,
            teamType: team.teamType || '',
            distanceMeters: team.distance_meters,
            activeCasesCount: team.activeCasesCount || 0,
            maxCapacity: team.maxCapacity || 5,
            name: team.name,
          });
        }
      }

      this.logger.log(
        `[Pha 1] Pool size: ${pool.size} after ${radiusMeters}m scan.`,
      );

      // Heuristic Stopping Score — kiểm tra xem có nên mở rộng tiếp không
      const bestHeuristic = this.computeBestHeuristicScore(
        pool,
        radiusMeters,
        weights,
        skillMapping,
        requestType,
      );

      this.logger.log(
        `[Pha 1] Best heuristic score: ${bestHeuristic.toFixed(4)} (threshold: ${scoreThreshold})`,
      );

      if (bestHeuristic <= scoreThreshold) {
        this.logger.log(
          `[Pha 1] Acceptable score found. Stopping early at ${radiusMeters}m.`,
        );
        break;
      }
    }

    return pool;
  }

  /**
   * Tính điểm sơ bộ (Heuristic) — CHỈ dùng để quyết định dừng sớm,
   * KHÔNG dùng để xếp hạng cuối cùng.
   * Mẫu số = bán kính vòng hiện tại → thứ tự tương đối trong cùng vòng được bảo toàn.
   */
  private computeBestHeuristicScore(
    pool: Map<number, RawCandidate>,
    currentRadius: number,
    weights: ResolvedWeights,
    skillMapping: Record<string, Record<string, number>>,
    requestType: string,
  ): number {
    let bestScore = Infinity;

    for (const candidate of pool.values()) {
      const distNorm =
        currentRadius > 0 ? candidate.distanceMeters / currentRadius : 1;
      const casesNorm =
        Math.min(candidate.activeCasesCount, candidate.maxCapacity) /
        candidate.maxCapacity;
      const skillMismatch = this.getSkillMismatch(
        skillMapping,
        requestType,
        candidate.teamType,
      );

      const score =
        distNorm * weights.dist +
        casesNorm * weights.cases +
        skillMismatch * weights.skill;

      if (score < bestScore) {
        bestScore = score;
      }
    }

    return bestScore;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHA 2: HYBRID LOCAL MIN-MAX + SCORING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Chuẩn hóa khoảng cách bằng Hybrid Local Min-Max, sau đó tính Score cuối cùng.
   * Đây là điểm duy nhất xếp hạng chính thức.
   */
  private scoreAndRank(
    candidates: RawCandidate[],
    weights: ResolvedWeights,
    skillMapping: Record<string, Record<string, number>>,
    requestType: string,
    deltaThreshold: number,
  ): RankedCandidate[] {
    // Trường hợp đặc biệt: pool chỉ có 1 đội
    if (candidates.length === 1) {
      const c = candidates[0];
      const skillMismatch = this.getSkillMismatch(
        skillMapping,
        requestType,
        c.teamType,
      );
      const casesNorm =
        Math.min(c.activeCasesCount, c.maxCapacity) / c.maxCapacity;

      // distance_norm = 0.0 khi pool = 1 (tránh chia cho 0)
      const score =
        0.0 * weights.dist +
        casesNorm * weights.cases +
        skillMismatch * weights.skill;

      this.logger.debug(
        `[Pha 2] Single team ${c.name} (ID: ${c.teamId}): Score=${score.toFixed(4)} (dist_norm=0.00, pool=1)`,
      );

      return [
        {
          teamId: c.teamId,
          score,
          distanceMeters: c.distanceMeters,
          teamType: c.teamType,
          activeCasesCount: c.activeCasesCount,
        },
      ];
    }

    // Hybrid Local Min-Max
    const distances = candidates.map((c) => c.distanceMeters);
    const minDistance = Math.min(...distances);
    const maxDistance = Math.max(...distances);
    const rawDelta = maxDistance - minDistance;
    const denominator = Math.max(rawDelta, deltaThreshold);

    this.logger.debug(
      `[Pha 2] Distance range: [${minDistance.toFixed(0)}, ${maxDistance.toFixed(0)}]m, ` +
        `delta=${rawDelta.toFixed(0)}m, denominator=${denominator.toFixed(0)}m`,
    );

    const ranked: RankedCandidate[] = candidates.map((c) => {
      const distNorm = (c.distanceMeters - minDistance) / denominator;
      const casesNorm =
        Math.min(c.activeCasesCount, c.maxCapacity) / c.maxCapacity;
      const skillMismatch = this.getSkillMismatch(
        skillMapping,
        requestType,
        c.teamType,
      );

      const score =
        distNorm * weights.dist +
        casesNorm * weights.cases +
        skillMismatch * weights.skill;

      this.logger.debug(
        `[Pha 2] Team ${c.name} (ID: ${c.teamId}, Type: ${c.teamType}): ` +
          `Dist=${c.distanceMeters.toFixed(1)}m (Norm=${distNorm.toFixed(3)}), ` +
          `Cases=${c.activeCasesCount} (Norm=${casesNorm.toFixed(3)}), ` +
          `Skill=${skillMismatch.toFixed(2)}. Score: ${score.toFixed(4)}`,
      );

      return {
        teamId: c.teamId,
        score,
        distanceMeters: c.distanceMeters,
        teamType: c.teamType,
        activeCasesCount: c.activeCasesCount,
      };
    });

    // Sắp xếp: score thấp = tốt nhất
    ranked.sort((a, b) => a.score - b.score);

    return ranked;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS: Config Parsing
  // ══════════════════════════════════════════════════════════════════════════

  /** Parse radius_steps từ chuỗi CSV trong system_setting */
  private parseRadiusSteps(settings: Record<string, string>): number[] {
    const raw = settings[DISPATCH_KEYS.RADIUS_STEPS];
    if (!raw) return [...DISPATCH_DEFAULTS.RADIUS_STEPS];

    const parsed = raw
      .split(',')
      .map((r) => parseFloat(r.trim()))
      .filter((r) => !isNaN(r) && r > 0);

    return parsed.length > 0 ? parsed : [...DISPATCH_DEFAULTS.RADIUS_STEPS];
  }

  /** Resolve trọng số theo severity từ weight_matrix JSON */
  private resolveWeights(
    settings: Record<string, string>,
    severity: string,
  ): ResolvedWeights {
    try {
      const matrixRaw = settings[DISPATCH_KEYS.WEIGHT_MATRIX];
      if (matrixRaw) {
        const matrix: Record<
          string,
          { dist: number; cases: number; skill: number }
        > = JSON.parse(matrixRaw);

        const weights = matrix[severity] || matrix['DEFAULT'];
        if (weights && weights.dist !== undefined) {
          return weights;
        }
      }
    } catch (e) {
      this.logger.warn(
        `[Config] Failed to parse ${DISPATCH_KEYS.WEIGHT_MATRIX}, using fallback weights.`,
      );
    }

    // Fallback: đọc từ key riêng lẻ hoặc defaults
    return {
      dist: parseFloat(
        settings[DISPATCH_KEYS.WEIGHT_DISTANCE] ??
          String(DISPATCH_DEFAULTS.WEIGHTS.dist),
      ),
      cases: parseFloat(
        settings[DISPATCH_KEYS.WEIGHT_ACTIVE_CASES] ??
          String(DISPATCH_DEFAULTS.WEIGHTS.cases),
      ),
      skill: parseFloat(
        settings[DISPATCH_KEYS.WEIGHT_SKILL_MISMATCH] ??
          String(DISPATCH_DEFAULTS.WEIGHTS.skill),
      ),
    };
  }

  /** Parse skill_mapping JSON — trả về Record<SosType, Record<TeamType, mismatch>> */
  private parseSkillMapping(
    settings: Record<string, string>,
  ): Record<string, Record<string, number>> {
    try {
      const raw = settings[DISPATCH_KEYS.SKILL_MAPPING];
      if (raw) {
        const parsed = JSON.parse(raw);
        // Validate structure
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      }
    } catch (e) {
      this.logger.warn(
        `[Config] Failed to parse ${DISPATCH_KEYS.SKILL_MAPPING}, using defaults.`,
      );
    }

    return { ...DISPATCH_DEFAULTS.SKILL_MAPPING };
  }

  /** Lấy mức lệch chuyên môn cho cặp (requestType, teamType) */
  private getSkillMismatch(
    skillMapping: Record<string, Record<string, number>>,
    requestType: string,
    teamType: string,
  ): number {
    const mapping = skillMapping[requestType];
    if (!mapping) return 1.0; // Không có mapping → lệch hoàn toàn

    const mismatch = mapping[teamType];
    if (mismatch === undefined) return 1.0; // Team type không có trong mapping

    return mismatch;
  }
}
