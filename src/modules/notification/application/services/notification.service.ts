import { Injectable, Logger, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SystemNotificationEntity,
  NotificationEventEntity,
  NotificationTemplateGroupEntity,
  NotificationTemplateEntity,
  NotificationRecipientEntity,
  UserEntity,
  NotificationLogEntity,
} from '@infrastructure/database/entities';
import { TemplateEngine } from './template-engine';
import { SendNotificationDto } from '../../presentation/dtos/send-notification.dto';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(SystemNotificationEntity)
    private readonly notifRepo: Repository<SystemNotificationEntity>,
    @InjectRepository(NotificationEventEntity)
    private readonly eventRepo: Repository<NotificationEventEntity>,
    @InjectRepository(NotificationTemplateEntity)
    private readonly templateRepo: Repository<NotificationTemplateEntity>,
    @InjectRepository(NotificationRecipientEntity)
    private readonly recipientRepo: Repository<NotificationRecipientEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async onModuleInit() {
    try {
      await this.templateRepo.createQueryBuilder()
        .update(NotificationTemplateEntity)
        .set({ provinceId: 2 })
        .where('provinceId IS NULL')
        .execute();
      this.logger.log('Defaulted empty provinceIds to 2 successfully.');
    } catch (err: any) {
      this.logger.error(`Failed to update provinceId on startup: ${err.message}`);
    }
  }


  async send(dto: SendNotificationDto): Promise<SystemNotificationEntity> {
    this.logger.log(`Triggering notification event: ${dto.event}`);

    // 1. Find Event
    const event = await this.eventRepo.findOne({
      where: { code: dto.event, isActive: true },
    });
    if (!event) {
      this.logger.warn(`Event ${dto.event} is not registered or inactive.`);
      throw new Error(`Event ${dto.event} is not registered or inactive.`);
    }

    // 2. Find Template (prioritizing provinceId if provided, fallback to default)
    let template: NotificationTemplateEntity | null = null;
    if (dto.provinceId) {
      template = await this.templateRepo.findOne({
        where: { eventId: event.id, provinceId: dto.provinceId, isActive: true },
      });
    }
    if (!template) {
      template = await this.templateRepo.findOne({
        where: { eventId: event.id, isDefault: true, isActive: true },
      });
    }

    if (!template) {
      this.logger.error(`No template found for event ${dto.event}`);
      throw new Error(`No template found for event ${dto.event}`);
    }

    // 3. Render title & content
    const title = TemplateEngine.render(template.titleTemplate, dto.data);
    const content = TemplateEngine.render(template.contentTemplate, dto.data);

    // 4. Save notification
    const notification = this.notifRepo.create({
      eventId: event.id,
      templateId: template.id,
      title,
      content,
      priority: template.defaultPriority,
      data: dto.data,
      status: 'PROCESSING',
      createdBy: dto.createdBy,
    });
    const savedNotification = await this.notifRepo.save(notification);

    // 5. Resolve Recipients
    const recipientIds = dto.recipientUserIds || (await this.resolveRecipients(dto.event, dto.data, dto.provinceId));

    if (recipientIds.length > 0) {
      const recipients: NotificationRecipientEntity[] = [];
      const channels = template.defaultChannels || ['APP'];

      for (const userId of recipientIds) {
        for (const channel of channels) {
          recipients.push(
            this.recipientRepo.create({
              notificationId: savedNotification.id,
              userId,
              channel,
              status: 'PENDING',
            }),
          );
        }
      }
      const savedRecipients = await this.recipientRepo.save(recipients);

      // 6. Emit event to process dispatch asynchronously
      for (const recipient of savedRecipients) {
        this.eventEmitter.emit('notification.dispatch', {
          recipientId: recipient.id,
          notificationId: savedNotification.id,
          userId: recipient.userId,
          channel: recipient.channel,
          title,
          content,
          eventCode: dto.event,
          data: dto.data,
          createdBy: dto.createdBy,
        });
      }
    } else {
      savedNotification.status = 'SENT';
      await this.notifRepo.save(savedNotification);
    }

    return savedNotification;
  }

  private async resolveRecipients(event: string, data: Record<string, any>, provinceId?: number): Promise<number[]> {
    this.logger.log(`Resolving recipients for ${event}...`);
    try {
      const query = this.userRepo.createQueryBuilder('user')
        .leftJoin('user.userRoles', 'userRoles')
        .leftJoin('userRoles.role', 'role')
        .where('user.deletedAt IS NULL')
        .andWhere('user.isActive = true');

      if (event === 'SOS_CREATED' || event === 'FLOOD_CREATED') {
        query.andWhere('role.name IN (:...roles)', { roles: ['SYSTEM_ADMIN', 'PROVINCE_ADMIN'] });
        if (provinceId) {
          query.andWhere('user.provinceId = :provinceId', { provinceId });
        }
      }

      const users = await query.getMany();
      return users.map(u => u.id);
    } catch (e) {
      this.logger.error(`Error resolving recipients: ${e.message}`);
      return [];
    }
  }

  async getAllSentNotifications(userId: number) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.notifRepo.find({
      where: { createdBy: userId },
      relations: ['event', 'template'],
      order: { id: 'DESC' },
      take: 100,
    });
  }

  async getUserNotifications(userId: number) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    // Get all recipient records for the user
    const allRecipients = await this.recipientRepo.find({
      where: { userId },
      relations: ['notification', 'notification.event', 'notification.creator'],
      order: { id: 'DESC' },
    });

    // Deduplicate by notificationId to show only 1 record per notification in inbox
    // Prioritize status weights: READ (4) > SENT (3) > FAILED (2) > PENDING (1)
    const STATUS_WEIGHT: Record<string, number> = {
      'READ': 4,
      'SENT': 3,
      'FAILED': 2,
      'PENDING': 1,
    };
    const uniqueRecipientsMap = new Map<number, NotificationRecipientEntity>();
    for (const r of allRecipients) {
      if (!r.notificationId) continue;
      const existing = uniqueRecipientsMap.get(r.notificationId);
      if (!existing) {
        uniqueRecipientsMap.set(r.notificationId, r);
      } else {
        const existingWeight = STATUS_WEIGHT[existing.status] || 0;
        const currentWeight = STATUS_WEIGHT[r.status] || 0;
        if (currentWeight > existingWeight) {
          uniqueRecipientsMap.set(r.notificationId, r);
        }
      }
    }
    const uniqueRecipients = Array.from(uniqueRecipientsMap.values());

    return uniqueRecipients.map((r) => {
      const notif = r.notification;
      const createdDate = notif?.createdAt || new Date();

      // Collect all channels this notification was sent to for this user
      const userChannels = allRecipients
        .filter(ar => ar.notificationId === r.notificationId)
        .map(ar => ar.channel);

      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateGroup: 'Hôm nay' | 'Hôm qua' | 'Cũ hơn' = 'Cũ hơn';
      const itemDate = new Date(createdDate);
      if (itemDate.toDateString() === today.toDateString()) {
        dateGroup = 'Hôm nay';
      } else if (itemDate.toDateString() === yesterday.toDateString()) {
        dateGroup = 'Hôm qua';
      }

      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      if (notif?.priority === 'CRITICAL' || notif?.priority === 'HIGH' || notif?.priority === 'LOW') {
        priority = notif.priority as any;
      }

      let type: 'SOS' | 'RESCUE' | 'FLOOD' | 'SYSTEM' | 'HELP' = 'SYSTEM';
      const eventCode = notif?.event?.code || '';
      if (eventCode.includes('SOS')) type = 'SOS';
      else if (eventCode.includes('TEAM')) type = 'RESCUE';
      else if (eventCode.includes('FLOOD')) type = 'FLOOD';
      else if (eventCode.includes('HELP')) type = 'HELP';

      const meta: Record<string, string> = {
        'ID Người nhận': String(r.userId),
        'Người gửi': notif?.creator?.fullName || 'Hệ thống',
        'ID Người gửi': notif?.createdBy ? String(notif.createdBy) : 'Hệ thống',
        'Kênh nhận': userChannels.map(c => {
          if (c === 'APP') return '📱 In-App';
          if (c === 'SMS') return '💬 SMS';
          if (c === 'EMAIL') return '📧 Email';
          if (c === 'PUSH') return '🔔 Push';
          return c;
        }).join(', '),
      };

      if (notif?.data) {
        if (notif.data.address) meta['Địa điểm'] = notif.data.address;
        meta['Mức độ ưu tiên'] = priority === 'CRITICAL' ? 'Khẩn cấp' : priority === 'HIGH' ? 'Cao' : 'Trung bình';
        if (notif.data.citizenName) meta['Người tạo'] = notif.data.citizenName;
      }
      meta['Thời gian tạo'] = itemDate.toLocaleString('vi-VN');

      return {
        id: Number(r.id),
        title: notif?.title || 'Thông báo mới',
        content: notif?.content || '',
        type,
        priority,
        isRead: r.status === 'READ',
        createdAt: itemDate.toISOString(),
        dateGroup,
        time: itemDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        recipientUserId: r.userId,
        createdBy: notif?.createdBy || null,
        meta,
        fullContent: notif?.content,
      };
    });
  }

  async markAsRead(id: number, userId: number) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const recipient = await this.recipientRepo.findOne({ where: { id, userId } });
    if (!recipient) {
      throw new NotFoundException(`Notification recipient record ${id} not found for this user`);
    }
    await this.recipientRepo.update(
      { notificationId: recipient.notificationId, userId },
      { status: 'READ', readAt: new Date() }
    );
    return { success: true };
  }

  async markAllAsRead(userId: number) {
    await this.recipientRepo.update(
      { userId, status: Not('READ') },
      { status: 'READ', readAt: new Date() }
    );
    return { success: true };
  }

  async deleteNotification(id: number, userId: number) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    const recipient = await this.recipientRepo.findOne({
      where: { id, userId }
    });

    if (!recipient) {
      throw new NotFoundException(`Notification recipient record ${id} not found for this user`);
    }

    const notifId = recipient.notificationId;
    await this.recipientRepo.delete({ notificationId: notifId, userId });

    const count = await this.recipientRepo.count({
      where: { notificationId: notifId }
    });
    if (count === 0) {
      await this.notifRepo.delete({ id: notifId });
    }
    return { success: true };
  }

  async bulkMarkAsRead(ids: number[], userId: number) {
    if (!ids || ids.length === 0) return { success: true };
    const recipients = await this.recipientRepo.find({ where: { id: In(ids), userId } });
    if (recipients.length > 0) {
      const notifIds = recipients.map(r => r.notificationId);
      await this.recipientRepo.createQueryBuilder()
        .update()
        .set({ status: 'READ', readAt: new Date() })
        .where('notificationId IN (:...notifIds) AND userId = :userId', { notifIds, userId })
        .execute();
    }
    return { success: true };
  }

  async bulkDelete(ids: number[], userId: number) {
    if (!ids || ids.length === 0) return { success: true };

    const recipients = await this.recipientRepo.find({
      where: { id: In(ids), userId }
    });

    if (recipients.length > 0) {
      const notifIds = recipients.map(r => r.notificationId);
      await this.recipientRepo.createQueryBuilder()
        .delete()
        .where('notificationId IN (:...notifIds) AND userId = :userId', { notifIds, userId })
        .execute();

      for (const notifId of notifIds) {
        const count = await this.recipientRepo.count({
          where: { notificationId: notifId }
        });
        if (count === 0) {
          await this.notifRepo.delete({ id: notifId });
        }
      }
    }
    return { success: true };
  }

  async getLogs(channel?: string) {
    const where: any = {};
    if (channel) {
      where.channel = channel;
    }
    return this.logRepo.find({
      where,
      relations: ['notification', 'recipient', 'recipient.user'],
      order: { sentAt: 'DESC' },
      take: 100,
    });
  }
}
