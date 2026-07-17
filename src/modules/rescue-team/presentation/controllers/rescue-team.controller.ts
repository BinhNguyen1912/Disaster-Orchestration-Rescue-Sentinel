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
import { RescueTeamService } from '../../application/services/rescue-team.service';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@shared/common/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';
import { CreateRescueTeamValidationDto } from '../dtos/rescue-team/create-rescue-team.dto';
import { UpdateRescueTeamValidationDto } from '../dtos/rescue-team/update-rescue-team.dto';
import { UpdateRescueTeamLocationValidationDto } from '../dtos/rescue-team/update-rescue-team-location.dto';
import { QueryRescueTeamValidationDto } from '../dtos/rescue-team/query-rescue-team.dto';
import { BulkUpdateStatusValidationDto } from '../dtos/rescue-team/bulk-update-status.dto';

@ApiTags('Rescue Teams')
@Controller('rescue-teams')
@UseGuards(JwtAuthGuard)
export class RescueTeamController {
  constructor(private readonly service: RescueTeamService) {}

  @ApiOperation({ summary: 'Tạo đội cứu hộ' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permissions.RESCUE_CREATE)
  async create(
    @Body(new ValidationPipe({ transform: true }))
    dto: CreateRescueTeamValidationDto,
    @Request() req: any,
  ) {
    return this.service.create(dto, req.user.userId ?? req.user.sub);
  }

  @ApiOperation({ summary: 'Lấy danh sách đội cứu hộ' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Danh sách đội cứu hộ' })
  @Get()
  @RequirePermissions(Permissions.RESCUE_READ)
  async findAll(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryRescueTeamValidationDto,
  ) {
    const { page = 1, limit = 20, ...filters } = query;
    return this.service.findAll(filters, { page, limit });
  }

  @ApiOperation({ summary: 'Lấy chi tiết đội cứu hộ' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Chi tiết đội cứu hộ' })
  @Get(':teamId')
  @RequirePermissions(Permissions.RESCUE_READ)
  async findById(@Param('teamId') teamId: string) {
    return this.service.findById(parseInt(teamId, 10));
  }

  @ApiOperation({ summary: 'Cập nhật trạng thái hàng loạt đội cứu hộ' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @Patch('bulk-status')
  @RequirePermissions(Permissions.RESCUE_UPDATE)
  async bulkUpdateStatus(
    @Body(new ValidationPipe({ transform: true }))
    dto: BulkUpdateStatusValidationDto,
  ) {
    return this.service.bulkUpdateStatus(dto.ids, dto.status);
  }

  @ApiOperation({ summary: 'Cập nhật đội cứu hộ' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @Patch(':teamId')
  @RequirePermissions(Permissions.RESCUE_UPDATE)
  async update(
    @Param('teamId') teamId: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateRescueTeamValidationDto,
  ) {
    return this.service.update(parseInt(teamId, 10), dto);
  }

  @ApiOperation({ summary: 'Cập nhật vị trí đội cứu hộ' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @Patch(':teamId/location')
  @RequirePermissions(Permissions.RESCUE_UPDATE)
  async updateLocation(
    @Param('teamId') teamId: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateRescueTeamLocationValidationDto,
  ) {
    return this.service.updateLocation(parseInt(teamId, 10), dto);
  }

  @ApiOperation({ summary: 'Xóa đội cứu hộ' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @Delete(':teamId')
  @RequirePermissions(Permissions.RESCUE_DELETE)
  async delete(@Param('teamId') teamId: string) {
    await this.service.delete(parseInt(teamId, 10));
    return { success: true };
  }
}
