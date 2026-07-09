import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DeviceService } from '../../application/services/device.service';
import { RegisterDeviceDto } from '../../application/dtos/device.dto';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly service: DeviceService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký hoặc cập nhật thiết bị di động (FCM token)' })
  @HttpCode(HttpStatus.OK)
  async register(
    @Request() req: any,
    @Body(new ValidationPipe({ transform: true })) dto: RegisterDeviceDto,
  ) {
    const userId = req.user.userId ?? req.user.sub;
    return this.service.registerDevice(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thiết bị và phiên trình duyệt đang hoạt động' })
  async getDevicesAndSessions(@Request() req: any) {
    const userId = req.user.userId ?? req.user.sub;
    return this.service.getUserDevicesAndSessions(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa/hủy liên kết thiết bị di động' })
  @HttpCode(HttpStatus.OK)
  async deleteDevice(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.userId ?? req.user.sub;
    await this.service.deleteDevice(id, userId);
    return { success: true, message: 'Đã xóa liên kết thiết bị thành công' };
  }

  @Delete('session/:id')
  @ApiOperation({ summary: 'Đăng xuất / thu hồi phiên trình duyệt web từ xa' })
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.userId ?? req.user.sub;
    await this.service.revokeSession(id, userId);
    return { success: true, message: 'Đã thu hồi phiên đăng nhập thành công' };
  }
}
