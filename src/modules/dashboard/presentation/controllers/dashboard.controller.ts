import { Controller, Get, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from '../../application/services/dashboard.service';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { ProvinceScopeGuard } from '@modules/auth/infrastructure/auth/guards/province-scope.guard';
import { RequirePermissions } from '@shared/common/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProvinceScopeGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Lấy các chỉ số tổng quan ở trang Dashboard' })
  @RequirePermissions(Permissions.REPORT_READ)
  async getStats(
    @Req() req: any,
    @Query('provinceId') provinceId?: number,
  ) {
    // Nếu bị giới hạn bởi ProvinceScopeGuard thì bắt buộc dùng provinceId của user
    const scopeId = req['provinceScope']?.provinceId ?? provinceId ?? null;
    return this.service.getStats(scopeId ? Number(scopeId) : null);
  }

  @Get('charts')
  @ApiOperation({ summary: 'Lấy số liệu biểu đồ đường SOS và kết quả cứu sống' })
  @RequirePermissions(Permissions.REPORT_READ)
  async getCharts(
    @Req() req: any,
    @Query('provinceId') provinceId?: number,
    @Query('days') days?: number,
  ) {
    const scopeId = req['provinceScope']?.provinceId ?? provinceId ?? null;
    return this.service.getCharts(scopeId ? Number(scopeId) : null, days ? Number(days) : 7);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Lấy các thiên tai đang diễn ra và tin SOS mới nhất' })
  @RequirePermissions(Permissions.REPORT_READ)
  async getAlerts(
    @Req() req: any,
    @Query('provinceId') provinceId?: number,
  ) {
    const scopeId = req['provinceScope']?.provinceId ?? provinceId ?? null;
    return this.service.getAlerts(scopeId ? Number(scopeId) : null);
  }

  @Get('map-tasks')
  @ApiOperation({ summary: 'Lấy vị trí điều phối các đội cứu hộ & SOS trên bản đồ' })
  @RequirePermissions(Permissions.REPORT_READ)
  async getMapTasks(
    @Req() req: any,
    @Query('provinceId') provinceId?: number,
  ) {
    const scopeId = req['provinceScope']?.provinceId ?? provinceId ?? null;
    return this.service.getMapTasks(scopeId ? Number(scopeId) : null);
  }

  @Get('resources')
  @ApiOperation({ summary: 'Lấy báo cáo vật tư cứu trợ & đóng góp tiền tệ' })
  @RequirePermissions(Permissions.REPORT_READ)
  async getResources(
    @Req() req: any,
    @Query('provinceId') provinceId?: number,
  ) {
    const scopeId = req['provinceScope']?.provinceId ?? provinceId ?? null;
    return this.service.getResources(scopeId ? Number(scopeId) : null);
  }
}
