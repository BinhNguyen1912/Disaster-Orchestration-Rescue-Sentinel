import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  SystemNotificationEntity,
  NotificationEventEntity,
  NotificationTemplateGroupEntity,
  NotificationTemplateEntity,
  NotificationRecipientEntity,
  NotificationLogEntity,
  UserEntity,
} from '@infrastructure/database/entities';

import { NotificationService } from './application/services/notification.service';
import { NotificationDispatchListener } from './infrastructure/listeners/notification-dispatch.listener';
import { NotificationTemplateController } from './presentation/controllers/notification-template.controller';
import { NotificationEventController } from './presentation/controllers/notification-event.controller';
import { NotificationController } from './presentation/controllers/notification.controller';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemNotificationEntity,
      NotificationEventEntity,
      NotificationTemplateGroupEntity,
      NotificationTemplateEntity,
      NotificationRecipientEntity,
      NotificationLogEntity,
      UserEntity,
    ]),
    EventEmitterModule.forRoot(), // Ensure event emitter is initialized
    WebSocketModule,
  ],
  controllers: [
    NotificationTemplateController,
    NotificationEventController,
    NotificationController,
  ],
  providers: [NotificationService, NotificationDispatchListener],
  exports: [NotificationService],
})
export class NotificationModule {}
