import { Injectable } from '@nestjs/common';
import { notificationCommandSchema } from '@market/contracts';
import { bindEvent, metrics } from '../observability.js';
import { NotificationsRepository } from './notifications.repository.js';

export interface AckChannel {
  ack(message: object): void;
  nack(message: object, allUpTo: boolean, requeue: boolean): void;
}

@Injectable()
export class NotificationsHandler {
  constructor(private readonly notifications: NotificationsRepository) {}

  async handle(raw: unknown, channel: AckChannel, message: object): Promise<void> {
    metrics.rabbit.inc({ service: metrics.service });
    try {
      const command = notificationCommandSchema.parse(raw);
      await bindEvent({ eventId: command.commandId, eventType: command.kind }, () => this.notifications.save(command));
      metrics.sent.inc({ service: metrics.service, kind: command.kind });
      channel.ack(message);
    } catch (error) {
      channel.nack(message, false, false);
      throw error;
    }
  }
}
