import { SosRequest } from '../../domain/entities/sos-request.entity';

export interface IDispatchStrategy {
  assignTeam(sosRequest: SosRequest): Promise<number | null>;
}
