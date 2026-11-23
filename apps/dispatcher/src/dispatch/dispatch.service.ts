import { Injectable } from '@nestjs/common';
import {
  notificationCommandSchema,
  reservationFailedEventSchema,
  stockReservedEventSchema,
  topics,
  type NotificationCommand,
  type ReservationFailedEvent,
  type StockReservedEvent,
} from '@market/contracts';
import { z } from 'zod';
import { bindEvent, metrics } from '../observability.js';
import { NotificationBus } from './notification-bus.js';

type InventoryEvent = StockReservedEvent | ReservationFailedEvent;

@Injectable()
export class DispatchService {
  constructor(private readonly bus: NotificationBus) {}

  async dispatch(raw: unknown): Promise<void> {
    const parsed = z.union([stockReservedEventSchema, reservationFailedEventSchema]).safeParse(raw);
    if (!parsed.success) return;
    const event = parsed.data;
    await bindEvent(event, async () => {
      metrics.kafka.inc({ service: metrics.service, topic: event.eventType });
      await this.bus.send(toCommand(event));
    });
  }
}

export function toCommand(event: InventoryEvent): NotificationCommand {
  const reserved = event.eventType === topics.stockReserved;
  return notificationCommandSchema.parse({
    commandId: event.eventId,
    customerId: event.data.customerId,
    orderId: event.data.orderId,
    kind: reserved ? 'stock-reserved' : 'reservation-failed',
    message: reserved
      ? `Order ${event.data.orderId} reserved ${event.data.quantity} of ${event.data.sku}`
      : `Order ${event.data.orderId} could not reserve ${event.data.quantity} of ${event.data.sku}`,
  });
}
