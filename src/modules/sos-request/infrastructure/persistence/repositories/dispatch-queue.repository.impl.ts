import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, LessThan } from 'typeorm';
import { DispatchQueueEntity } from '@infrastructure/database/entities/dispatch-queue.entity';
import type { IDispatchQueueRepository } from '../../../domain/repositories/dispatch-queue.repository.interface';

@Injectable()
export class DispatchQueueRepositoryImpl implements IDispatchQueueRepository {
  constructor(
    @InjectRepository(DispatchQueueEntity)
    private readonly repo: Repository<DispatchQueueEntity>,
  ) {}

  async findNextInQueue(
    teamId: number,
    manager: EntityManager,
  ): Promise<DispatchQueueEntity | null> {
    const entry = await manager
      .createQueryBuilder(DispatchQueueEntity, 'dq')
      .where('dq.teamId = :teamId', { teamId })
      .orderBy('dq.priorityScore', 'DESC')
      .addOrderBy('dq.queuedAt', 'ASC')
      .setLock('pessimistic_write') //khóa bản ghi
      .setOnLocked('skip_locked') //nếu đang có team khác xử lý thì bỏ qua
      .getOne();

    return entry ?? null;
  }

  async countDualDispatchByProvince(
    provinceId: number,
    manager: EntityManager,
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder(DispatchQueueEntity, 'dq')
      .select('COUNT(*)', 'cnt')
      .where('dq.isDualDispatch = true')
      .andWhere('dq.provinceId = :provinceId', { provinceId })
      .setLock('pessimistic_write') //khóa bản ghi
      .getRawOne();

    return parseInt(result?.cnt ?? '0', 10);
  }

  async createQueueEntry(
    data: Partial<DispatchQueueEntity>,
    manager: EntityManager,
  ): Promise<DispatchQueueEntity> {
    const entry = manager.create(DispatchQueueEntity, data);
    return manager.save(entry);
  }

  async deleteById(id: number, manager: EntityManager): Promise<void> {
    await manager.delete(DispatchQueueEntity, id);
  }

  async findExpiredEntries(
    timeoutSeconds: number,
    manager: EntityManager,
  ): Promise<DispatchQueueEntity[]> {
    const cutoff = new Date(Date.now() - timeoutSeconds * 1000);

    return manager
      .createQueryBuilder(DispatchQueueEntity, 'dq')
      .where('dq.queuedAt < :cutoff', { cutoff })
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getMany();
  }
}
