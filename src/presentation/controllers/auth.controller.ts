import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Req,
  Headers,
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Đăng nhập',
    description:
      'Đăng nhập bằng số điện thoại hoặc email, nhận Access Token và Refresh Token',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không hợp lệ' })
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

  @ApiOperation({
    summary: 'Đăng ký tài khoản',
    description: 'Tạo tài khoản người dùng mới',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc tài khoản đã tồn tại',
  })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Tạo tài khoản cho nhân viên (Admin)',
    description:
      'Admin/SysAdmin tạo tài khoản cho nhân viên với vai trò cụ thể (Admin tỉnh, Quản lý cứu hộ, Cứu hộ viên...)',
  })
  @ApiBearerAuth()
  @ApiBody({ type: AdminRegisterDto })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền' })
  @UseGuards(JwtAuthGuard)
  @Post('admin/register')
  @HttpCode(HttpStatus.CREATED)
  async adminRegister(@Body() dto: AdminRegisterDto, @Request() req: any) {
    const createdBy = req.user?.userId ?? req.user?.sub;
    return this.authService.adminRegister(dto, createdBy);
  }

  @ApiOperation({
    summary: 'Cấp lại Access Token',
    description:
      'Dùng Refresh Token để nhận cặp token mới (Rotate Refresh Token)',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({ status: 200, description: 'Cấp lại token thành công' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ hoặc đã hết hạn',
  })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenRequestDto,
    @Headers('x-forwarded-for') ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.refresh(dto.refreshToken, ip, userAgent);
  }

  @ApiOperation({
    summary: 'Đăng xuất',
    description: 'Thu hồi Refresh Token hiện tại để đăng xuất khỏi thiết bị',
  })
  @ApiBearerAuth()
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiOperation({
    summary: 'Quên mật khẩu',
    description: 'Yêu cầu mã OTP khôi phục mật khẩu (gửi qua Email/SMS)',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được gửi' })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.identifier);
  }

  @ApiOperation({
    summary: 'Đặt lại mật khẩu',
    description: 'Xác nhận OTP và đặt lại mật khẩu mới',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'OTP không hợp lệ hoặc đã hết hạn' })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.resetToken,
      dto.otp,
      dto.newPassword,
    );
  }
}
