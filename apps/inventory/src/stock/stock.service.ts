import { Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { seedProducts } from '@market/contracts';
import { StockRepository } from './stock.repository.js';
import type { StockView } from './stock.schemas.js';

@Injectable()
export class StockService implements OnModuleInit {
  constructor(private readonly stock: StockRepository) {}

  async onModuleInit(): Promise<void> {
    for (const product of seedProducts) {
      await this.stock.insertIfAbsent(product.sku, 100);
    }
  }

  async get(sku: string): Promise<StockView> {
    const row = await this.stock.findBySku(sku);
    if (!row) throw new NotFoundException(`Stock for ${sku} not found`);
    return row;
  }

  async replenish(sku: string, quantity: number): Promise<StockView> {
    const row = await this.stock.add(sku, quantity);
    if (!row) throw new NotFoundException(`Stock for ${sku} not found`);
    return row;
  }
}
