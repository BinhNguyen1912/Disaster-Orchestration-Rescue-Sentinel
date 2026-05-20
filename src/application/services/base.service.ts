import { NotFoundException } from '@nestjs/common';
import { IBaseRepository } from '../../domain/repositories/base.repository.interface';

export abstract class BaseService<T> {
  constructor(protected readonly repository: IBaseRepository<T>) {}

  /**
   * Tên của entity dùng để hiển thị lỗi (ví dụ: 'User', 'RescueTeam').
   */
  protected abstract get entityName(): string;

  async findAll(options?: any): Promise<T[]> {
    return this.repository.findAll(options);
  }

  async findAndCount(options?: any): Promise<[T[], number]> {
    return this.repository.findAndCount(options);
  }

  async findById(id: number | string): Promise<T> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} with id ${id} not found`);
    }
    return entity;
  }

  async create(data: Partial<T>): Promise<T> {
    return this.repository.create(data);
  }

  async update(id: number | string, data: Partial<T>): Promise<T> {
    await this.findById(id);

    const updatedEntity = await this.repository.update(id, data);
    if (!updatedEntity) {
      throw new NotFoundException(
        `${this.entityName} with id ${id} not found after update attempt`,
      );
    }
    return updatedEntity;
  }

  async delete(id: number | string): Promise<boolean> {
    await this.findById(id);

    const isDeleted = await this.repository.delete(id);
    if (!isDeleted) {
      throw new NotFoundException(
        `Could not delete ${this.entityName} with id ${id}`,
      );
    }
    return true;
  }
}
