import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDispatchStrategy } from './dispatch.strategy.interface';
import { SosRequest } from '../../domain/entities/sos-request.entity';
import type { IRescueTeamRepository } from '../../../rescue-team/domain/repositories/rescue-team.repository.interface';
import { SystemSettingService } from '../../../system-setting/application/services/system-setting.service';

@Injectable()
export class DistanceBasedDispatchStrategy implements IDispatchStrategy {
  private readonly logger = new Logger(DistanceBasedDispatchStrategy.name);

  constructor(
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    private readonly systemSettingService: SystemSettingService,
  ) {}

  async assignTeam(sosRequest: SosRequest): Promise<number | null> {
    const { location, provinceId } = sosRequest;

    if (!location || !location.coordinates) {
      this.logger.warn(
        `SOS request ${sosRequest.id} has no coordinates, cannot auto dispatch.`,
      );
      return null;
    }

    const [lng, lat] = location.coordinates;

    // 1. Read configurations from database
    const settings = await this.systemSettingService.getAllSettings();

    const radiusSteps = (
      settings['dispatch.radius_steps'] || '5000,10000,20000,40000,50000'
    )
      .split(',')
      .map((r) => parseFloat(r.trim()))
      .filter((r) => !isNaN(r) && r > 0);

    const wDist = parseFloat(settings['dispatch.weight_distance'] || '0.5');
    const wCases = parseFloat(
      settings['dispatch.weight_active_cases'] || '0.3',
    );
    const wSkill = parseFloat(
      settings['dispatch.weight_skill_mismatch'] || '0.2',
    );

    let skillMapping: Record<string, string[]> = {};
    try {
      if (settings['dispatch.skill_mapping']) {
        skillMapping = JSON.parse(settings['dispatch.skill_mapping']);
      } else {
        skillMapping = {
          FLOOD: ['DAN_PHONG', 'QUAN_SU', 'TONG_HOP'],
          FIRE_FIGHTING: ['PCCC', 'TONG_HOP'],
          TRAFFIC_ACCIDENT: ['Y_TE', 'PCCC', 'TONG_HOP'],
          MEDICAL_EMERGENCY: ['Y_TE', 'TONG_HOP'],
          NATURAL_DISASTER: ['QUAN_SU', 'TONG_HOP'],
          OTHER: [
            'DAN_PHONG',
            'PCCC',
            'QUAN_SU',
            'TINH_NGUYEN',
            'Y_TE',
            'TONG_HOP',
          ],
        };
      }
    } catch (e) {
      skillMapping = {
        FLOOD: ['DAN_PHONG', 'QUAN_SU', 'TONG_HOP'],
        FIRE_FIGHTING: ['PCCC', 'TONG_HOP'],
        TRAFFIC_ACCIDENT: ['Y_TE', 'PCCC', 'TONG_HOP'],
        MEDICAL_EMERGENCY: ['Y_TE', 'TONG_HOP'],
        NATURAL_DISASTER: ['QUAN_SU', 'TONG_HOP'],
        OTHER: [
          'DAN_PHONG',
          'PCCC',
          'QUAN_SU',
          'TINH_NGUYEN',
          'Y_TE',
          'TONG_HOP',
        ],
      };
    }

    this.logger.log(
      `Starting Expanding Radius Auto Dispatch for SOS ${sosRequest.id} in province ${provinceId}. ` +
        `Steps: ${radiusSteps.join(', ')} meters. Weights: Dist=${wDist}, Cases=${wCases}, Skill=${wSkill}`,
    );

    // 2. Loop through each radius step
    for (const radiusMeters of radiusSteps) {
      this.logger.log(`Scanning radius: ${radiusMeters}m...`);
      const teams = await this.teamRepo.findAvailableTeamsInRadius(
        lat,
        lng,
        radiusMeters,
        provinceId,
      );

      if (teams && teams.length > 0) {
        this.logger.log(
          `Found ${teams.length} available teams in ${radiusMeters}m. Calculating scores...`,
        );

        // Compute score for each team and sort
        const teamScores = teams.map((team) => {
          const distanceNorm =
            radiusMeters > 0 ? team.distance_meters / radiusMeters : 1;
          const activeCasesNorm = Math.min(team.activeCasesCount, 5) / 5;

          const allowedTypes = skillMapping[sosRequest.requestType] || [];
          const isMatching = allowedTypes.includes(team.teamType || '');
          const skillMismatchNorm = isMatching ? 0 : 1;

          const score =
            distanceNorm * wDist +
            activeCasesNorm * wCases +
            skillMismatchNorm * wSkill;

          this.logger.debug(
            `Team ${team.name} (ID: ${team.id}, Type: ${team.teamType}): ` +
              `Dist=${team.distance_meters.toFixed(1)}m (Norm=${distanceNorm.toFixed(2)}), ` +
              `Cases=${team.activeCasesCount} (Norm=${activeCasesNorm.toFixed(2)}), ` +
              `Mismatch=${skillMismatchNorm} (Norm=${skillMismatchNorm}). ` +
              `Total Score: ${score.toFixed(3)}`,
          );

          return {
            teamId: team.id,
            score,
            team,
          };
        });

        // Sort by score ascending (lowest penalty score first)
        teamScores.sort((a, b) => a.score - b.score);

        const bestTeam = teamScores[0];
        this.logger.log(
          `Auto Dispatch selected Team ${bestTeam.team.name} (ID: ${bestTeam.teamId}) ` +
            `with best score: ${bestTeam.score.toFixed(3)} (Radius used: ${radiusMeters}m)`,
        );

        return bestTeam.teamId;
      }
    }

    this.logger.warn(
      `No available rescue team found in any radius up to ${radiusSteps[radiusSteps.length - 1]}m.`,
    );
    return null;
  }
}
