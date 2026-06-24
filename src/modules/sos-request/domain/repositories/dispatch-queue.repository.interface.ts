import type { EntityManager } from 'typeorm';
import type { DispatchQueueEntity } from '@infrastructure/database/entities/dispatch-queue.entity';

export interface IDispatchQueueRepository {
  /**
   * Tìm ca tiếp theo đang xếp hàng cho đội cứ hộ, dùng SKIP LOCKED
   * để tránh tranh chấp với Cronjob Escalation.
   */
  findNextInQueue(
    teamId: number,
    manager: EntityManager,
  ): Promise<DispatchQueueEntity | null>;

  /**
   * Đếm số ca Dual Dispatch đang chạy của tỉnh — dùng FOR UPDATE
   * để lock tập kết quả trong transaction.
   */
  countDualDispatchByProvince(
    provinceId: number,
    manager: EntityManager,
  ): Promise<number>;

  createQueueEntry(
    data: Partial<DispatchQueueEntity>,
    manager: EntityManager,
  ): Promise<DispatchQueueEntity>;

  deleteById(id: number, manager: EntityManager): Promise<void>;

  //Tìm các bản ghi hàng đợi quá hạn (cho Cronjob Escalation).
  findExpiredEntries(
    timeoutSeconds: number,
    manager: EntityManager,
  ): Promise<DispatchQueueEntity[]>;
}
