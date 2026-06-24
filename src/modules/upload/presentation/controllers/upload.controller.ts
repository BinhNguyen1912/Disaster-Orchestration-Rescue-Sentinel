import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '@shared/common/decorators/public.decorator';
import { StorageService } from '@infrastructure/storage/storage.service';
import { createMulterOptions } from '@shared/common/decorators/upload.helper';
import { APP_MESSAGES } from '@shared/index';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @ApiOperation({ summary: 'Upload single file to Cloudflare R2 (Public)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @Post('single')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', createMulterOptions({ maxSizeInMb: 10 })),
  )
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'general',
  ) {
    if (!file) {
      throw new BadRequestException(
        APP_MESSAGES.UPLOAD.UPLOAD_ERROR_SELECT_FILE,
      );
    }
    const url = await this.storageService.uploadFile(file, folder);
    return { url };
  }

  @ApiOperation({ summary: 'Upload multiple files to Cloudflare R2 (Public)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'List of files to upload',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @Post('multiple')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files', 10, createMulterOptions({ maxSizeInMb: 10 })),
  )
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string = 'general',
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        APP_MESSAGES.UPLOAD.UPLOAD_ERROR_SELECT_FILE,
      );
    }
    const urls = await this.storageService.uploadMultipleFiles(files, folder);
    return { urls };
  }
}
