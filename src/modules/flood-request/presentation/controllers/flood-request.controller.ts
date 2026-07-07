import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { Public } from '@shared/common/decorators/public.decorator';
import { RequirePermissions } from '@shared/common/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';
import { Throttle } from '@nestjs/throttler';
import { CreateFloodRequestValidationDto } from '../dtos/create-flood-request.validation.dto';
import { QueryFloodRequestValidationDto } from '../dtos/query-flood-request.validation.dto';
import { UpdateFloodRequestStatusValidationDto } from '../dtos/update-flood-request-status.validation.dto';
import { DispatchFloodRequestValidationDto } from '../dtos/dispatch-flood-request.validation.dto';
import { FloodRequestService } from '../../application/services/flood-request.service';

@ApiTags('Flood Requests')
@Controller('flood-requests')
export class FloodRequestController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly service: FloodRequestService,
  ) {}

  private extractUserFromHeader(req: any): any {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        return this.jwtService.decode(token);
      } catch (err) {
        // ignore decode errors
      }
    }
    return undefined;
  }

  @ApiOperation({ summary: 'Gửi yêu cầu báo ngập lụt / cứu trợ báo lũ (Public)' })
  @Post()
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ transform: true }))
    dto: CreateFloodRequestValidationDto,
    @Request() req: any,
  ) {
    const user = this.extractUserFromHeader(req);
    return this.service.create(dto, user);
  }

  @ApiOperation({ summary: 'Theo dõi / Tra cứu yêu cầu ngập lụt của khách (Public)' })
  @Get('track')
  @Public()
  async track(
    @Query('phone') phone: string,
    @Query('id') id: string,
  ) {
    return this.service.track(phone, parseInt(id, 10));
  }

  @ApiOperation({ summary: 'Xem danh sách yêu cầu cá nhân (Resident)' })
  @ApiBearerAuth()
  @Get('my')
  async findMy(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryFloodRequestValidationDto,
    @Request() req: any,
  ) {
    // Force requesterId to current logged-in resident
    query.requesterId = req.user.sub;
    return this.service.findAll(query, req.user);
  }

  @ApiOperation({ summary: 'Truy vấn danh sách yêu cầu ngập lụt (Admin)' })
  @ApiBearerAuth()
  @Get()
  @RequirePermissions(Permissions.FLOOD_READ)
  async findAll(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryFloodRequestValidationDto,
    @Request() req: any,
  ) {
    return this.service.findAll(query, req.user);
  }

  @ApiOperation({ summary: 'Xem chi tiết yêu cầu ngập lụt (Admin)' })
  @ApiBearerAuth()
  @Get(':id')
  @RequirePermissions(Permissions.FLOOD_READ)
  async findById(@Param('id') id: string) {
    return this.service.findById(parseInt(id, 10));
  }

  @ApiOperation({ summary: 'Cập nhật trạng thái yêu cầu ngập lụt (Admin)' })
  @ApiBearerAuth()
  @Patch(':id/status')
  @RequirePermissions(Permissions.FLOOD_UPDATE)
  async updateStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateFloodRequestStatusValidationDto,
    @Request() req: any,
  ) {
    return this.service.updateStatus(parseInt(id, 10), dto, req.user);
  }

  @ApiOperation({ summary: 'Duyệt yêu cầu lên bản đồ ngập lụt công cộng (Admin)' })
  @ApiBearerAuth()
  @Post(':id/approve-map')
  @RequirePermissions(Permissions.FLOOD_UPDATE)
  async approveMap(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.service.approveMap(parseInt(id, 10), req.user);
  }

  @ApiOperation({ summary: 'Phân công / Điều phối đội cứu hộ cho yêu cầu cần hỗ trợ (Admin)' })
  @ApiBearerAuth()
  @Post(':id/dispatch')
  @RequirePermissions(Permissions.FLOOD_UPDATE)
  async dispatch(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: DispatchFloodRequestValidationDto,
    @Request() req: any,
  ) {
    return this.service.dispatch(parseInt(id, 10), dto, req.user);
  }

  @ApiOperation({ summary: 'Xem lịch sử xử lý (timeline) của yêu cầu (Admin)' })
  @ApiBearerAuth()
  @Get(':id/history')
  @RequirePermissions(Permissions.FLOOD_READ)
  async getHistory(@Param('id') id: string) {
    return this.service.getHistory(parseInt(id, 10));
  }
}
