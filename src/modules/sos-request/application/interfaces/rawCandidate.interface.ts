/** Candidate tạm trong pool — chưa chuẩn hóa */
export interface RawCandidate {
  teamId: number;
  teamType: string;
  distanceMeters: number;
  activeCasesCount: number;
  maxCapacity: number;
  name: string;
  lat?: number;
  lng?: number;
}
