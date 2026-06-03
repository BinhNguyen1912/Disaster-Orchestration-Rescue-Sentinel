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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
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
import { Public } from '../../infrastructure/auth/decorators/public.decorator';
import { RequirePermissions } from '../../infrastructure/auth/decorators/permissions.decorator';
import { Permissions } from '@shared/common/constants/permissions.constant';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req,
    @Headers('x-forwarded-for') ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(req.user, ip, userAgent);
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
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ValidationPipe({ transform: true })) dto: RefreshTokenRequestDto,
    @Headers('x-forwarded-for') ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
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
