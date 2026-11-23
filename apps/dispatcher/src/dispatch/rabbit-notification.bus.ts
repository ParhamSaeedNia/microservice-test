import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { NotificationCommand } from '@market/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { queues } from '@market/contracts';
import { NotificationBus } from './notification-bus.js';

export const NOTIFICATIONS_BUS = 'NOTIFICATIONS_BUS';

@Injectable()
export class RabbitNotificationBus extends NotificationBus implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(NOTIFICATIONS_BUS) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async send(command: NotificationCommand): Promise<void> {
    await lastValueFrom(this.client.emit(queues.notificationsSend, command), { defaultValue: undefined });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
