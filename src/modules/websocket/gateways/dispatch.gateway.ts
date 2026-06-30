import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DispatchSocketService } from '../services/dispatch-socket.service';
import { DISPATCH_EVENTS } from '../events/websocket.events';
import { DataSource } from 'typeorm';
import { SosRequestEntity } from '@infrastructure/database/entities/sos-request.entity';
import { RescueTeamEntity } from '@infrastructure/database/entities/rescue-team.entity';
import {
  SosStatusHistoryEntity,
  SosHistoryEventType,
} from '@infrastructure/database/entities/sos-status-history.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';

/**
 * DispatchGateway — namespace /dispatch
 *
 * Rooms:
 *   province:{provinceId}  → Admin tỉnh nhận SOS mới, status update
 *   team:{teamId}          → Rescue team nhận nhiệm vụ được assign
 *
 * Join rooms:
 *   - Admin: gửi query ?provinceId=1 khi connect
 *   - Team:  emit event 'join:team' với { teamId }
 */
@WebSocketGateway({
  namespace: '/dispatch',
  cors: { origin: '*' },
})
export class DispatchGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DispatchGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly dispatchSocketService: DispatchSocketService,
    private readonly dataSource: DataSource,
  ) {}

  afterInit(server: Server) {
    // ✅ Gán server cho service ngay khi gateway khởi tạo
    this.dispatchSocketService.setServer(server);
    this.logger.log('DispatchGateway initialized — namespace: /dispatch');
  }

  handleConnection(client: Socket) {
    const provinceId = client.handshake.query['provinceId'] as string;
    const role = client.handshake.query['role'] as string;

    if (provinceId) {
      (client as any).provinceId = provinceId;
      client.join(`province:${provinceId}`);
      this.logger.log(
        `[CONNECT] (Dispatch) Socket ID: ${client.id} | Province ID: ${provinceId} | Role: ${role} joined room province:${provinceId}`,
      );
    } else {
      this.logger.log(
        `[CONNECT] (Dispatch) Socket ID: ${client.id} connected with no province scope`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    const provinceId = (client as any).provinceId;
    if (provinceId) {
      this.logger.log(
        `[DISCONNECT] (Dispatch) Socket ID: ${client.id} | Province ID: ${provinceId} disconnected`,
      );
    } else {
      this.logger.log(
        `[DISCONNECT] (Dispatch) Socket ID: ${client.id} disconnected`,
      );
    }
  }

  /**
   * Rescue team join room của mình để nhận SOS alert
   * Client emit: { teamId: number }
   */
  @SubscribeMessage(DISPATCH_EVENTS.JOIN_TEAM_ROOM)
  handleJoinTeamRoom(
    @MessageBody() data: { teamId: number },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`team:${data.teamId}`);
    this.logger.log(` [${client.id}] joined team:${data.teamId}`);

    // Đội trưởng sẽ tự động tham gia thêm vào phòng leader của đội
    const role = client.handshake.query['role'] as string;
    if (
      role === 'TEAM_LEADER' ||
      role === 'LEADER' ||
      role === 'RESCUE_TEAM_LEADER'
    ) {
      void client.join(`team:${data.teamId}:leader`);
      this.logger.log(` [${client.id}] joined team:${data.teamId}:leader`);
      void client.emit('joined', { room: `team:${data.teamId}:leader` });
    } else {
      void client.emit('joined', { room: `team:${data.teamId}` });
    }
  }

  /**
   * Đội trưởng chấp nhận tiếp nhận yêu cầu cứu hộ khẩn cấp
   * Client emit: { sosId: number, teamId: number }
   */
  @SubscribeMessage(DISPATCH_EVENTS.SOS_CLAIM)
  async handleSosClaim(
    @MessageBody() data: { sosId: number; teamId: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `[Claim] Socket ${client.id} (Team ${data.teamId}) attempting to claim SOS ${data.sosId}`,
    );

    const role = client.handshake.query['role'] as string;
    if (
      role !== 'TEAM_LEADER' &&
      role !== 'LEADER' &&
      role !== 'RESCUE_TEAM_LEADER'
    ) {
      this.logger.warn(
        `[Claim Failed] Socket ${client.id} role is ${role}, not authorized to claim.`,
      );
      client.emit(DISPATCH_EVENTS.SOS_CLAIM_RESULT, {
        sosId: data.sosId,
        success: false,
        message: 'Bạn không có quyền Đội trưởng để tiếp nhận ca cứu hộ này.',
      });
      return;
    }

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        // 1. SELECT FOR UPDATE: Khóa dòng SOS tránh race condition
        const sos = await manager.findOne(SosRequestEntity, {
          where: { id: data.sosId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!sos) {
          return { success: false, message: 'Yêu cầu cứu hộ không tồn tại.' };
        }

        // Kiểm tra xem đã có đội nào nhận trước đó chưa
        if (
          sos.status !== SosStatus.PENDING &&
          sos.status !== SosStatus.PENDING_SPECIALIST
        ) {
          return {
            success: false,
            message: 'Yêu cầu cứu hộ này đã được tiếp nhận bởi đội khác.',
          };
        }

        // 2. SELECT FOR UPDATE: Khóa dòng Đội cứu hộ
        const team = await manager.findOne(RescueTeamEntity, {
          where: { id: data.teamId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!team) {
          return { success: false, message: 'Đội cứu hộ không tồn tại.' };
        }

        if (
          team.status !== TeamStatus.AVAILABLE &&
          team.status !== TeamStatus.STANDBY
        ) {
          return {
            success: false,
            message: 'Đội cứu hộ hiện đang bận hoặc không sẵn sàng.',
          };
        }

        // 3. Thực hiện gán đội cho SOS
        sos.assignedTeamId = team.id;
        sos.assignedAt = new Date();
        sos.status = SosStatus.DISPATCHED;
        sos.dispatchMethod = DispatchMethod.AUTO;
        sos.specialistPending = false;
        sos.specialistType = undefined;
        sos.pendingSince = undefined;
        await manager.save(SosRequestEntity, sos);

        // 4. Cập nhật trạng thái Đội cứu hộ sang bận nhiệm vụ
        team.status = TeamStatus.DISPATCHED;
        team.activeCasesCount = (team.activeCasesCount || 0) + 1;
        await manager.save(RescueTeamEntity, team);

        // 5. Ghi lịch sử trạng thái
        const history = manager.create(SosStatusHistoryEntity, {
          sosRequestId: sos.id,
          eventType: SosHistoryEventType.TEAM_ASSIGNED,
          fromStatus: SosStatus.PENDING,
          toStatus: SosStatus.DISPATCHED,
          teamId: team.id,
          dispatchMethod: DispatchMethod.AUTO,
          note: `Đội trưởng Đội ${team.name} đã bấm nhận tiếp nhận ca cứu hộ.`,
        });
        await manager.save(SosStatusHistoryEntity, history);

        return {
          success: true,
          message: 'Tiếp nhận ca cứu hộ thành công!',
          sos,
        };
      });

      if (result.success && result.sos) {
        this.logger.log(
          `[Claim Success] Team ${data.teamId} claimed SOS ${data.sosId} successfully.`,
        );
        client.emit(DISPATCH_EVENTS.SOS_CLAIM_RESULT, {
          sosId: data.sosId,
          success: true,
          message: result.message,
        });

        const sos = result.sos;

        // Phát WebSocket báo cho toàn tỉnh gỡ popup
        this.dispatchSocketService.broadcastSosOfferClaimed(sos.provinceId, {
          sosId: sos.id,
          assignedTeamId: data.teamId,
        });

        // Báo cho toàn đội
        this.dispatchSocketService.notifyTeamAssigned(data.teamId, sos);
      } else {
        this.logger.warn(`[Claim Failed] ${result.message}`);
        client.emit(DISPATCH_EVENTS.SOS_CLAIM_RESULT, {
          sosId: data.sosId,
          success: false,
          message: result.message,
        });
      }
    } catch (err) {
      this.logger.error(
        `Error claiming SOS ${data.sosId} for team ${data.teamId}:`,
        err,
      );
      client.emit(DISPATCH_EVENTS.SOS_CLAIM_RESULT, {
        sosId: data.sosId,
        success: false,
        message: 'Lỗi hệ thống khi xử lý tiếp nhận.',
      });
    }
  }

  /**
   * Rescue team cập nhật vị trí GPS realtime
   * Client emit: { teamId, longitude, latitude }
   */
  @SubscribeMessage(DISPATCH_EVENTS.UPDATE_TEAM_LOCATION)
  handleTeamLocationUpdate(
    @MessageBody()
    data: { teamId: number; longitude: number; latitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast vị trí đội cho admin tỉnh (future: tracking map)
    // Có thể lưu vào DB hoặc Redis cache ở đây
    this.logger.log(
      ` Team ${data.teamId} location: (${data.longitude}, ${data.latitude})`,
    );
  }
}
