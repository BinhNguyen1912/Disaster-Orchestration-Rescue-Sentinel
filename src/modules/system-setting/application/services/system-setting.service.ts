import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SystemSettingEntity,
  SystemCategoryEntity,
} from '@infrastructure/database/entities';

@Injectable()
export class SystemSettingService {
  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly settingRepo: Repository<SystemSettingEntity>,

    @InjectRepository(SystemCategoryEntity)
    private readonly categoryRepo: Repository<SystemCategoryEntity>,
  ) {}

  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await this.settingRepo.find();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    return settingsMap;
  }

  async updateSettings(payload: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(payload)) {
      const setting = await this.settingRepo.findOne({ where: { key } });
      if (setting) {
        setting.value = String(value);
        await this.settingRepo.save(setting);
      } else {
        // Create dynamic setting if it doesn't exist
        const newSetting = new SystemSettingEntity();
        newSetting.key = key;
        newSetting.value = String(value);

        // Infer group from key prefix
        const parts = key.split('.');
        newSetting.group = parts[0] || 'general';

        await this.settingRepo.save(newSetting);
      }
    }
  }

  async getCategories(type: string): Promise<SystemCategoryEntity[]> {
    return this.categoryRepo.find({
      where: { type, isActive: true },
      order: { orderIndex: 'ASC', name: 'ASC' },
    });
  }

  async addCategory(
    type: string,
    code: string,
    name: string,
  ): Promise<SystemCategoryEntity> {
    const upperCode = code.toUpperCase().trim();
    const existing = await this.categoryRepo.findOne({
      where: { code: upperCode },
    });
    if (existing) {
      throw new BadRequestException('Mã danh mục này đã tồn tại!');
    }

    const newCategory = new SystemCategoryEntity();
    newCategory.type = type;
    newCategory.code = upperCode;
    newCategory.name = name.trim();
    newCategory.isActive = true;

    // Auto-calculate orderIndex
    const maxOrder = await this.categoryRepo.maximum('orderIndex', { type });
    newCategory.orderIndex = (maxOrder || 0) + 1;

    return this.categoryRepo.save(newCategory);
  }

  async deleteCategory(code: string): Promise<void> {
    const category = await this.categoryRepo.findOne({ where: { code } });
    if (!category) {
      throw new BadRequestException('Không tìm thấy danh mục cần xóa!');
    }
    await this.categoryRepo.remove(category);
  }
}
