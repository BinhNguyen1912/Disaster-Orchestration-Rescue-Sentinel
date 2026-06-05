import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RescueTeamMemberService } from '../../application/services/rescue-team-member.service';
import { AddMemberValidationDto } from '../dtos/add-member.validation.dto';
import { UpdateMemberRoleValidationDto } from '../dtos/update-member-role.validation.dto';
import { Public } from '@modules/auth/infrastructure/auth/decorators/public.decorator';

@ApiTags('Team Members')
@Controller('teams/:teamId/members')
export class RescueTeamMemberController {
  constructor(private readonly service: RescueTeamMemberService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm thành viên vào đội' })
  @ApiResponse({ status: 201, description: 'Thành viên đã được thêm' })
  @ApiResponse({ status: 400, description: 'Thiếu userId hoặc citizenName' })
  @ApiResponse({ status: 409, description: 'Công dân đã tồn tại trong đội' })
  async addMember(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Body() dto: AddMemberValidationDto,
  ) {
    return this.service.addMember(teamId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách thành viên' })
  @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
  async getMembers(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('isActive') isActive?: string,
  ) {
    const filters: { isActive?: boolean } = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    return this.service.getMembers(teamId, filters);
  }

  @Patch(':memberId/role')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thay đổi vai trò thành viên' })
  @ApiResponse({ status: 200, description: 'Vai trò đã được thay đổi' })
  async updateMemberRole(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateMemberRoleValidationDto,
  ) {
    return this.service.updateMemberRole(teamId, memberId, dto);
  }

  @Delete(':memberId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa thành viên khỏi đội' })
  @ApiResponse({ status: 204, description: 'Đã xóa thành viên' })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa thành viên cuối cùng',
  })
  async removeMember(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.service.removeMember(teamId, memberId);
  }
}

@Controller('teams/leave')
@ApiTags('Team Members')
export class TeamLeaveController {
  constructor(private readonly service: RescueTeamMemberService) {}

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User tự rời đội' })
  @ApiResponse({ status: 200, description: 'Đã rời đội' })
  async leaveTeam(@Request() req: any) {
    return this.service.leaveTeam(req.user.userId);
  }
}
