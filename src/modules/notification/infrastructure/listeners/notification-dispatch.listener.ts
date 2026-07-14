import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationRecipientEntity,
  NotificationLogEntity,
  SystemNotificationEntity,
} from '@infrastructure/database/entities';
import { NotificationSocketService } from '../../../websocket/services/notification-socket.service';

@Injectable()
export class NotificationDispatchListener {
  private readonly logger = new Logger(NotificationDispatchListener.name);

  constructor(
    @InjectRepository(NotificationRecipientEntity)
    private readonly recipientRepo: Repository<NotificationRecipientEntity>,
    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,
    @InjectRepository(SystemNotificationEntity)
    private readonly notifRepo: Repository<SystemNotificationEntity>,
    private readonly socketService: NotificationSocketService,
  ) {}

  @OnEvent('notification.dispatch', { async: true })
  async handleDispatch(payload: {
    recipientId: number;
    notificationId: number;
    userId: number;
    channel: string;
    title: string;
    content: string;
    eventCode: string;
    data: any;
    createdBy?: number;
  }) {
    this.logger.log(`Dispatching notification #${payload.notificationId} to user #${payload.userId} via ${payload.channel}`);

    let status = 'SUCCESS';
    let errorMessage = '';

    try {
      switch (payload.channel) {
        case 'APP':
        case 'PUSH':
          // Re-use the existing WebSocket and FCM push implementation
          await this.socketService.pushToUser(payload.userId, {
            title: payload.title,
            body: payload.content,
            type: payload.eventCode.toLowerCase(),
            senderId: payload.createdBy,
            data: payload.data,
          });
          break;

        case 'EMAIL':
          // Mock Email dispatch (or call SMTP if configured)
          this.logger.log(`📧 [EMAIL MOCK] Sent to User #${payload.userId} | Subj: ${payload.title}`);
          break;

        case 'SMS':
          // Mock SMS dispatch
          this.logger.log(`💬 [SMS MOCK] Sent to User #${payload.userId} | Message: ${payload.content}`);
          break;

        default:
          throw new Error(`Unsupported channel: ${payload.channel}`);
      }

      // Update Recipient status
      await this.recipientRepo.update(payload.recipientId, {
        status: 'SENT',
        receivedAt: new Date(),
      });
    } catch (e: any) {
      status = 'FAILED';
      errorMessage = e.message || 'Unknown delivery error';
      await this.recipientRepo.update(payload.recipientId, {
        status: 'FAILED',
      });
    }

    // Save Logs
    try {
      await this.logRepo.save(
        this.logRepo.create({
          notificationId: payload.notificationId,
          recipientId: payload.recipientId,
          channel: payload.channel,
          status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          message: errorMessage || 'Delivered successfully',
        }),
      );
    } catch (logErr: any) {
      this.logger.error(`Failed to write notification log: ${logErr.message}`);
    }

    // Check if all recipients for this notification are processed
    try {
      const remaining = await this.recipientRepo.count({
        where: { notificationId: payload.notificationId, status: 'PENDING' },
      });
      if (remaining === 0) {
        await this.notifRepo.update(payload.notificationId, {
          status: 'SENT',
        });
        this.logger.log(`All recipients processed for notification #${payload.notificationId}. Status updated to SENT.`);
      }
    } catch (countErr: any) {
      this.logger.error(`Failed to update aggregate notification status: ${countErr.message}`);
    }
  }
}
