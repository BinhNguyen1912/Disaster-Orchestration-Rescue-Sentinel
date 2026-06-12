import { Injectable, Inject } from '@nestjs/common';
import { IDispatchStrategy } from './dispatch.strategy.interface';
import { SosRequest } from '../../domain/entities/sos-request.entity';
import type { IRescueTeamRepository } from '../../../rescue-team/domain/repositories/rescue-team.repository.interface';

@Injectable()
export class DistanceBasedDispatchStrategy implements IDispatchStrategy {
  constructor(
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
  ) {}

  async assignTeam(sosRequest: SosRequest): Promise<number | null> {
    const { location, provinceId } = sosRequest;

    if (!location || !location.coordinates) {
      return null;
    }

    const [lng, lat] = location.coordinates;

    const nearestTeam = await this.teamRepo.findNearestAvailable(
      lat,
      lng,
      provinceId,
    );

    if (nearestTeam) {
      return nearestTeam.id;
    }

    return null;
  }
}
