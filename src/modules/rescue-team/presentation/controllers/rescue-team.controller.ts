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
import type { CreateRescueTeamDto } from '../../application/dtos/create-rescue-team.dto';
import type { UpdateRescueTeamDto } from '../../application/dtos/update-rescue-team.dto';
import type { UpdateRescueTeamLocationDto } from '../../application/dtos/update-rescue-team-location.dto';
import type { AddMemberDto } from '../../application/dtos/add-member.dto';
import type { UpdateMemberRoleDto } from '../../application/dtos/update-member-role.dto';
import type { QueryRescueTeamDto } from '../../application/dtos/query.dto';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '@modules/auth/infrastructure/auth/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';
import { CreateRescueTeamValidationDto } from '../dtos/rescue-team/create-rescue-team.dto';
import { UpdateRescueTeamValidationDto } from '../dtos/rescue-team/update-rescue-team.dto';
import { UpdateRescueTeamLocationValidationDto } from '../dtos/rescue-team/update-rescue-team-location.dto';
import { AddMemberValidationDto } from '../dtos/rescue-team/add-member.dto';
import { UpdateMemberRoleValidationDto } from '../dtos/rescue-team/update-member-role.dto';
import { QueryRescueTeamValidationDto } from '../dtos/rescue-team/query-rescue-team.dto';

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

  @ApiOperation({ summary: 'Thêm thành viên vào đội' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Thêm thành viên thành công' })
  @Post(':teamId/members')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permissions.RESCUE_MANAGE)
  async addMember(
    @Param('teamId') teamId: string,
    @Body(new ValidationPipe({ transform: true })) dto: AddMemberValidationDto,
  ) {
    return this.service.addMember(parseInt(teamId, 10), dto);
  }

  @ApiOperation({ summary: 'Lấy danh sách thành viên' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
  @Get(':teamId/members')
  @RequirePermissions(Permissions.RESCUE_READ)
  async getMembers(
    @Param('teamId') teamId: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.getMembers(parseInt(teamId, 10), {
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @ApiOperation({ summary: 'Xóa thành viên khỏi đội' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Xóa thành viên thành công' })
  @Delete(':teamId/members/:memberId')
  @RequirePermissions(Permissions.RESCUE_MANAGE)
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.service.removeMember(
      parseInt(teamId, 10),
      parseInt(memberId, 10),
    );
    return { success: true };
  }

  @ApiOperation({ summary: 'Chuyển vai trò thành viên' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Chuyển vai trò thành công' })
  @Patch(':teamId/members/:memberId/role')
  @RequirePermissions(Permissions.RESCUE_MANAGE)
  async updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateMemberRoleValidationDto,
  ) {
    return this.service.updateMemberRole(
      parseInt(teamId, 10),
      parseInt(memberId, 10),
      dto,
    );
  }

  @ApiOperation({ summary: 'Rời đội' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Rời đội thành công' })
  @Post('leave')
  @HttpCode(HttpStatus.OK)
  async leave(@Body() body: { userId?: number }, @Request() req: any) {
    const userId = body.userId ?? req.user.userId ?? req.user.sub;
    await this.service.leaveTeam(userId);
    return { success: true };
  }
}
