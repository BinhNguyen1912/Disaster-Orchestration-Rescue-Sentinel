import {
  Injectable,
  Inject,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { DispatchQueueEntity } from '@infrastructure/database/entities/dispatch-queue.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { DispatchOrchestratorService } from './dispatch-orchestrator.service';
import type { IRescueTeamRepository } from '../../../rescue-team/domain/repositories/rescue-team.repository.interface';

@Injectable()
export class DispatchRetryService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(DispatchRetryService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(SosRequestEntity)
    private readonly sosRequestRepo: Repository<SosRequestEntity>,
    @InjectRepository(DispatchQueueEntity)
    private readonly dispatchQueueRepo: Repository<DispatchQueueEntity>,
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
    private readonly dispatchOrchestrator: DispatchOrchestratorService,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Starting Dispatch Auto-Retry Background Worker...');
    // Runs every 15 seconds to check and retry dispatches
    this.intervalId = setInterval(() => {
      this.processPendingDispatches().catch((err) => {
        this.logger.error(
          'Error in processPendingDispatches interval execution:',
          err,
        );
      });
    }, 15000);
  }

  onApplicationShutdown() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async processPendingDispatches() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find all SOS requests in PENDING or PENDING_SPECIALIST status that have no assigned team
      const unassignedSos = await this.sosRequestRepo.find({
        where: [
          { status: SosStatus.PENDING, assignedTeamId: IsNull() },
          { status: SosStatus.PENDING_SPECIALIST, assignedTeamId: IsNull() },
        ],
        order: { createdAt: 'ASC' },
      });

      if (unassignedSos.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.logger.log(
        `Found ${unassignedSos.length} unassigned SOS request(s). Checking for free teams to attempt auto-dispatch retry...`,
      );

      for (const sos of unassignedSos) {
        // Query teams for this province using IRescueTeamRepository
        const teamsResult = await this.teamRepo.findAll(
          { provinceId: sos.provinceId },
          { page: 1, limit: 100 },
        );

        // Filter available or standby teams that have a leader
        const availableTeamsCount = teamsResult.items.filter(
          (t) =>
            (t.status === TeamStatus.AVAILABLE ||
              t.status === TeamStatus.STANDBY) &&
            (t.leaderId !== null && t.leaderId !== undefined ||
              t.leaderCitizenName !== null && t.leaderCitizenName !== undefined),
        ).length;

        if (availableTeamsCount > 0) {
          this.logger.log(
            `Retrying auto-dispatch for SOS request ${sos.id} (Province ${sos.provinceId}) - ${availableTeamsCount} team(s) currently free/standby.`,
          );

          try {
            // Delete any existing queue entries for this request before re-triggering dispatch
            // to prevent duplicates or orphaned records.
            await this.dispatchQueueRepo.delete({ sosRequestId: sos.id });

            // Trigger orchestrator auto-dispatch scoring pipeline
            await this.dispatchOrchestrator.dispatch(sos);
          } catch (dispatchErr) {
            this.logger.error(
              `Error occurred while retrying auto-dispatch for SOS request ${sos.id}:`,
              dispatchErr,
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(
        'Failed to run background dispatch auto-retry worker loop:',
        err,
      );
    } finally {
      this.isProcessing = false;
    }
  }
}
