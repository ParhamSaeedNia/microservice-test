import { topics } from '@market/contracts';

export type OrderStockState = 'reserved' | 'released' | 'rejected' | 'cancel_pending';

export interface OrderStock {
  orderId: string;
  sku: string;
  quantity: number;
  state: OrderStockState;
}

export type StockDecision = 'reserve' | 'reject' | 'release' | 'remember-cancel' | 'skip-reserve' | 'noop';

export function decideStock(input: {
  eventType: string;
  order: OrderStock | null;
  onHand: number | null;
  quantity: number;
}): StockDecision {
  if (input.eventType === topics.orderPlaced) {
    if (input.order?.state === 'cancel_pending') return 'skip-reserve';
    if (input.order) return 'noop';
    if (input.onHand === null || input.onHand < input.quantity) return 'reject';
    return 'reserve';
  }
  if (input.eventType === topics.orderCancelled) {
    if (input.order?.state === 'reserved') return 'release';
    if (!input.order) return 'remember-cancel';
    return 'noop';
  }
  return 'noop';
}
