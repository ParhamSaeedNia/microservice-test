import type { OrderStatus } from '@market/contracts';
import type { OrderView } from './orders.schemas.js';

export interface OutboxWrite {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: object;
}

export interface OrdersTx {
  insertOrder(order: OrderView): Promise<void>;
  insertOutbox(event: OutboxWrite): Promise<void>;
  findOrder(id: string): Promise<OrderView | null>;
  updateStatus(id: string, status: OrderStatus): Promise<void>;
  isProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export abstract class OrdersUnitOfWork {
  abstract findById(id: string): Promise<OrderView | null>;
  abstract commit<T>(work: (tx: OrdersTx) => Promise<T>): Promise<T>;
}
