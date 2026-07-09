export interface FloodRequestStatusHistory {
  id: number;
  floodRequestId: number;
  fromStatus?: string;
  toStatus: string;
  changedBy?: number | null;
  changedAt: Date;
  note?: string;
  sosId?: number | null;
  rescueTeamId?: number | null;
  floodRequest?: any;
  changer?: any;
  sos?: any;
  rescueTeam?: any;
}
