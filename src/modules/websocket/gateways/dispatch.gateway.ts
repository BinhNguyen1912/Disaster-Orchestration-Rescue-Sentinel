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

  constructor(private readonly dispatchSocketService: DispatchSocketService) {}

  afterInit(server: Server) {
    // ✅ Gán server cho service ngay khi gateway khởi tạo
    this.dispatchSocketService.setServer(server);
    this.logger.log('🚀 DispatchGateway initialized — namespace: /dispatch');
  }

  handleConnection(client: Socket) {
    const provinceId = client.handshake.query['provinceId'];
    const role = client.handshake.query['role'];

    if (provinceId) {
      client.join(`province:${provinceId}`);
      this.logger.log(`⚡ [${client.id}] joined province:${provinceId} (role=${role})`);
    } else {
      this.logger.log(`⚡ [${client.id}] connected (no province)`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 [${client.id}] disconnected from /dispatch`);
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
    client.join(`team:${data.teamId}`);
    this.logger.log(`⚡ [${client.id}] joined team:${data.teamId}`);
    client.emit('joined', { room: `team:${data.teamId}` });
  }

  /**
   * Rescue team cập nhật vị trí GPS realtime
   * Client emit: { teamId, longitude, latitude }
   */
  @SubscribeMessage(DISPATCH_EVENTS.UPDATE_TEAM_LOCATION)
  handleTeamLocationUpdate(
    @MessageBody() data: { teamId: number; longitude: number; latitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast vị trí đội cho admin tỉnh (future: tracking map)
    // Có thể lưu vào DB hoặc Redis cache ở đây
    this.logger.log(
      `📍 Team ${data.teamId} location: (${data.longitude}, ${data.latitude})`,
    );
  }
}
