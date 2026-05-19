import { AdministrativeUnit } from './administrative-unit';
import { User } from './user';
import { Role } from './role';
import { UserRole } from './user-role';
import { HouseholdProfile } from './household-profile';
import { RescueTeam } from './rescue-team';
import { DutyLog } from './duty-log';
import { TeamAchievement } from './team-achievement';
import { SosRequest } from './sos-request';
import { FloodReport } from './flood-report';
import { Casualty } from './casualty';
import { DisasterEvent } from './disaster-event';
import { Donation } from './donation';
import { DonationCampaign } from './donation-campaign';
import { Message } from './message';
import { FloodZone } from './flood-zone';
import { InfrastructureLayer } from './infrastructure-layer';
import { WeatherAlert } from './weather-alert';
import { IotDevice } from './iot-device';
import { AuditLog } from './audit-log';

export class Province {
  id: number;
  code: number;
  name: string;
  shortName?: string;
  // Tọa độ điểm trung tâm (Centroid/Point) của tỉnh để định vị nhanh trên bản đồ
  boundary?: any // geometry; 
  centerPoint?: any // geometry;
  isActive: boolean;
  createdAt: Date;
  onboardedAt?: Date;  // Thời gian tỉnh này chính thức được số hóa/tích hợp vào hệ thống cứu hộ
  metadata?: any;
  administrativeUnits: AdministrativeUnit[]; // Danh sách các Quận/Huyện, Phường/Xã thuộc tỉnh này
  users: User[];
  roles: Role[];
  userRoles: UserRole[]; // Bảng trung gian quản lý việc gán vai trò cho người dùng trong tỉnh
  // Danh sách hồ sơ hộ gia đình sinh sống tại tỉnh (để quản lý nhân khẩu, hỗ trợ)
  householdProfiles: HouseholdProfile[];
  // Đội cứu hộ thuộc tỉnh
  rescueTeams: RescueTeam[];
  // Nhật ký hoạt động của các đội cứu hộ trong tỉnh
  dutyLogs: DutyLog[];
  // Thành tích của các đội cứu hộ trong tỉnh
  teamAchievements: TeamAchievement[];
  // Yêu cầu cứu hộ trong tỉnh
  sosRequests: SosRequest[];
  // Báo cáo lũ lụt trong tỉnh
  floodReports: FloodReport[];
  // Nạn nhân/Người gặp nạn trong tỉnh
  casualties: Casualty[];
  // Sự kiện thiên tai trong tỉnh
  disasterEvents: DisasterEvent[];
  // Các khoản tiền/nhu yếu phẩm tài trợ được gửi đến tỉnh này
  donations: Donation[];
  donationCampaigns: DonationCampaign[];// Các chiến dịch kêu gọi quyên góp, cứu trợ đang hướng về tỉnh này
  // Lịch sử giao tiếp và trao đổi thông tin
  messages: Message[];
  // Khu vực ngập lụt trong tỉnh
  floodZones: FloodZone[];
  // Hạ tầng quan trọng cần giám sát (đê, trạm bơm, cầu...)
  infrastructureLayers: InfrastructureLayer[];
  // Cảnh báo thời tiết trong tỉnh
  weatherAlerts: WeatherAlert[];
  // Các thiết bị IoT được triển khai tại tỉnh , (ví dụ: trạm đo mưa tự động, camera giám sát mực nước)
  iotDevices: IotDevice[];
  // Lịch sử truy cập/hành động của người dùng trong hệ thống tại tỉnh này  
  auditLogs: AuditLog[];
}
