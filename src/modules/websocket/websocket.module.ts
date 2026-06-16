import { Module } from '@nestjs/common';

// Gateways
import { DispatchGateway } from './gateways/dispatch.gateway';
import { NotificationGateway } from './gateways/notification.gateway';

// Services
import { DispatchSocketService } from './services/dispatch-socket.service';
import { NotificationSocketService } from './services/notification-socket.service';

/**
 * WebSocketModule — Module tập trung quản lý tất cả WebSocket
 *
 * Namespaces:
 *   /dispatch      → Điều phối cứu hộ, SOS tracking
 *   /notification  → Push notification đến user
 *
 * Cách dùng ở module khác:
 *   imports: [WebSocketModule]
 *   → inject DispatchSocketService hoặc NotificationSocketService
 *
 * Thêm namespace mới:
 *   1. Tạo gateway mới trong gateways/
 *   2. Tạo service mới trong services/
 *   3. Thêm vào providers và exports ở đây
 */
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceEntity } from '@infrastructure/database/entities/device.entity';
import { NotificationEntity } from '@infrastructure/database/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceEntity, NotificationEntity]),
  ],
  providers: [
    // Gateways (không export — chỉ dùng nội bộ để init)
    DispatchGateway,
    NotificationGateway,

    // Services (export để các module khác inject)
    DispatchSocketService,
    NotificationSocketService,
  ],
  exports: [
    DispatchSocketService,
    NotificationSocketService,
  ],
})
export class WebSocketModule {}
