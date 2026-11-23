import type { OrderStock } from './decide-stock.js';

export interface PendingPublish {
  eventId: string;
  topic: string;
  payload: object;
}

export interface ReservationTx {
  isProcessed(eventId: string): Promise<boolean>;
  unpublished(eventId: string): Promise<PendingPublish | null>;
  findOrder(orderId: string): Promise<OrderStock | null>;
  onHand(sku: string): Promise<number | null>;
  decrementIfEnough(sku: string, quantity: number): Promise<boolean>;
  increment(sku: string, quantity: number): Promise<void>;
  saveOrder(order: OrderStock): Promise<void>;
  markProcessed(eventId: string): Promise<void>;
  savePending(row: PendingPublish): Promise<void>;
}

export abstract class ReservationUnitOfWork {
  abstract commit<T>(work: (tx: ReservationTx) => Promise<T>): Promise<T>;
  abstract markPublished(eventId: string): Promise<void>;
}
