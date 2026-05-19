import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import { JwtPayload } from '@domain/interfaces/jwt-payload.interface';
import { LoginDto } from '../../presentation/dtos/auth/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) { }

  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = await this.userRepository.findByIdentifier(identifier);
    if (user && user.password) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.identifier, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    const payload: JwtPayload = {
      sub: user.id,
      provinceId: user.provinceId,
    };

    return {
      statusCode: 200,
      message: 'Login successful',
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
