import type { StockView } from './stock.schemas.js';

export abstract class StockRepository {
  abstract findBySku(sku: string): Promise<StockView | null>;
  abstract insertIfAbsent(sku: string, onHand: number): Promise<void>;
  abstract add(sku: string, quantity: number): Promise<StockView | null>;
}
