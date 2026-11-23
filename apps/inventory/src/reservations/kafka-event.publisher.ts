import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { EventPublisher } from './event-publisher.js';

export const INVENTORY_KAFKA = 'INVENTORY_KAFKA';

@Injectable()
export class KafkaEventPublisher extends EventPublisher implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(INVENTORY_KAFKA) private readonly client: ClientKafka) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async publish(topic: string, event: object): Promise<void> {
    await lastValueFrom(this.client.emit(topic, event), { defaultValue: undefined });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
