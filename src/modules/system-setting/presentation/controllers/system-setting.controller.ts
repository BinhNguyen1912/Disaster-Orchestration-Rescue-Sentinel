import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { SystemSettingService } from '../../application/services/system-setting.service';

@ApiTags('System Settings')
@Controller('system-settings')
@UseGuards(JwtAuthGuard)
export class SystemSettingController {
  constructor(private readonly service: SystemSettingService) {}

  @ApiOperation({ summary: 'Lấy toàn bộ cấu hình hệ thống' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Lấy cấu hình thành công' })
  @Get()
  async getSettings() {
    return this.service.getAllSettings();
  }

  @ApiOperation({ summary: 'Cập nhật cấu hình hệ thống' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Cập nhật cấu hình thành công' })
  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateSettings(@Body() payload: Record<string, string>) {
    await this.service.updateSettings(payload);
    return { success: true };
  }

  @ApiOperation({ summary: 'Lấy danh mục theo loại' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Lấy danh mục thành công' })
  @Get('categories/:type')
  async getCategories(@Param('type') type: string) {
    return this.service.getCategories(type);
  }

  @ApiOperation({ summary: 'Thêm mới danh mục' })
  @ApiBearerAuth()
  @ApiResponse({ status: 251, description: 'Thêm danh mục thành công' })
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async addCategory(
    @Body() body: { type: string; code: string; name: string },
  ) {
    return this.service.addCategory(body.type, body.code, body.name);
  }

  @ApiOperation({ summary: 'Xóa danh mục' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Xóa danh mục thành công' })
  @Delete('categories/:code')
  @HttpCode(HttpStatus.OK)
  async deleteCategory(@Param('code') code: string) {
    await this.service.deleteCategory(code);
    return { success: true };
  }
}
