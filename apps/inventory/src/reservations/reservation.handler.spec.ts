import { orderPlacedEventSchema, topics, type OrderPlacedEvent } from '@market/contracts';
import type { OrderStock } from './decide-stock.js';
import { EventPublisher } from './event-publisher.js';
import { ReservationHandler } from './reservation.handler.js';
import { ReservationUnitOfWork, type PendingPublish, type ReservationTx } from './reservation.unit-of-work.js';

const customerId = '11111111-1111-4111-8111-111111111111';

class MemoryReservations extends ReservationUnitOfWork {
  readonly onHandRows = new Map<string, number>([['mug', 5]]);
  readonly orders = new Map<string, OrderStock>();
  readonly processed = new Set<string>();
  readonly pending = new Map<string, PendingPublish & { published: boolean }>();

  async commit<T>(work: (tx: ReservationTx) => Promise<T>): Promise<T> {
    return work({
      isProcessed: async (eventId) => this.processed.has(eventId),
      unpublished: async (eventId) => {
        const row = this.pending.get(eventId);
        if (!row || row.published) return null;
        return { eventId: row.eventId, topic: row.topic, payload: row.payload };
      },
      findOrder: async (orderId) => this.orders.get(orderId) ?? null,
      onHand: async (sku) => this.onHandRows.get(sku) ?? null,
      decrementIfEnough: async (sku, quantity) => {
        const onHand = this.onHandRows.get(sku);
        if (onHand === undefined || onHand < quantity) return false;
        this.onHandRows.set(sku, onHand - quantity);
        return true;
      },
      increment: async (sku, quantity) => {
        this.onHandRows.set(sku, (this.onHandRows.get(sku) ?? 0) + quantity);
      },
      saveOrder: async (order) => {
        this.orders.set(order.orderId, { ...order });
      },
      markProcessed: async (eventId) => {
        this.processed.add(eventId);
      },
      savePending: async (row) => {
        this.pending.set(row.eventId, { ...row, published: false });
      },
    });
  }

  async markPublished(eventId: string): Promise<void> {
    const row = this.pending.get(eventId);
    if (row) row.published = true;
  }
}

class FakePublisher extends EventPublisher {
  readonly events: Array<{ topic: string; event: object }> = [];

  async publish(topic: string, event: object): Promise<void> {
    this.events.push({ topic, event });
  }
}

function placed(quantity: number, eventId = '33333333-3333-4333-8333-333333333333'): OrderPlacedEvent {
  return orderPlacedEventSchema.parse({
    eventId,
    eventType: topics.orderPlaced,
    occurredAt: new Date().toISOString(),
    aggregateId: '44444444-4444-4444-8444-444444444444',
    data: {
      orderId: '44444444-4444-4444-8444-444444444444',
      sku: 'mug',
      quantity,
      unitPrice: 1299,
      customerId,
    },
  });
}

describe('ReservationHandler', () => {
  let store: MemoryReservations;
  let publisher: FakePublisher;
  let handler: ReservationHandler;

  beforeEach(() => {
    store = new MemoryReservations();
    publisher = new FakePublisher();
    handler = new ReservationHandler(store, publisher);
  });

  it('decrements on hand once and publishes stock-reserved', async () => {
    const event = placed(2);
    await handler.handle(event);
    await handler.handle(event);
    expect(store.onHandRows.get('mug')).toBe(3);
    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]?.topic).toBe(topics.stockReserved);
    expect(publisher.events[0]?.event).toMatchObject({
      eventType: topics.stockReserved,
      data: { sku: 'mug', quantity: 2, customerId },
    });
  });

  it('does not decrement when the quantity is greater than on hand', async () => {
    await handler.handle(placed(6));
    expect(store.onHandRows.get('mug')).toBe(5);
    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]?.topic).toBe(topics.reservationFailed);
    expect(publisher.events[0]?.event).toMatchObject({
      data: { reason: 'insufficient_stock', quantity: 6 },
    });
  });

  it('does not reserve twice for the same event id', async () => {
    const event = placed(1);
    await handler.handle(event);
    await handler.handle({ ...event });
    expect(store.onHandRows.get('mug')).toBe(4);
    expect(publisher.events).toHaveLength(1);
    expect(store.processed.size).toBe(1);
  });
});
