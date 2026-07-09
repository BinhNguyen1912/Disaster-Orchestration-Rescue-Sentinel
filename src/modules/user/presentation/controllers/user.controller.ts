import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../../application/services/user.service';
import { JwtAuthGuard } from '@modules/auth/infrastructure/auth/guards/jwt-auth.guard';
import { ProvinceScopeGuard } from '@modules/auth/infrastructure/auth/guards/province-scope.guard';
import { RequirePermissions } from '@shared/common/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';
import { UpdateUserValidationDto } from '../dtos/validation/update-user.validation.dto';
import { QueryUserValidationDto } from '../dtos/validation/query-user.validation.dto';
import { ChangePasswordValidationDto } from '../dtos/validation/change-password.validation.dto';
import { BulkUpdateUserValidationDto } from '../dtos/validation/bulk-update-user.validation.dto';
import { CurrentUser } from '@shared/common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProvinceScopeGuard)
@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @RequirePermissions(Permissions.USER_READ)
  async findAll(
    @Request() req: any,
    @Query(new ValidationPipe({ transform: true }))
    query: QueryUserValidationDto,
  ) {
    const { page = 1, limit = 20, ...filters } = query;
    // Merge provinceScope from guard if exists
    const provinceScope = req['provinceScope'];
    if (provinceScope && !filters.provinceId) {
      filters.provinceId = provinceScope.provinceId;
    }
    return this.service.findAll(filters, { page, limit });
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm người dùng' })
  @RequirePermissions(Permissions.USER_READ)
  async search(@Query('q') query: string) {
    return this.service.search(query || '');
  }

  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin cá nhân' })
  async getProfile(@CurrentUser('sub') sub: number) {
    console.log('Current user ID from token:', sub);
    return this.service.getProfile(sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  async updateProfile(
    @Request() req: any,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateUserValidationDto,
  ) {
    const userId = req.user.userId ?? req.user.sub;
    return this.service.updateProfile(userId, dto);
  }

  @Patch('profile/password')
  @ApiOperation({ summary: 'Đổi mật khẩu bản thân' })
  @HttpCode(HttpStatus.OK)
  async changeOwnPassword(
    @Request() req: any,
    @Body(new ValidationPipe({ transform: true }))
    dto: ChangePasswordValidationDto,
  ) {
    const userId = req.user.userId ?? req.user.sub;
    await this.service.changePassword(userId, dto);
    return { success: true };
  }

  @Patch('bulk-update')
  @ApiOperation({ summary: 'Cập nhật hàng loạt người dùng (vai trò, trạng thái)' })
  @RequirePermissions(Permissions.USER_UPDATE)
  async bulkUpdate(
    @Body(new ValidationPipe({ transform: true }))
    dto: BulkUpdateUserValidationDto,
  ) {
    return this.service.bulkUpdate(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin người dùng theo ID' })
  @RequirePermissions(Permissions.USER_READ)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật người dùng' })
  @RequirePermissions(Permissions.USER_UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateUserValidationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa người dùng (soft delete)' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.USER_DELETE)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete(id);
    return { success: true };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Kích hoạt/Vô hiệu hóa người dùng' })
  @RequirePermissions(Permissions.USER_MANAGE)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.service.updateStatus(id, isActive);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Đổi mật khẩu người dùng' })
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.USER_MANAGE)
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true }))
    dto: ChangePasswordValidationDto,
  ) {
    await this.service.changePassword(id, dto);
    return { success: true };
  }
}
