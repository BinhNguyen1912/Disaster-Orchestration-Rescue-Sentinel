import { SosRequest } from '../../domain/entities/sos-request.entity';

// Kết quả điều phối từ strategy — chứa thông tin đội tốt nhất
// và danh sách ứng viên xếp hạng để Orchestrator dùng khi fallback.
export interface DispatchResult {
  // ID đội được chọn tốt nhất
  bestTeamId: number;
  // Score thấp nhất (penalty score — thấp = tốt)
  bestScore: number;
  // Danh sách ứng viên xếp hạng, tốt nhất đứng đầu
  rankedCandidates: RankedCandidate[];
  // Tổng số đội trong pool cuối cùng
  poolSize: number;
}

export interface RankedCandidate {
  teamId: number;
  score: number;
  distanceMeters: number;
  teamType: string;
  activeCasesCount: number;
}

export interface IDispatchStrategy {
  assignTeam(sosRequest: SosRequest): Promise<DispatchResult | null>;
}
