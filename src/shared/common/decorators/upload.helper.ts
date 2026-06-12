import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export interface FileFilterOptions {
  maxSizeInMb?: number;
  allowedTypes?: string[];
}

export const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

export const createMulterOptions = (
  options: FileFilterOptions = {},
): MulterOptions => {
  const maxSize = (options.maxSizeInMb ?? 10) * 1024 * 1024;
  const allowedMimeTypes = options.allowedTypes ?? ALLOWED_MEDIA_TYPES;

  return {
    limits: {
      fileSize: maxSize,
    },
    fileFilter: (req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            `Định dạng tệp tin ${file.originalname} không được hỗ trợ. Chỉ hỗ trợ tải lên các định dạng hình ảnh (jpg, png, gif, webp) hoặc tài liệu PDF.`,
          ),
          false,
        );
      }
      callback(null, true);
    },
  };
};
