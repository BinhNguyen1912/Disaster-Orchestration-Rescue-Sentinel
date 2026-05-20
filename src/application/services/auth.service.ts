import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository.interface';
import { JwtPayload } from '@domain/interfaces/jwt-payload.interface';
import { User } from '@domain/entities/user';
import { APP_MESSAGES } from '@common/constants/messages.constant';
import { BaseResponseDto } from '@presentation/common/base-response.dto';
import { LoginResponseDto } from '@presentation/dtos/auth/login-response.dto';
import { UserResponseDto } from '@presentation/dtos/auth/user-response.dto';
import { RegisterDto } from '@presentation/dtos/auth/register.dto';
import { AdminRegisterDto } from '@presentation/dtos/auth/admin-register.dto';
import { MailService } from '@infrastructure/mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IRefreshTokenRepository')
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ──────────────────────────────────────────
  // 1. XÁC THỰC (dùng bởi LocalStrategy)
  // ──────────────────────────────────────────

  async validateUser(identifier: string, pass: string): Promise<User | null> {
    const user = await this.userRepository.findByIdentifier(identifier);
    if (user && user.password) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        return user;
      }
    }
    return null;
  }

  // ──────────────────────────────────────────
  // 2. ĐĂNG NHẬP – Cấp cả Access + Refresh Token
  // ──────────────────────────────────────────

  async login(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user,
      ipAddress,
      userAgent,
    );

    return {
      statusCode: 200,
      message: APP_MESSAGES.AUTH.LOGIN_SUCCESS,
      data: {
        accessToken,
        refreshToken,
        user: UserResponseDto.fromEntity(user),
      },
    };
  }

  // ──────────────────────────────────────────
  // 3. ĐĂNG KÝ
  // ──────────────────────────────────────────

  async register(dto: RegisterDto): Promise<BaseResponseDto<UserResponseDto>> {
    // Kiểm tra trùng lặp
    const existing = await this.userRepository.findByIdentifier(dto.phone);
    if (existing) {
      throw new BadRequestException(APP_MESSAGES.AUTH.EMAIL_OR_PHONE_EXISTS);
    }
    if (dto.email) {
      const existingEmail = await this.userRepository.findByIdentifier(
        dto.email,
      );
      if (existingEmail) {
        throw new BadRequestException(APP_MESSAGES.AUTH.EMAIL_OR_PHONE_EXISTS);
      }
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Tạo user mới
    const newUser = await this.userRepository.create({
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      password: hashedPassword,
      nationalId: dto.nationalId,
      dateOfBirth: new Date(dto.dateOfBirth),
      gender: dto.gender,
      provinceId: dto.provinceId,
      phoneVerified: false,
      emailVerified: false,
      nationalIdVerified: false,
      trustScore: 50,
      isVerified: false,
      isActive: true,
    });

    return {
      statusCode: 201,
      message: APP_MESSAGES.AUTH.REGISTER_SUCCESS,
      data: UserResponseDto.fromEntity(newUser),
    };
  }

  // ──────────────────────────────────────────
  // 3b. ĐĂNG KÝ CHO QUẢN TRỊ VIÊN
  // ──────────────────────────────────────────

  async adminRegister(
    dto: AdminRegisterDto,
    createdBy: number,
  ): Promise<BaseResponseDto<UserResponseDto>> {
    // Kiểm tra trùng lặp
    const existing = await this.userRepository.findByIdentifier(dto.phone);
    if (existing) {
      throw new BadRequestException(APP_MESSAGES.AUTH.EMAIL_OR_PHONE_EXISTS);
    }
    if (dto.email) {
      const existingEmail = await this.userRepository.findByIdentifier(
        dto.email,
      );
      if (existingEmail) {
        throw new BadRequestException(APP_MESSAGES.AUTH.EMAIL_OR_PHONE_EXISTS);
      }
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Tạo user mới với role được chỉ định
    const newUser = await this.userRepository.create({
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      password: hashedPassword,
      nationalId: dto.nationalId,
      dateOfBirth: new Date(dto.dateOfBirth),
      gender: dto.gender,
      provinceId: dto.provinceId,
      phoneVerified: false,
      emailVerified: false,
      nationalIdVerified: false,
      trustScore: 50,
      isVerified: true, // Admin đã verify
      isActive: true,
    });

    // Gán role cho user
    await this.userRepository.assignRole(
      newUser.id,
      dto.roleId,
      dto.provinceId,
      createdBy,
    );

    // Load lại user với relations để trả về đầy đủ
    const userWithRole = await this.userRepository.findById(newUser.id);

    return {
      statusCode: 201,
      message: APP_MESSAGES.AUTH.REGISTER_SUCCESS,
      data: UserResponseDto.fromEntity(userWithRole!),
    };
  }

  // ──────────────────────────────────────────
  // 4. CẤP LẠI TOKEN (Rotate Refresh Token)
  // ──────────────────────────────────────────

  async refresh(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<BaseResponseDto<{ accessToken: string; refreshToken: string }>> {
    const storedToken = await this.refreshTokenRepository.findByToken(token);

    if (!storedToken || !storedToken.isValid()) {
      throw new UnauthorizedException(APP_MESSAGES.AUTH.INVALID_REFRESH_TOKEN);
    }

    // Lấy thông tin user
    const user = await this.userRepository.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException(APP_MESSAGES.AUTH.USER_NOT_FOUND);
    }

    // Rotate: Revoke token cũ
    await this.refreshTokenRepository.update(storedToken.id, {
      isRevoked: true,
    });

    // Cấp cặp token mới
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user,
      ipAddress,
      userAgent,
    );

    return {
      statusCode: 200,
      message: APP_MESSAGES.AUTH.REFRESH_SUCCESS,
      data: { accessToken, refreshToken },
    };
  }

  // ──────────────────────────────────────────
  // 5. ĐĂNG XUẤT
  // ──────────────────────────────────────────

  async logout(token: string): Promise<BaseResponseDto<null>> {
    const storedToken = await this.refreshTokenRepository.findByToken(token);
    if (storedToken && !storedToken.isRevoked) {
      await this.refreshTokenRepository.update(storedToken.id, {
        isRevoked: true,
      });
    }

    return {
      statusCode: 200,
      message: APP_MESSAGES.AUTH.LOGOUT_SUCCESS,
      data: null,
    };
  }

  async forgotPassword(
    identifier: string,
  ): Promise<BaseResponseDto<{ resetToken: string }>> {
    const user = await this.userRepository.findByIdentifier(identifier);
    if (!user) {
      return {
        statusCode: 200,
        message: APP_MESSAGES.AUTH.OTP_SENT,
        data: { resetToken: randomUUID() },
      };
    }

    // Tạo mã OTP 6 số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút
    const resetToken = randomUUID();

    // Lưu vào database
    await this.userRepository.update(user.id, {
      passwordResetOtp: otp,
      passwordResetOtpExpires: otpExpires,
      passwordResetToken: resetToken,
    });

    // Gửi OTP qua Email
    if (user.email) {
      await this.mailService.sendOtpResetPassword(
        user.email,
        user.fullName,
        identifier,
        otp,
      );
    } else {
      // Fallback: log ra console khi chưa có email (dùng SĐT)
      this.logger.warn(
        `[DEV ONLY] OTP cho ${identifier}: ${otp} (hết hạn lúc ${otpExpires.toISOString()})`,
      );
    }

    return {
      statusCode: 200,
      message: APP_MESSAGES.AUTH.OTP_SENT,
      data: { resetToken },
    };
  }

  // ──────────────────────────────────────────
  // 7. ĐẶT LẠI MẬT KHẨU
  // ──────────────────────────────────────────

  async resetPassword(
    resetToken: string,
    otp: string,
    newPassword: string,
  ): Promise<BaseResponseDto<null>> {
    const user = await this.userRepository.findByResetToken(resetToken);

    if (
      !user ||
      !user.passwordResetOtp ||
      !user.passwordResetOtpExpires ||
      user.passwordResetOtp !== otp ||
      new Date() > user.passwordResetOtpExpires
    ) {
      throw new BadRequestException(APP_MESSAGES.AUTH.INVALID_OTP);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu và xóa sạch OTP để tránh dùng lại
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      passwordResetOtp: undefined,
      passwordResetOtpExpires: undefined,
      passwordResetToken: undefined,
    });

    // Thu hồi toàn bộ refresh token hiện có (bắt đăng nhập lại)
    await this.refreshTokenRepository.revokeAllByUserId(user.id);

    return {
      statusCode: 200,
      message: APP_MESSAGES.AUTH.RESET_PASSWORD_SUCCESS,
      data: null,
    };
  }

  // ──────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────

  private async generateTokenPair(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      provinceId: user.provinceId,
      email: user.email,
      roleId: user.getActiveRoleId(),
    };

    const accessToken = this.jwtService.sign(payload);

    // Refresh Token là UUID ngẫu nhiên, không chứa thông tin nhạy cảm
    const refreshToken = randomUUID();
    const refreshExpiresInDays = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_DAYS', '7'),
    );

    await this.refreshTokenRepository.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(
        Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000,
      ),
      isRevoked: false,
      ipAddress,
      userAgent,
    });

    return { accessToken, refreshToken };
  }
}
