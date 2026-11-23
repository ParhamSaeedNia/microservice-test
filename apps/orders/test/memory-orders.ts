import { NotFoundException } from '@nestjs/common';
import type { OrderStatus } from '@market/contracts';
import type { OrderView } from '../src/orders/orders.schemas.js';
import { OrdersUnitOfWork, type OrdersTx, type OutboxWrite } from '../src/orders/orders.unit-of-work.js';

export class MemoryOrders extends OrdersUnitOfWork {
  readonly orders = new Map<string, OrderView>();
  readonly outbox: OutboxWrite[] = [];
  readonly processed = new Set<string>();
  commits = 0;

  async findById(id: string): Promise<OrderView | null> {
    const order = this.orders.get(id);
    return order ? { ...order } : null;
  }

  async commit<T>(work: (tx: OrdersTx) => Promise<T>): Promise<T> {
    const orders = new Map([...this.orders].map(([id, order]) => [id, { ...order }]));
    const outbox = this.outbox.map((row) => ({ ...row }));
    const processed = new Set(this.processed);
    try {
      const result = await work(this.tx());
      this.commits += 1;
      return result;
    } catch (error) {
      this.orders.clear();
      for (const [id, order] of orders) this.orders.set(id, order);
      this.outbox.splice(0, this.outbox.length, ...outbox);
      this.processed.clear();
      for (const eventId of processed) this.processed.add(eventId);
      throw error;
    }
  }

  private tx(): OrdersTx {
    return {
      insertOrder: async (order) => {
        this.orders.set(order.id, { ...order });
      },
      insertOutbox: async (event) => {
        this.outbox.push({ ...event });
      },
      findOrder: async (id) => {
        const order = this.orders.get(id);
        return order ? { ...order } : null;
      },
      updateStatus: async (id, status: OrderStatus) => {
        const order = this.orders.get(id);
        if (!order) throw new NotFoundException(`Order ${id} not found`);
        this.orders.set(id, { ...order, status });
      },
      isProcessed: async (eventId) => this.processed.has(eventId),
      markProcessed: async (eventId) => {
        this.processed.add(eventId);
      },
    };
  }
}
