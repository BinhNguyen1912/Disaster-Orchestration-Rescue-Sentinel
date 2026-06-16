import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NOTIFICATION_EVENTS } from '../events/websocket.events';
import { DeviceEntity } from '@infrastructure/database/entities/device.entity';
import { NotificationEntity } from '@infrastructure/database/entities/notification.entity';
import { RedisService } from '../../../infrastructure/redis/redis.service';

/**
 * NotificationSocketService
 * Quản lý push notification realtime đến từng user.
 * Hỗ trợ lưu lịch sử thông báo và tự động gửi Push Notification (FCM) nếu user offline.
 * Namespace: /notification
 */
@Injectable()
export class NotificationSocketService {
  private readonly logger = new Logger(NotificationSocketService.name);
  private server: Server;

  constructor(
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly redisService: RedisService,
  ) {}

  setServer(server: Server) {
    this.server = server;
    this.logger.log('✅ Notification socket server initialized');
  }

  /** Push notification đến 1 user cụ thể */
  async pushToUser(
    userId: number,
    payload: {
      title: string;
      body: string;
      type: string;
      senderId?: number;
      data?: Record<string, any>;
    },
  ) {
    // 1. Gửi thông báo qua Socket.io (Realtime)
    if (this.server) {
      this.server.to(`user:${userId}`).emit(NOTIFICATION_EVENTS.PUSH, payload);
      this.logger.log(`📡 [Socket.io] Emitted notification to room user:${userId} type=${payload.type}`);
    }

    // 2. Lưu lịch sử thông báo vào Postgres DB
    try {
      const notification = this.notificationRepository.create({
        senderId: payload.senderId,
        receiverId: userId,
        title: payload.title,
        content: payload.body,
        type: payload.type,
        referenceId: payload.data?.referenceId ? parseInt(payload.data.referenceId, 10) : undefined,
        isRead: false,
      });
      await this.notificationRepository.save(notification);
      this.logger.log(`💾 Saved notification history in DB for user ${userId}`);
    } catch (dbErr) {
      this.logger.error(`Failed to save notification history in DB for user ${userId}`, dbErr);
    }

    // 3. Kiểm tra trạng thái online/offline của user trên Redis
    let isOnline = false;
    try {
      const presence = await this.redisService.hgetall(`user:status:${userId}`);
      if (presence && presence.status === 'online') {
        isOnline = true;
      }
    } catch (redisErr) {
      this.logger.error(`Failed to read presence from Redis for user ${userId}`, redisErr);
      // Fallback: nếu lỗi Redis, coi như offline để gửi FCM cho chắc
    }

    // 4. Nếu user offline (hoặc tin khẩn cần gửi song song), gửi Push Notification (FCM)
    // Các loại tin khẩn: 'sos_alert', 'rescue_assigned'
    const isUrgent = ['sos_alert', 'rescue_assigned'].includes(payload.type);

    if (!isOnline || isUrgent) {
      this.logger.log(`🔔 User ${userId} is ${isOnline ? 'ONLINE (URGENT)' : 'OFFLINE'}. Triggering FCM push notification fallback.`);
      await this.triggerFcmPush(userId, payload);
    }
  }

  /** Gửi FCM cho tất cả thiết bị của User */
  private async triggerFcmPush(
    userId: number,
    payload: { title: string; body: string; type: string; data?: Record<string, any> },
  ) {
    try {
      // Tìm các token FCM hoạt động của User
      const activeDevices = await this.deviceRepository.find({
        where: { userId, isActive: true },
      });

      const fcmTokens = activeDevices
        .map((d) => d.fcmToken)
        .filter((token): token is string => !!token);

      if (fcmTokens.length === 0) {
        this.logger.warn(`⚠️ No active FCM tokens found for user ${userId}. Cannot send push notification.`);
        return;
      }

      this.logger.log(`Sending FCM Push to ${fcmTokens.length} devices for user ${userId}`);
      for (const token of fcmTokens) {
        await this.sendFcmNotification(token, payload);
      }
    } catch (err) {
      this.logger.error(`Failed to trigger FCM push for user ${userId}`, err);
    }
  }

  /** Giả lập gửi tin qua Firebase SDK */
  private async sendFcmNotification(
    fcmToken: string,
    payload: { title: string; body: string; type: string; data?: Record<string, any> },
  ) {
    // TODO: Tích hợp thư viện firebase-admin để bắn FCM thật
    // admin.messaging().send({ token: fcmToken, notification: { title, body } })
    this.logger.log(
      `📲 [FCM MOCK PUSH] Sent to token ${fcmToken.substring(0, 15)}... | Title: "${payload.title}" | Body: "${payload.body}" | Type: ${payload.type}`,
    );
  }

  /** Cập nhật badge count cho user */
  updateBadge(userId: number, count: number) {
    this.server
      ?.to(`user:${userId}`)
      .emit(NOTIFICATION_EVENTS.BADGE_UPDATE, { count });
  }

  /** Push đến nhiều user cùng lúc */
  async pushToUsers(
    userIds: number[],
    payload: {
      title: string;
      body: string;
      type: string;
      senderId?: number;
      data?: Record<string, any>;
    },
  ) {
    await Promise.all(userIds.map((uid) => this.pushToUser(uid, payload)));
  }
}
