import { Province } from './province';
import { User } from './user';
import { MessageRead } from './message-read';
import { MessageType } from '../enums/messageType.enum';
import { TargetType } from '../enums/targetType.enum';

export class Message {
  id: number;
  provinceId: number;
  senderId?: number;
  messageType: MessageType;
  channel: MessageChannel;
  title: string;
  content: string;
  imageUrl?: string;
  targetType: TargetType;
  targetId?: number;
  targetRoles: string;
  sentCount: number;
  readCount: number;
  sentAt?: Date;
  createdAt: Date;
  province: Province;
  sender?: User | null;
  reads: MessageRead[];
}
