import { Injectable } from '@nestjs/common';
import {
  orderCancelledEventSchema,
  orderPlacedEventSchema,
  reservationFailedEventSchema,
  stockReservedEventSchema,
  topics,
  type OrderCancelledEvent,
  type OrderPlacedEvent,
} from '@market/contracts';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { bindEvent, metrics } from '../observability.js';
import { decideStock, type OrderStock } from './decide-stock.js';
import { EventPublisher } from './event-publisher.js';
import { ReservationUnitOfWork, type PendingPublish, type ReservationTx } from './reservation.unit-of-work.js';

type OrderEvent = OrderPlacedEvent | OrderCancelledEvent;

@Injectable()
export class ReservationHandler {
  constructor(
    private readonly reservations: ReservationUnitOfWork,
    private readonly publisher: EventPublisher,
  ) {}

  async handle(raw: unknown): Promise<void> {
    const parsed = z.union([orderPlacedEventSchema, orderCancelledEventSchema]).safeParse(raw);
    if (!parsed.success) return;
    const event = parsed.data;
    return bindEvent(event, async () => {
      metrics.kafka.inc({ service: metrics.service, topic: event.eventType });
      const pending = await this.reservations.commit((tx) => this.apply(tx, event));
      if (!pending) return;
      await this.publisher.publish(pending.topic, pending.payload);
      await this.reservations.markPublished(pending.eventId);
    });
  }

  private async apply(tx: ReservationTx, event: OrderEvent): Promise<PendingPublish | null> {
    const existing = await tx.unpublished(event.eventId);
    if (await tx.isProcessed(event.eventId)) return existing;

    const order = await tx.findOrder(event.data.orderId);
    const onHand = await tx.onHand(event.data.sku);
    let decision = decideStock({
      eventType: event.eventType,
      order,
      onHand,
      quantity: event.data.quantity,
    });
    if (decision === 'reserve') {
      const decremented = await tx.decrementIfEnough(event.data.sku, event.data.quantity);
      if (!decremented) decision = 'reject';
    }

    const pending = await this.persist(tx, event, decision, order);
    await tx.markProcessed(event.eventId);
    return pending;
  }

  private async persist(
    tx: ReservationTx,
    event: OrderEvent,
    decision: ReturnType<typeof decideStock>,
    current: OrderStock | null,
  ): Promise<PendingPublish | null> {
    if (decision === 'reserve') {
      await tx.saveOrder({
        orderId: event.data.orderId,
        sku: event.data.sku,
        quantity: event.data.quantity,
        state: 'reserved',
      });
      const pending = publishRow(event, topics.stockReserved);
      await tx.savePending(pending);
      return pending;
    }
    if (decision === 'reject') {
      await tx.saveOrder({
        orderId: event.data.orderId,
        sku: event.data.sku,
        quantity: event.data.quantity,
        state: 'rejected',
      });
      const pending = publishRow(event, topics.reservationFailed);
      await tx.savePending(pending);
      return pending;
    }
    if (decision === 'release' && current) {
      await tx.increment(current.sku, current.quantity);
      await tx.saveOrder({ ...current, state: 'released' });
      return null;
    }
    if (decision === 'remember-cancel') {
      await tx.saveOrder({
        orderId: event.data.orderId,
        sku: event.data.sku,
        quantity: event.data.quantity,
        state: 'cancel_pending',
      });
    }
    return null;
  }
}

function publishRow(event: OrderEvent, topic: string): PendingPublish {
  const shared = {
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    aggregateId: event.data.orderId,
    data: {
      orderId: event.data.orderId,
      sku: event.data.sku,
      quantity: event.data.quantity,
      customerId: event.data.customerId,
    },
  };
  const payload =
    topic === topics.stockReserved
      ? stockReservedEventSchema.parse({ ...shared, eventType: topics.stockReserved })
      : reservationFailedEventSchema.parse({
          ...shared,
          eventType: topics.reservationFailed,
          data: { ...shared.data, reason: 'insufficient_stock' },
        });
  return { eventId: event.eventId, topic, payload };
}
