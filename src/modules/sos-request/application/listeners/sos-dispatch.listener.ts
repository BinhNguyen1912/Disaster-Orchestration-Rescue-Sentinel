import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { INTERNAL_EVENTS } from '@shared/common/constants/events.constant';
import type { ISosRequestRepository } from '../../domain/repositories/sos-request.repository.interface';
import type { IDispatchStrategy } from '../services/dispatch.strategy.interface';
import { DispatchOrchestratorService } from '../services/dispatch-orchestrator.service';
import { DispatchSocketService } from '../../../websocket/services/dispatch-socket.service';

@Injectable()
export class SosDispatchListener {
  private readonly logger = new Logger(SosDispatchListener.name);

  constructor(
    @Inject('ISosRequestRepository')
    private readonly sosRepo: ISosRequestRepository,
    @Inject('IDispatchStrategy')
    private readonly dispatchStrategy: IDispatchStrategy,
    private readonly dispatchOrchestrator: DispatchOrchestratorService,
    private readonly dispatchSocketService: DispatchSocketService,
  ) {}

  @OnEvent(INTERNAL_EVENTS.SOS_CREATED)
  async handleSosCreatedEvent(payload: { sosId: number }) {
    this.logger.log(
      `[Event-Driven] Nhận sự kiện sos.created cho SOS ID: ${payload.sosId}`,
    );
    try {
      const sos = await this.sosRepo.findById(payload.sosId);
      if (!sos) {
        this.logger.warn(`SOS request ${payload.sosId} not found`);
        return;
      }

      // 1. Chạy strategy tìm candidates
      const result = await this.dispatchStrategy.assignTeam(sos);
      if (
        !result ||
        !result.rankedCandidates ||
        result.rankedCandidates.length === 0
      ) {
        this.logger.warn(
          `No candidates found for SOS ${sos.id}. Running standard orchestrator dispatch (specialist pending).`,
        );
        await this.dispatchOrchestrator.dispatchWithRetry(sos);
        return;
      }

      // 2. Mời Top 3 đội trưởng cứu trợ
      const topCandidates = result.rankedCandidates.slice(0, 3);
      this.logger.log(
        `[Offer] Phát tin mời nhận việc cho Top ${topCandidates.length} đội.`,
      );

      const [lng, lat] = sos.location?.coordinates || [0, 0];

      for (const candidate of topCandidates) {
        this.dispatchSocketService.broadcastSosOffer(candidate.teamId, {
          sosId: sos.id,
          latitude: lat,
          longitude: lng,
          severity: sos.severity,
          requestType: sos.requestType,
          description: sos.description || '',
          timeoutSeconds: 30,
        });
      }

      // 3. Setup Timer 30 giây để kiểm tra và chuyển sang gán cưỡng bức nếu hết hạn
      setTimeout(() => {
        (async () => {
          try {
            const currentSos = await this.sosRepo.findById(sos.id);
            if (!currentSos) return;

            // Nếu sau 30s mà trạng thái vẫn chưa được gán đội (vẫn PENDING/PENDING_SPECIALIST và assignedTeamId là null)
            if (
              (currentSos.status === SosStatus.PENDING ||
                currentSos.status === SosStatus.PENDING_SPECIALIST) &&
              !currentSos.assignedTeamId
            ) {
              this.logger.log(
                `[Timeout] Hết 30 giây nhưng không có đội nào tiếp nhận SOS ${sos.id}. Kích hoạt gán cưỡng bức.`,
              );
              await this.dispatchOrchestrator.dispatchWithRetry(currentSos);
            }
          } catch (err) {
            this.logger.error(
              `Error in dispatch timeout callback for SOS ${sos.id}:`,
              err,
            );
          }
        })().catch((err) => {
          this.logger.error(
            `Unhandled error in dispatch timeout IIFE for SOS ${sos.id}:`,
            err,
          );
        });
      }, 30000); // 30s
    } catch (err) {
      this.logger.error(
        `Error handling sos.created event for SOS ID ${payload.sosId}:`,
        err,
      );
    }
  }
}
