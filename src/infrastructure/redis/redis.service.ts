import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );
    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Connecting to Redis...');
    });

    this.client.on('ready', () => {
      this.logger.log('✅ Redis client is ready and connected');
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('🔌 Redis client disconnected');
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  // Wrapper for HSET
  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hSet(key, field, value);
  }

  // Wrapper for HSET multiple fields
  async hsetAll(key: string, data: Record<string, string>): Promise<number> {
    return await this.client.hSet(key, data);
  }

  // Wrapper for HINCRBY
  async hincrby(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    return await this.client.hIncrBy(key, field, increment);
  }

  // Wrapper for HGETALL
  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  // Wrapper for HGET
  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hGet(key, field);
  }
}
