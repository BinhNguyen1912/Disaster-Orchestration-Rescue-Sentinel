import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RedisModule } from '../redis/redis.module';
import { GlobalCacheInterceptor } from './global-cache.interceptor';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalCacheInterceptor,
    },
  ],
})
export class CacheModule {}
