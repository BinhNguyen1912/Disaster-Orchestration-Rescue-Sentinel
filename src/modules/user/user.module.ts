import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@infrastructure/database/entities/user.entity';
import { UserService } from './application/services/user.service';
import { UserController } from './presentation/controllers/user.controller';
import { UserRepositoryImpl } from './infrastructure/persistence/repositories/user.repository';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    WebSocketModule,
  ],

  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [UserService, 'IUserRepository'],
})
export class UserModule {}
