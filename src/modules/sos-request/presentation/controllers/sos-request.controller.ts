import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
import { CreateSosRequestValidationDto } from '../dtos/create-sos-request.validation.dto';
import { QuerySosRequestValidationDto } from '../dtos/query-sos-request.validation.dto';
import { UpdateSosStatusValidationDto } from '../dtos/update-sos-status.validation.dto';
import { AssignTeamValidationDto } from '../dtos/assign-team.validation.dto';
import { CancelSosRequestValidationDto } from '../dtos/cancel-sos-request.validation.dto';
import { SosRequestService } from '../../application/services/sos-request.service';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';

@ApiTags('SOS Requests')
@Controller('sos-requests')
export class SosRequestController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly service: SosRequestService,
  ) {}

  private extractUserFromHeader(req: any): any {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        return this.jwtService.decode(token);
      } catch (err) {
        // ignore decode errors, return undefined
      }
    }
    return undefined;
  }

  @ApiOperation({ summary: 'Gửi yêu cầu SOS (Public)' })
  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ transform: true }))
    dto: CreateSosRequestValidationDto,
    @Request() req: any,
  ) {
    const user = this.extractUserFromHeader(req);
    return this.service.create(dto, user);
  }

  @ApiOperation({ summary: 'Truy vấn danh sách SOS' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Danh sách yêu cầu SOS' })
  @Get()
  @RequirePermissions(Permissions.SOS_READ)
  async findAll(
    @Query(new ValidationPipe({ transform: true }))
    query: QuerySosRequestValidationDto,
    @Request() req: any,
  ) {
    return this.service.findAll(query, req.user);
  }

  @ApiOperation({ summary: 'Tìm kiếm SOS lân cận' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Danh sách SOS lân cận' })
  @Get('nearby')
  @RequirePermissions(Permissions.SOS_READ)
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
    @Query('status') status: SosStatus,
    @Request() req: any,
  ) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = radius ? parseFloat(radius) : 5;
    return this.service.findNearby(
      parsedLat,
      parsedLng,
      parsedRadius,
      status || SosStatus.PENDING,
      req.user,
    );
  }

  @ApiOperation({ summary: 'Cập nhật trạng thái SOS' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @Patch(':id/status')
  @RequirePermissions(Permissions.SOS_UPDATE)
  async updateStatus(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateSosStatusValidationDto,
    @Request() req: any,
  ) {
    return this.service.updateStatus(parseInt(id, 10), dto, req.user);
  }

  @ApiOperation({ summary: 'Phân công/Điều phối đội cứu hộ' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Phân công thành công' })
  @Patch(':id/assign')
  @RequirePermissions(Permissions.SOS_UPDATE)
  async assignTeam(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: AssignTeamValidationDto,
    @Request() req: any,
  ) {
    return this.service.assignTeam(parseInt(id, 10), dto, req.user);
  }

  @ApiOperation({ summary: 'Hủy yêu cầu cứu hộ (Self-cancellation)' })
  @Delete(':id')
  @Public()
  async cancel(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: CancelSosRequestValidationDto,
    @Request() req: any,
  ) {
    const user = this.extractUserFromHeader(req);
    return this.service.cancel(parseInt(id, 10), dto, user);
  }
}
