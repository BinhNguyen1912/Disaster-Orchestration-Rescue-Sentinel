import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@shared/common/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';
import { RescueEquipmentService } from '../../application/services/rescue-equipment.service';
import { UpdateEquipmentValidationDto } from '../dtos/update-equipment.dto';
import { CreateEquipmentValidationDto } from '../dtos/create-equipment.dto';

@ApiTags('Rescue Equipments')
@Controller('teams/:teamId/equipments')
@UseGuards(JwtAuthGuard)
export class RescueEquipmentController {
  constructor(private readonly service: RescueEquipmentService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách thiết bị của đội' })
  @ApiResponse({ status: 200, description: 'Danh sách thiết bị' })
  @RequirePermissions(Permissions.RESCUE_READ)
  async findByTeamId(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.service.findByTeamId(teamId);
  }

  @Put(':equipmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin thiết bị' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @RequirePermissions(Permissions.RESCUE_UPDATE)
  async update(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('equipmentId', ParseIntPipe) equipmentId: number,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateEquipmentValidationDto,
  ) {
    return this.service.update(teamId, equipmentId, dto);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm thiết bị mới cho đội' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @RequirePermissions(Permissions.RESCUE_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Body(new ValidationPipe({ transform: true }))
    dto: CreateEquipmentValidationDto,
  ) {
    return this.service.create(teamId, dto);
  }

  @Delete(':equipmentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa thiết bị khỏi đội' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  @RequirePermissions(Permissions.RESCUE_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('equipmentId', ParseIntPipe) equipmentId: number,
  ) {
    await this.service.delete(teamId, equipmentId);
  }
}
