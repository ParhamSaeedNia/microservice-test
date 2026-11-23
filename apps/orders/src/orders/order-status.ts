import { topics, type OrderStatus } from '@market/contracts';

export function statusAfterInventory(status: OrderStatus, eventType: string): OrderStatus {
  if (status !== 'placed') return status;
  if (eventType === topics.stockReserved) return 'reserved';
  if (eventType === topics.reservationFailed) return 'rejected';
  return status;
}

export function decideCancel(status: OrderStatus): { status: OrderStatus; emit: boolean } {
  if (status === 'cancelled') return { status, emit: false };
  return { status: 'cancelled', emit: true };
}
