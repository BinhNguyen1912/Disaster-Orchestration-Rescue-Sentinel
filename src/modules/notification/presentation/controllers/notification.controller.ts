import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationLogEntity } from '@infrastructure/database/entities';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/common/decorators/current-user.decorator';
import { NotificationService } from '../../application/services/notification.service';
import { SendNotificationDto } from '../dtos/send-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  // 1. GET /notifications - Get all sent notifications
  @Get()
  async getAllNotifications(@CurrentUser('userId') userId: number) {
    return this.notificationService.getAllSentNotifications(userId);
  }

  // 2. GET /notifications/my - Get current user's notifications
  @Get('my')
  async getMyNotifications(@CurrentUser('userId') userId: number) {
    return this.notificationService.getUserNotifications(userId);
  }

  // 3. PATCH /notifications/:id/read - Mark one notification as read
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser('userId') userId: number) {
    return this.notificationService.markAsRead(Number(id), userId);
  }

  // 4. PATCH /notifications/read-all/bulk - Mark all notifications as read
  @Patch('read-all/bulk')
  async markAllAsRead(@CurrentUser('userId') userId: number) {
    return this.notificationService.markAllAsRead(userId);
  }

  // 5. DELETE /notifications/:id - Delete one notification
  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @CurrentUser('userId') userId: number) {
    return this.notificationService.deleteNotification(Number(id), userId);
  }

  // 6. POST /notifications/bulk-read - Bulk mark as read
  @Post('bulk-read')
  async bulkMarkAsRead(@Body() body: { ids: number[] }, @CurrentUser('userId') userId: number) {
    const { ids } = body;
    return this.notificationService.bulkMarkAsRead(ids, userId);
  }

  // 7. POST /notifications/bulk-delete - Bulk delete
  @Post('bulk-delete')
  async bulkDelete(@Body() body: { ids: number[] }, @CurrentUser('userId') userId: number) {
    const { ids } = body;
    return this.notificationService.bulkDelete(ids, userId);
  }

  // 8. GET /notifications/logs - Get notification logs
  @Get('logs')
  async getLogs(@Query('channel') channel?: string) {
    return this.notificationService.getLogs(channel);
  }

  // 9. POST /notifications/send - Dispatch notification
  @Post('send')
  async sendNotification(@Body() body: SendNotificationDto, @CurrentUser('userId') userId: number) {
    return this.notificationService.send({
      ...body,
      createdBy: userId,
    });
  }
}
