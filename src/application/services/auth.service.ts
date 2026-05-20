import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import { JwtPayload } from '@domain/interfaces/jwt-payload.interface';
import { APP_MESSAGES } from '@common/constants/messages.constant';
import { LoginDto } from '@presentation/dtos/auth/login.dto';
import { BaseResponseDto } from '@presentation/common/base-response.dto';
import { LoginResponseDto } from '@presentation/dtos/auth/login-response.dto';
import { User } from '@domain/entities/user';

@Injectable()
export class AuthService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

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

  async login(user: User): Promise<BaseResponseDto<LoginResponseDto>> {
    const payload: JwtPayload = {
      sub: user.id,
      provinceId: user.provinceId,
      email: user.email,
      roleId: user.getActiveRoleId(),
    };

    return {
      statusCode: 200,
      message: APP_MESSAGES.AUTH.LOGIN_SUCCESS,
      data: {
        accessToken: this.jwtService.sign(payload),
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          provinceId: user.provinceId,
        },
      },
    };
  }
}
