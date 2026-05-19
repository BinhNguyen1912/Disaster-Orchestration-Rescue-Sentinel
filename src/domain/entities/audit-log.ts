import { Province } from './province';
import { User } from './user';

export class AuditLog {
  id: number;
  provinceId?: number;
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: Date;
  province?: Province | null;
  user?: User | null;
}
