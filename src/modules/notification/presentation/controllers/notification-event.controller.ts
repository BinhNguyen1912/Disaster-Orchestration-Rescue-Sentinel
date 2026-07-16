import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEventEntity, NotificationTemplateGroupEntity } from '@infrastructure/database/entities';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';

@Controller('notification-events')
@UseGuards(JwtAuthGuard)
export class NotificationEventController {
  constructor(
    @InjectRepository(NotificationEventEntity)
    private readonly eventRepo: Repository<NotificationEventEntity>,
    @InjectRepository(NotificationTemplateGroupEntity)
    private readonly groupRepo: Repository<NotificationTemplateGroupEntity>,
  ) {}

  @Get()
  async findAll() {
    return this.eventRepo.find({ order: { id: 'ASC' } });
  }

  @Get('groups')
  async findGroups() {
    return this.groupRepo.find({ order: { id: 'ASC' } });
  }
}
