import { Message } from './message';
import { User } from './user';

export class MessageRead {
  messageId: number;
  userId: number;
  readAt: Date;
  message: Message;
  user: User;
}
