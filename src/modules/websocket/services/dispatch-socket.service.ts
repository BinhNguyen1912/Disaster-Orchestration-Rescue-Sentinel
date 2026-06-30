import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { DISPATCH_EVENTS } from '../events/websocket.events';

/**
 * DispatchSocketService
 * Service trung gian để các module khác (SosRequestService, RescueTeamService...)
 * emit event mà không cần inject Gateway trực tiếp.
 *
 * Pattern: Gateway.afterInit() → setServer() → Service dùng server để emit
 */
@Injectable()
export class DispatchSocketService {
  private readonly logger = new Logger(DispatchSocketService.name);
  private server: Server;

  setServer(server: Server) {
    this.server = server;
    this.logger.log('✅ Dispatch socket server initialized');
  }

  // ── Admin province room ──────────────────────────────────────────────────

  /** Broadcast SOS mới cho toàn bộ admin của tỉnh */
  broadcastNewSos(provinceId: number, sos: any) {
    this.server
      ?.to(`province:${provinceId}`)
      .emit(DISPATCH_EVENTS.SOS_CREATED, sos);
    this.logger.log(
      `📡 [province:${provinceId}] ${DISPATCH_EVENTS.SOS_CREATED}`,
    );
  }

  /** Cập nhật trạng thái SOS cho admin tỉnh */
  broadcastSosStatusUpdate(
    provinceId: number,
    payload: {
      sosId: number;
      status: string;
      assignedTeamId?: number;
      distanceMeters?: number;
    },
  ) {
    this.server
      ?.to(`province:${provinceId}`)
      .emit(DISPATCH_EVENTS.SOS_STATUS_UPDATED, payload);
    this.logger.log(
      `📡 [province:${provinceId}] ${DISPATCH_EVENTS.SOS_STATUS_UPDATED} sosId=${payload.sosId}`,
    );
  }

  /** Alert admin khi không tìm được đội nào */
  alertNoTeamAvailable(provinceId: number, sosId: number) {
    this.server
      ?.to(`province:${provinceId}`)
      .emit(DISPATCH_EVENTS.SOS_NO_TEAM, {
        sosId,
        message: 'Không tìm được đội cứu hộ phù hợp — cần điều phối thủ công',
      });
    this.logger.warn(
      `⚠️ [province:${provinceId}] No team available for sos=${sosId}`,
    );
  }

  // ── Rescue team room ─────────────────────────────────────────────────────

  /** Notify rescue team được assign nhiệm vụ */
  notifyTeamAssigned(teamId: number, sos: any) {
    this.server?.to(`team:${teamId}`).emit(DISPATCH_EVENTS.TEAM_ASSIGNED, {
      sosId: sos.id,
      location: sos.location,
      severity: sos.severity,
      requestType: sos.requestType,
      description: sos.description,
    });
    this.logger.log(
      `📡 [team:${teamId}] ${DISPATCH_EVENTS.TEAM_ASSIGNED} sosId=${sos.id}`,
    );
  }

  /** Notify rescue team bị đổi nhiệm vụ */
  notifyTeamReassigned(teamId: number, newSos: any) {
    this.server
      ?.to(`team:${teamId}`)
      .emit(DISPATCH_EVENTS.TEAM_REASSIGNED, newSos);
    this.logger.log(`📡 [team:${teamId}] ${DISPATCH_EVENTS.TEAM_REASSIGNED}`);
  }

  /** Gửi lời mời nhận việc tới Đội trưởng (phòng teamId:leader) */
  broadcastSosOffer(teamId: number, offer: any) {
    this.server
      ?.to(`team:${teamId}:leader`)
      .emit(DISPATCH_EVENTS.SOS_OFFER, offer);
    this.logger.log(
      `📡 [team:${teamId}:leader] ${DISPATCH_EVENTS.SOS_OFFER} for sosId=${offer.sosId}`,
    );
  }

  /** Phát tin báo đã nhận việc thành công (phòng provinceId) */
  broadcastSosOfferClaimed(
    provinceId: number,
    payload: { sosId: number; assignedTeamId: number },
  ) {
    this.server
      ?.to(`province:${provinceId}`)
      .emit(DISPATCH_EVENTS.SOS_OFFER_CLAIMED, payload);
    this.logger.log(
      `📡 [province:${provinceId}] ${DISPATCH_EVENTS.SOS_OFFER_CLAIMED} for sosId=${payload.sosId} assigned to team=${payload.assignedTeamId}`,
    );
  }
}
