import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { NOTIFICATION_EVENTS } from '../events/websocket.events';

/**
 * NotificationSocketService
 * Quản lý push notification realtime đến từng user.
 * Namespace: /notification
 */
@Injectable()
export class NotificationSocketService {
  private readonly logger = new Logger(NotificationSocketService.name);
  private server: Server;

  setServer(server: Server) {
    this.server = server;
    this.logger.log('✅ Notification socket server initialized');
  }

  /** Push notification đến 1 user cụ thể */
  pushToUser(userId: number, payload: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }) {
    this.server
      ?.to(`user:${userId}`)
      .emit(NOTIFICATION_EVENTS.PUSH, payload);
    this.logger.log(`📡 [user:${userId}] ${NOTIFICATION_EVENTS.PUSH} type=${payload.type}`);
  }

  /** Cập nhật badge count cho user */
  updateBadge(userId: number, count: number) {
    this.server
      ?.to(`user:${userId}`)
      .emit(NOTIFICATION_EVENTS.BADGE_UPDATE, { count });
  }

  /** Push đến nhiều user cùng lúc */
  pushToUsers(userIds: number[], payload: any) {
    userIds.forEach((uid) => this.pushToUser(uid, payload));
  }
}
