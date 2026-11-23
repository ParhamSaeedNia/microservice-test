import type { NotificationCommand } from '@market/contracts';

export abstract class NotificationBus {
  abstract send(command: NotificationCommand): Promise<void>;
}
