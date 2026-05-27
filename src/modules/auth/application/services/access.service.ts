import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccessService {
  constructor(private readonly configService: ConfigService) {}

  validateApiKey(apiKey: string): boolean {
    const configuredApiKey = this.configService.get<string>('API_KEY');
    if (!configuredApiKey) {
      return false;
    }
    return apiKey === configuredApiKey;
  }
}
