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
import { RedisService } from '../../../infrastructure/redis/redis.service';

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
    private readonly redisService: RedisService,
  ) {}

  afterInit(server: Server) {
    // ✅ Gán server cho service ngay khi gateway khởi tạo
    this.notificationSocketService.setServer(server);
    this.logger.log(
      '🚀 NotificationGateway initialized — namespace: /notification',
    );
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.query['userId'] as string;
    const deviceType = (client.handshake.query['device'] ||
      client.handshake.query['deviceType'] ||
      'web') as string;

    if (userId) {
      (client as any).userId = userId;
      client.join(`user:${userId}`);
      this.logger.log(
        `🟢 [CONNECT] Socket ID: ${client.id} | User ID: ${userId} | Device: ${deviceType} joined room user:${userId}`,
      );

      // Redis presence tracking: increment connection count and set online status
      const redisKey = `user:status:${userId}`;
      try {
        await this.redisService.hincrby(redisKey, 'connectionCount', 1);
        await this.redisService.hsetAll(redisKey, {
          status: 'online',
          device: deviceType,
          lastActive: Math.floor(Date.now() / 1000).toString(),
        });
      } catch (err) {
        this.logger.error(
          `Failed to update presence for user ${userId} on connection`,
          err,
        );
      }
    } else {
      this.logger.warn(
        `⚠️ [CONNECT WARNING] Socket ID: ${client.id} connected without userId`,
      );
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      this.logger.log(
        `🔴 [DISCONNECT] Socket ID: ${client.id} | User ID: ${userId} disconnected`,
      );
      const redisKey = `user:status:${userId}`;
      try {
        const count = await this.redisService.hincrby(
          redisKey,
          'connectionCount',
          -1,
        );
        if (count <= 0) {
          await this.redisService.hsetAll(redisKey, {
            status: 'offline',
            connectionCount: '0', // ensure it doesn't stay negative
            lastActive: Math.floor(Date.now() / 1000).toString(),
          });
          this.logger.log(
            `👤 User ${userId} is now offline (all connections closed)`,
          );
        } else {
          this.logger.log(
            `🔌 remaining connections for user ${userId}: ${count}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to update presence for user ${userId} on disconnect`,
          err,
        );
      }
    } else {
      this.logger.log(
        `🔌 [DISCONNECT] Socket ID: ${client.id} disconnected (no userId associated)`,
      );
    }
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
