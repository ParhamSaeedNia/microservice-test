import { NotFoundException } from '@nestjs/common';
import { seedProducts } from '@market/contracts';
import { StockRepository } from './stock.repository.js';
import { StockService } from './stock.service.js';
import type { StockView } from './stock.schemas.js';

class MemoryStock extends StockRepository {
  readonly rows = new Map<string, StockView>();

  async findBySku(sku: string): Promise<StockView | null> {
    const row = this.rows.get(sku);
    return row ? { ...row } : null;
  }

  async insertIfAbsent(sku: string, onHand: number): Promise<void> {
    if (!this.rows.has(sku)) this.rows.set(sku, { sku, onHand });
  }

  async add(sku: string, quantity: number): Promise<StockView | null> {
    const row = this.rows.get(sku);
    if (!row) return null;
    const next = { sku, onHand: row.onHand + quantity };
    this.rows.set(sku, next);
    return { ...next };
  }
}

describe('StockService', () => {
  let service: StockService;

  beforeEach(() => {
    service = new StockService(new MemoryStock());
  });

  it('seeds 100 on hand and does not reset an existing row', async () => {
    await service.onModuleInit();
    expect(await service.get('mug')).toEqual({ sku: 'mug', onHand: 100 });
    await service.replenish('mug', 5);
    await service.onModuleInit();
    expect(await service.get('mug')).toEqual({ sku: 'mug', onHand: 105 });
    const skus = await Promise.all(seedProducts.map((product) => service.get(product.sku)));
    expect(skus).toHaveLength(3);
  });

  it('rejects replenish and get for an unknown sku', async () => {
    await expect(service.get('missing')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.replenish('missing', 1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
