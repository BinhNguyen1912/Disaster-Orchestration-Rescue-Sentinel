import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { IUserService } from '../interfaces/user.service.interface';
import { User } from '../../domain/entities/user.entity';
import { Gender } from '@shared/core/enums/gender.enum';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: IUserService;
  let userRepo: jest.Mocked<IUserRepository>;

  const mockUser: User = {
    id: 1,
    provinceId: 1,
    fullName: 'Nguyễn Văn Test',
    nationalId: '123456789',
    nationalIdVerified: false,
    dateOfBirth: new Date('1990-01-01'),
    gender: Gender.MALE,
    phone: '0909123456',
    phoneVerified: false,
    email: 'test@example.com',
    emailVerified: false,
    trustScore: 0,
    isVerified: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepo = {
    findById: jest.fn(),
    findByPhone: jest.fn(),
    findByEmail: jest.fn(),
    findByNationalId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get('IUserRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockResult = {
        items: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockUserRepo.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll({}, { page: 1, limit: 20 });

      expect(result).toEqual(mockResult);
      expect(mockUserRepo.findAll).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 20 },
      );
    });

    it('should filter by provinceId', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockUserRepo.findAll.mockResolvedValue(mockResult);

      await service.findAll({ provinceId: 1 }, { page: 1, limit: 20 });

      expect(mockUserRepo.findAll).toHaveBeenCalledWith(
        { provinceId: 1 },
        { page: 1, limit: 20 },
      );
    });

    it('should filter by isActive', async () => {
      const mockResult = {
        items: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockUserRepo.findAll.mockResolvedValue(mockResult);

      await service.findAll({ isActive: true }, { page: 1, limit: 20 });

      expect(mockUserRepo.findAll).toHaveBeenCalledWith(
        { isActive: true },
        { page: 1, limit: 20 },
      );
    });

    it('should filter by search query', async () => {
      const mockResult = {
        items: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockUserRepo.findAll.mockResolvedValue(mockResult);

      await service.findAll({ search: 'nguyen' }, { page: 1, limit: 20 });

      expect(mockUserRepo.findAll).toHaveBeenCalledWith(
        { search: 'nguyen' },
        { page: 1, limit: 20 },
      );
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockUserRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile by userId', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result).toEqual(mockUser);
      expect(mockUserRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, fullName: 'Updated Name' };
      mockUserRepo.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(1, {
        fullName: 'Updated Name',
      });

      expect(result.fullName).toBe('Updated Name');
      expect(mockUserRepo.update).toHaveBeenCalledWith(1, {
        fullName: 'Updated Name',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.update.mockResolvedValue(null);

      await expect(
        service.updateProfile(999, { fullName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user and check phone conflict', async () => {
      const otherUser = { ...mockUser, id: 2, phone: '0909999999' };
      const updatedUser = { ...mockUser, phone: '0909999999' };
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.findByPhone.mockResolvedValue(otherUser);

      await expect(service.update(1, { phone: '0909999999' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update user and check email conflict', async () => {
      const otherUser = { ...mockUser, id: 2, email: 'other@example.com' };
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.findByEmail.mockResolvedValue(otherUser);

      await expect(
        service.update(1, { email: 'other@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow update when no conflict', async () => {
      const updatedUser = { ...mockUser, fullName: 'New Name' };
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.findByPhone.mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.update.mockResolvedValue(updatedUser);

      const result = await service.update(1, { fullName: 'New Name' });

      expect(result.fullName).toBe('New Name');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.update(999, { fullName: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete user successfully', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.softDelete.mockResolvedValue(true);

      await service.delete(1);

      expect(mockUserRepo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should activate user', async () => {
      const activeUser = { ...mockUser, isActive: true };
      mockUserRepo.findById.mockResolvedValue({ ...mockUser, isActive: false });
      mockUserRepo.update.mockResolvedValue(activeUser);

      const result = await service.updateStatus(1, true);

      expect(result.isActive).toBe(true);
      expect(mockUserRepo.update).toHaveBeenCalledWith(1, { isActive: true });
    });

    it('should deactivate user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepo.findById.mockResolvedValue({ ...mockUser, isActive: true });
      mockUserRepo.update.mockResolvedValue(inactiveUser);

      const result = await service.updateStatus(1, false);

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.updateStatus(999, true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('should throw BadRequestException when current password is incorrect', async () => {
      const userWithPassword = { ...mockUser, password: 'hashedOldPassword' };
      mockUserRepo.findById.mockResolvedValue(userWithPassword);

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        service.changePassword(1, {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should change password successfully when current password is correct', async () => {
      const userWithPassword = { ...mockUser, password: 'hashedOldPassword' };
      mockUserRepo.findById.mockResolvedValue(userWithPassword);
      mockUserRepo.update.mockResolvedValue(userWithPassword);

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedNewPassword');

      await service.changePassword(1, {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      });

      expect(mockUserRepo.update).toHaveBeenCalledWith(1, {
        password: 'hashedNewPassword',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(999, { newPassword: 'newPassword123' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    it('should return search results', async () => {
      const searchResults = [mockUser];
      mockUserRepo.search.mockResolvedValue(searchResults);

      const result = await service.search('nguyen');

      expect(result).toEqual(searchResults);
      expect(mockUserRepo.search).toHaveBeenCalledWith('nguyen');
    });

    it('should return empty array when no results', async () => {
      mockUserRepo.search.mockResolvedValue([]);

      const result = await service.search('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
