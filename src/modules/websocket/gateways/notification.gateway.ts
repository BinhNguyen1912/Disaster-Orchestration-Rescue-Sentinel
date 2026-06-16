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
import { NotificationSocketService } from '../services/notification-socket.service';
import { NOTIFICATION_EVENTS } from '../events/websocket.events';

/**
 * NotificationGateway — namespace /notification
 *
 * Rooms:
 *   user:{userId}  → Push notification đến user cụ thể
 *
 * Join room: gửi query ?userId=123 khi connect
 */
@WebSocketGateway({
  namespace: '/notification',
  cors: { origin: '*' },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly notificationSocketService: NotificationSocketService,
  ) {}

  afterInit(server: Server) {
    // ✅ Gán server cho service ngay khi gateway khởi tạo
    this.notificationSocketService.setServer(server);
    this.logger.log('🚀 NotificationGateway initialized — namespace: /notification');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query['userId'];

    if (userId) {
      client.join(`user:${userId}`);
      this.logger.log(`⚡ [${client.id}] joined user:${userId}`);
    } else {
      this.logger.warn(`⚠️ [${client.id}] connected without userId`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 [${client.id}] disconnected from /notification`);
  }

  /**
   * Client đánh dấu đã đọc notification
   * Client emit: { notificationId: number }
   */
  @SubscribeMessage(NOTIFICATION_EVENTS.MARK_READ)
  handleMarkRead(
    @MessageBody() data: { notificationId: number },
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: Cập nhật isRead trong DB
    this.logger.log(`✅ Notification ${data.notificationId} marked as read`);
  }
}
