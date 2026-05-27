import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import * as Entities from './entities';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService
          .get<string>('DB_HOST', '172.19.0.2')
          .replace(/"/g, ''),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService
          .get<string>('DB_USER', 'postgres')
          .replace(/"/g, ''),
        password: configService
          .get<string>('DB_PASSWORD', '123123')
          .replace(/"/g, ''),
        database: configService
          .get<string>('DB_NAME', 'rescue_system')
          .replace(/"/g, ''),
        entities: Object.values(Entities),
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
