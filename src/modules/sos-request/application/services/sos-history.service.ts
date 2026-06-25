import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SosStatusHistoryEntity,
  SosHistoryEventType,
} from '@infrastructure/database/entities/sos-status-history.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';

export interface RecordHistoryOptions {
  sosRequestId: number;
  eventType: SosHistoryEventType;
  fromStatus?: SosStatus | null;
  toStatus?: SosStatus | null;
  changedById?: number | null;
  teamId?: number | null;
  previousTeamId?: number | null;
  dispatchMethod?: DispatchMethod | null;
  note?: string | null;
}

@Injectable()
export class SosHistoryService {
  constructor(
    @InjectRepository(SosStatusHistoryEntity)
    private readonly historyRepo: Repository<SosStatusHistoryEntity>,
  ) {}

  async record(opts: RecordHistoryOptions): Promise<void> {
    try {
      const entry = this.historyRepo.create({
        sosRequestId: opts.sosRequestId,
        eventType: opts.eventType,
        fromStatus: opts.fromStatus ?? null,
        toStatus: opts.toStatus ?? null,
        changedById: opts.changedById ?? null,
        teamId: opts.teamId ?? null,
        previousTeamId: opts.previousTeamId ?? null,
        dispatchMethod: opts.dispatchMethod ?? null,
        note: opts.note ?? null,
      });
      await this.historyRepo.save(entry);
    } catch (err) {
      // Non-fatal: log and continue
      console.error('[SosHistoryService] Failed to record history entry:', err);
    }
  }

  async getHistory(sosRequestId: number): Promise<SosStatusHistoryEntity[]> {
    return this.historyRepo.find({
      where: { sosRequestId },
      relations: ['changedBy', 'team'],
      order: { createdAt: 'ASC' },
    });
  }
}
