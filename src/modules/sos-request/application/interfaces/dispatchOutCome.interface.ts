export interface DispatchOutcome {
  type:
    | 'dispatched'
    | 'dual_dispatched'
    | 'queued'
    | 'specialist_pending'
    | 'no_team';
  assignedTeamId?: number;
  secondTeamId?: number;
  etaIdealMinutes?: number;
  etaRealisticMinutes?: number;
  trafficDelayMinutes?: number;
  trafficNote?: string;
}
