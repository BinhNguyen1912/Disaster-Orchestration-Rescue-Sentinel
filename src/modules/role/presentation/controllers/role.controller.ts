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
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoleService } from '../../application/services/role.service';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@shared/common/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';
import {
  CreateRoleValidationDto,
  UpdateRoleValidationDto,
  QueryRoleValidationDto,
} from '../dtos/role/role.dto';
import { RoleResponseDto } from '../dtos/role/role-response.dto';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly service: RoleService) {}

  @ApiOperation({ summary: 'Tạo role mới' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permissions.USER_MANAGE)
  async create(
    @Body(new ValidationPipe({ transform: true })) dto: CreateRoleValidationDto,
  ) {
    const role = await this.service.create(dto);
    return RoleResponseDto.fromEntity(role as any);
  }

  @ApiOperation({ summary: 'Lấy danh sách roles' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Danh sách roles' })
  @Get()
  @RequirePermissions(Permissions.USER_READ)
  async findAll(
    @Query(new ValidationPipe({ transform: true }))
    query: QueryRoleValidationDto,
  ) {
    const { page = 1, limit = 20, ...filters } = query;
    return this.service.findAll(filters, { page, limit });
  }

  @ApiOperation({ summary: 'Lấy chi tiết role' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Chi tiết role' })
  @Get(':id')
  @RequirePermissions(Permissions.USER_READ)
  async findById(@Param('id') id: string) {
    return RoleResponseDto.fromEntity(
      (await this.service.findById(parseInt(id, 10))) as any,
    );
  }

  @ApiOperation({ summary: 'Cập nhật role' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @Patch(':id')
  @RequirePermissions(Permissions.USER_MANAGE)
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateRoleValidationDto,
  ) {
    return RoleResponseDto.fromEntity(
      (await this.service.update(parseInt(id, 10), dto)) as any,
    );
  }

  @ApiOperation({ summary: 'Xóa role' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @Delete(':id')
  @RequirePermissions(Permissions.USER_MANAGE)
  async delete(@Param('id') id: string) {
    await this.service.delete(parseInt(id, 10));
    return { success: true };
  }
}
