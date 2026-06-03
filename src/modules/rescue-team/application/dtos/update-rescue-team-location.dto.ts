export interface UpdateRescueTeamLocationDto {
  currentLocation: { type: 'Point'; coordinates: [number, number] };
  status?: string;
}
