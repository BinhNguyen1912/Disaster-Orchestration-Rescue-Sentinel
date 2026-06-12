import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { StorageService } from '@infrastructure/storage/storage.service';

describe('UploadController', () => {
  let controller: UploadController;

  const mockStorageService = {
    uploadFile: jest.fn(),
    uploadMultipleFiles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadSingleFile', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('mock-file-data'),
      size: 1024,
    } as Express.Multer.File;

    it('should successfully upload a single file and return its URL', async () => {
      mockStorageService.uploadFile.mockResolvedValue(
        'https://cdn.rescue.vn/sos/test-image.jpg',
      );

      const result = await controller.uploadSingleFile(mockFile, 'sos');

      expect(result).toEqual({
        url: 'https://cdn.rescue.vn/sos/test-image.jpg',
      });
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'sos',
      );
    });

    it('should throw BadRequestException if no file is provided', async () => {
      await expect(
        controller.uploadSingleFile(undefined as any, 'sos'),
      ).rejects.toThrow(BadRequestException);
      expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('uploadMultipleFiles', () => {
    const mockFiles = [
      {
        fieldname: 'files',
        originalname: 'test1.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('file1'),
        size: 512,
      },
      {
        fieldname: 'files',
        originalname: 'test2.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from('file2'),
        size: 512,
      },
    ] as Express.Multer.File[];

    it('should successfully upload multiple files and return their URLs', async () => {
      mockStorageService.uploadMultipleFiles.mockResolvedValue([
        'https://cdn.rescue.vn/general/test1.png',
        'https://cdn.rescue.vn/general/test2.png',
      ]);

      const result = await controller.uploadMultipleFiles(mockFiles, 'general');

      expect(result).toEqual({
        urls: [
          'https://cdn.rescue.vn/general/test1.png',
          'https://cdn.rescue.vn/general/test2.png',
        ],
      });
      expect(mockStorageService.uploadMultipleFiles).toHaveBeenCalledWith(
        mockFiles,
        'general',
      );
    });

    it('should throw BadRequestException if files array is empty or undefined', async () => {
      await expect(
        controller.uploadMultipleFiles([], 'general'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.uploadMultipleFiles(undefined as any, 'general'),
      ).rejects.toThrow(BadRequestException);
      expect(mockStorageService.uploadMultipleFiles).not.toHaveBeenCalled();
    });
  });
});
