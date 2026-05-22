import { RescueTeamResponseDto } from './rescue-team-response.dto';
import { RescueTeamMemberResponseDto } from './rescue-team-member-response.dto';

export class RescueTeamDetailResponseDto extends RescueTeamResponseDto {
  members: RescueTeamMemberResponseDto[];
}
