import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SystemSettingService } from '../../../system-setting/application/services/system-setting.service';
import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { DISPATCH_KEYS } from '@shared/common/constants/dispatch.constant';

@Injectable()
export class DispatchConfigValidatorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DispatchConfigValidatorService.name);

  constructor(private readonly systemSettingService: SystemSettingService) {}

  async onApplicationBootstrap() {
    this.logger.log('🚀 Starting Auto-Dispatch configuration validation...');
    try {
      const settings = await this.systemSettingService.getAllSettings();

      // 1. Validate dispatch.skill_mapping
      const skillMappingRaw = settings[DISPATCH_KEYS.SKILL_MAPPING];
      if (skillMappingRaw) {
        try {
          const mapping = JSON.parse(skillMappingRaw);
          if (typeof mapping !== 'object' || mapping === null) {
            this.logger.error(
              `❌ ${DISPATCH_KEYS.SKILL_MAPPING} must be a JSON object.`,
            );
          } else {
            // Check if all SosRequestType values exist in mapping keys
            for (const reqType of Object.values(SosRequestType)) {
              const reqMap = mapping[reqType];
              if (!reqMap) {
                this.logger.warn(
                  `⚠️ Missing skill mapping key for SOS Request Type: "${reqType}"`,
                );
              } else {
                // Check if all TeamType values exist in mapping values
                for (const teamType of Object.values(TeamType)) {
                  if (reqMap[teamType] === undefined) {
                    this.logger.warn(
                      `⚠️ Missing skill mismatch value for Team Type: "${teamType}" under SOS Request Type: "${reqType}"`,
                    );
                  } else {
                    const val = reqMap[teamType];
                    if (typeof val !== 'number' || val < 0 || val > 1) {
                      this.logger.error(
                        `❌ Skill mismatch value must be a number between 0.0 and 1.0. Found: ${val} for "${teamType}" under "${reqType}"`,
                      );
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          this.logger.error(
            `❌ Failed to parse ${DISPATCH_KEYS.SKILL_MAPPING} JSON: ${e.message}`,
          );
        }
      } else {
        this.logger.log(
          `ℹ️ ${DISPATCH_KEYS.SKILL_MAPPING} not found in system settings, using default mappings.`,
        );
      }

      // 2. Validate dispatch.distance_delta_threshold_meters
      const deltaRaw = settings[DISPATCH_KEYS.DISTANCE_DELTA_THRESHOLD_METERS];
      if (deltaRaw) {
        const delta = parseFloat(deltaRaw);
        if (isNaN(delta) || delta <= 0) {
          this.logger.error(
            `❌ ${DISPATCH_KEYS.DISTANCE_DELTA_THRESHOLD_METERS} must be a positive number. Found: "${deltaRaw}"`,
          );
        }
      }

      // 3. Validate dispatch.weight_matrix
      const weightMatrixRaw = settings[DISPATCH_KEYS.WEIGHT_MATRIX];
      if (weightMatrixRaw) {
        try {
          const matrix = JSON.parse(weightMatrixRaw);
          if (typeof matrix !== 'object' || matrix === null) {
            this.logger.error(
              `❌ ${DISPATCH_KEYS.WEIGHT_MATRIX} must be a JSON object.`,
            );
          } else {
            for (const [severity, weights] of Object.entries(matrix)) {
              if (typeof weights !== 'object' || weights === null) {
                this.logger.error(
                  `❌ Weight matrix value for "${severity}" must be a JSON object.`,
                );
                continue;
              }
              const w = weights as {
                dist?: number;
                cases?: number;
                skill?: number;
              };
              const sum = (w.dist ?? 0) + (w.cases ?? 0) + (w.skill ?? 0);
              if (Math.abs(sum - 1.0) > 1e-5) {
                this.logger.error(
                  `❌ Total weights for severity "${severity}" must sum to exactly 1.0. Found: ${sum} (dist: ${w.dist}, cases: ${w.cases}, skill: ${w.skill})`,
                );
              }
            }
          }
        } catch (e) {
          this.logger.error(
            `❌ Failed to parse ${DISPATCH_KEYS.WEIGHT_MATRIX} JSON: ${e.message}`,
          );
        }
      }

      this.logger.log('✅ Auto-Dispatch configuration validation completed.');
    } catch (e) {
      this.logger.error(
        `❌ An error occurred during Auto-Dispatch configuration validation: ${e.message}`,
      );
    }
  }
}
