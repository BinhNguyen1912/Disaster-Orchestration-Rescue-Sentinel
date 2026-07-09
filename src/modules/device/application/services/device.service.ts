import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceEntity } from '@infrastructure/database/entities/device.entity';
import { RefreshTokenEntity } from '@infrastructure/database/entities/refresh-token.entity';
import type { IDeviceRepository } from '../../domain/repositories/device.repository.interface';
import { IDeviceService } from '../interfaces/device.service.interface';
import { RegisterDeviceDto } from '../dtos/device.dto';

@Injectable()
export class DeviceService implements IDeviceService {
  constructor(
    @Inject('IDeviceRepository')
    private readonly deviceRepo: IDeviceRepository,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {}

  async registerDevice(userId: number, dto: RegisterDeviceDto): Promise<DeviceEntity> {
    const existing = await this.deviceRepo.findByDeviceId(dto.deviceId);
    
    if (existing) {
      return this.deviceRepo.update(existing.id, {
        userId,
        fcmToken: dto.fcmToken ?? existing.fcmToken,
        deviceType: dto.deviceType ?? existing.deviceType,
        deviceModel: dto.deviceModel ?? existing.deviceModel,
        osVersion: dto.osVersion ?? existing.osVersion,
        isActive: true,
        lastActiveAt: new Date(),
      }) as Promise<DeviceEntity>;
    }

    return this.deviceRepo.create({
      userId,
      deviceId: dto.deviceId,
      fcmToken: dto.fcmToken,
      deviceType: dto.deviceType,
      deviceModel: dto.deviceModel,
      osVersion: dto.osVersion,
      isActive: true,
    });
  }

  async getUserDevicesAndSessions(userId: number): Promise<any[]> {
    const devices = await this.deviceRepo.findByUserId(userId);
    const refreshTokens = await this.refreshTokenRepo.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' },
    });

    const mappedDevices = devices.map(d => ({
      id: d.id,
      key: `mobile-${d.id}`,
      type: 'MOBILE',
      name: d.deviceModel || 'Thiết bị di động',
      os: d.osVersion ? `${d.deviceType || 'Mobile'} (${d.osVersion})` : (d.deviceType || 'Mobile'),
      ipAddress: 'N/A',
      lastActiveAt: d.lastActiveAt || d.createdAt,
      isActive: d.isActive,
    }));

    const mappedWeb = refreshTokens.map(t => {
      let browserName = 'Trình duyệt Web';
      const ua = t.userAgent || '';
      if (ua.includes('Chrome')) browserName = 'Chrome Browser';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browserName = 'Safari Browser';
      else if (ua.includes('Firefox')) browserName = 'Firefox Browser';
      else if (ua.includes('Edge')) browserName = 'Edge Browser';

      let osName = 'Web Session';
      if (ua.includes('Windows')) osName = 'Windows';
      else if (ua.includes('Macintosh') || ua.includes('Mac OS')) osName = 'macOS';
      else if (ua.includes('Linux')) osName = 'Linux';
      else if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';
      else if (ua.includes('Android')) osName = 'Android';

      return {
        id: t.id,
        key: `web-${t.id}`,
        type: 'WEB',
        name: browserName,
        os: osName,
        ipAddress: t.ipAddress || 'Không xác định',
        lastActiveAt: t.createdAt,
        isActive: t.expiresAt > new Date(),
      };
    });

    return [...mappedWeb, ...mappedDevices];
  }

  async deleteDevice(id: number, userId: number): Promise<void> {
    const device = await this.deviceRepo.findById(id);
    if (!device) {
      throw new NotFoundException('Không tìm thấy thiết bị di động');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền gỡ thiết bị này');
    }
    await this.deviceRepo.delete(id);
  }

  async revokeSession(tokenId: number, userId: number): Promise<void> {
    const token = await this.refreshTokenRepo.findOne({ where: { id: tokenId } });
    if (!token) {
      throw new NotFoundException('Không tìm thấy phiên đăng nhập');
    }
    if (token.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thu hồi phiên đăng nhập này');
    }
    token.isRevoked = true;
    await this.refreshTokenRepo.save(token);
  }
}
