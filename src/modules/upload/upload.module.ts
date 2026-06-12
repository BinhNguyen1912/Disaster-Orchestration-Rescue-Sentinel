import { Module } from '@nestjs/common';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { UploadController } from './presentation/controllers/upload.controller';

@Module({
  imports: [StorageModule],
  controllers: [UploadController],
})
export class UploadModule {}
