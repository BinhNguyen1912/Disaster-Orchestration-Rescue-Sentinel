import { RescueTeam } from './rescue-team';
import { Province } from './province';
import { User } from './user';
import { AchievementCategory } from '../enums/achievementCategory.enum';

export class TeamAchievement {
  id: number;
  teamId: number;
  provinceId: number;
  title: string;
  description?: string;
  achievedAt: Date;
  awardedBy?: number;
  evidenceUrl?: string;
  category: AchievementCategory;
  team: RescueTeam;
  province: Province;
  awarder?: User | null;
}
