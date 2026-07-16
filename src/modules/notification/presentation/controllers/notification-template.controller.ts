import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplateEntity } from '@infrastructure/database/entities';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { TemplateEngine } from '../../application/services/template-engine';

@Controller('notification-templates')
@UseGuards(JwtAuthGuard)
export class NotificationTemplateController {
  constructor(
    @InjectRepository(NotificationTemplateEntity)
    private readonly templateRepo: Repository<NotificationTemplateEntity>,
  ) {}

  @Get()
  async findAll() {
    return this.templateRepo.find({
      relations: ['event', 'group'],
      order: { id: 'ASC' },
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templateRepo.findOne({
      where: { id },
      relations: ['event', 'group'],
    });
  }

  @Post()
  async create(@Body() body: any) {
    const template = this.templateRepo.create(body);
    return this.templateRepo.save(template);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    await this.templateRepo.update(id, body);
    return this.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.templateRepo.delete(id);
    return { success: true };
  }

  @Post('test-render')
  testRender(
    @Body()
    body: {
      titleTemplate: string;
      contentTemplate: string;
      data: Record<string, any>;
    },
  ) {
    const renderedTitle = TemplateEngine.render(body.titleTemplate || '', body.data || {});
    const renderedContent = TemplateEngine.render(body.contentTemplate || '', body.data || {});
    return { title: renderedTitle, content: renderedContent };
  }
}
