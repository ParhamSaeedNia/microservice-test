import type { NotificationCommand } from '@market/contracts';
import type { NotificationView } from './notifications.schemas.js';

export abstract class NotificationsRepository {
  abstract save(command: NotificationCommand): Promise<NotificationView>;
  abstract findByCustomer(customerId: string): Promise<NotificationView[]>;
}
