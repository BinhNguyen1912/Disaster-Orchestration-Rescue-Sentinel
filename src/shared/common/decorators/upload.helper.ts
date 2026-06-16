import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { APP_MESSAGES } from '../constants/messages.constant';

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
            `${APP_MESSAGES.UPLOAD.UPLOAD_ERROR_FILE_TYPE} ${file.originalname}`,
          ),
          false,
        );
      }
      callback(null, true);
    },
  };
};
