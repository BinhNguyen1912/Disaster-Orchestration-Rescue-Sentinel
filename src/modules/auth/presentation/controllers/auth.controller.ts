import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Headers,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../dtos/auth/login.dto';
import { RegisterDto } from '../dtos/auth/register.dto';
import { AdminRegisterDto } from '../dtos/auth/admin-register.dto';
import { RefreshTokenRequestDto } from '../dtos/auth/refresh-token-request.dto';
import { ForgotPasswordDto } from '../dtos/auth/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/auth/reset-password.dto';
import { LocalAuthGuard } from '../../infrastructure/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '../../infrastructure/auth/guards/jwt-auth.guard';
import { Public } from '../../../../shared/common/decorators/public.decorator';
import { RequirePermissions } from '../../../../shared/common/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiHeader({ name: 'x-forwarded-for', required: false, description: 'IP của client (tùy chọn, dùng cho audit log)' })
  @ApiHeader({ name: 'user-agent', required: false, description: 'Thông tin trình duyệt/thiết bị (tùy chọn, dùng cho audit log)' })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req: any,
    @Headers('x-forwarded-for') xForwardedFor: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const ip = xForwardedFor || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const { password, ...logBody } = req.body || {};
    this.logger.log(`[LOGIN ATTEMPT] body: ${JSON.stringify(logBody)}`);
    try {
      const result = await this.authService.login(req.user, ip, userAgent);
      this.logger.log(`[LOGIN SUCCESS] identifier: ${req.body.identifier}`);
      return result;
    } catch (error) {
      this.logger.warn(`[LOGIN FAILED] identifier: ${req.body.identifier}, error: ${error.message}`);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Đăng ký tài khoản' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ValidationPipe({ transform: true })) dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Tạo tài khoản cho nhân viên (Admin)' })
  @ApiBearerAuth()
  @ApiBody({ type: AdminRegisterDto })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công' })
  @UseGuards(JwtAuthGuard)
  @RequirePermissions(Permissions.USER_MANAGE)
  @Post('admin/register')
  @HttpCode(HttpStatus.CREATED)
  async adminRegister(
    @Body(new ValidationPipe({ transform: true })) dto: AdminRegisterDto,
    @Request() req: any,
  ) {
    const createdBy = req.user?.userId ?? req.user?.sub;
    return this.authService.adminRegister(dto, createdBy);
  }

  @ApiOperation({ summary: 'Cấp lại Access Token' })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({ status: 200, description: 'Cấp lại token thành công' })
  @ApiHeader({ name: 'x-forwarded-for', required: false, description: 'IP của client (tùy chọn, dùng cho audit log)' })
  @ApiHeader({ name: 'user-agent', required: false, description: 'Thông tin trình duyệt/thiết bị (tùy chọn, dùng cho audit log)' })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ValidationPipe({ transform: true })) dto: RefreshTokenRequestDto,
    @Headers('x-forwarded-for') xForwardedFor: string,
    @Headers('user-agent') userAgent: string,
    @Request() req: any,
  ) {
    const ip = xForwardedFor || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return this.authService.refresh(dto.refreshToken, ip, userAgent);
  }

  @ApiOperation({ summary: 'Đăng xuất' })
  @ApiBearerAuth()
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body(new ValidationPipe({ transform: true })) dto: RefreshTokenRequestDto,
  ) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Quên mật khẩu' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được gửi' })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ValidationPipe({ transform: true })) dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto.identifier);
  }

  @ApiOperation({ summary: 'Đặt lại mật khẩu' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công' })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ValidationPipe({ transform: true })) dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(
      dto.resetToken,
      dto.otp,
      dto.newPassword,
    );
  }
}
