import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    this.bucketName = this.configService.get<string>(
      'R2_BUCKET_NAME',
      'rescue-media',
    );

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Cấu hình Cloudflare R2 trong file .env bị thiếu! Hãy kiểm tra lại.',
      );
    }

    const configPublicUrl = this.configService.get<string>('R2_PUBLIC_URL');
    // Xử lý thông minh Public URL (CDN)
    this.publicUrl = configPublicUrl || `https://pub-${accountId}.r2.dev`;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    this.logger.log(
      `Initialized Cloudflare R2 Client for bucket: ${this.bucketName}`,
    );
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<string> {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileExt = path.extname(file.originalname);
    //Xóa dấu gạch chéo ở đầu và cuối chuỗi nếu có
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    //Tạo key với đường dẫn đầy đủ
    const key = `${cleanFolder}/${uniqueSuffix}${fileExt}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer, // Đọc trực tiếp dữ liệu thô từ bộ nhớ RAM
          ContentType: file.mimetype, // Truyền đúng định dạng file gốc
        }),
      );

      const fileUrl = `${this.publicUrl}/${key}`;
      this.logger.log(`Successfully uploaded file to R2: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      this.logger.error(
        `Failed to upload file to R2 at key ${key}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'general',
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }
}
