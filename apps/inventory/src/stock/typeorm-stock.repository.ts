import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { StockEntity } from './stock.entity.js';
import { StockRepository } from './stock.repository.js';
import type { StockView } from './stock.schemas.js';

@Injectable()
export class TypeOrmStockRepository extends StockRepository {
  constructor(@InjectRepository(StockEntity) private readonly stock: Repository<StockEntity>) {
    super();
  }

  async findBySku(sku: string): Promise<StockView | null> {
    const row = await this.stock.findOneBy({ sku });
    return row ? { sku: row.sku, onHand: row.onHand } : null;
  }

  async insertIfAbsent(sku: string, onHand: number): Promise<void> {
    await this.stock.query(`INSERT INTO stock (sku, on_hand) VALUES ($1, $2) ON CONFLICT (sku) DO NOTHING`, [sku, onHand]);
  }

  async add(sku: string, quantity: number): Promise<StockView | null> {
    const rows: Array<{ sku: string; on_hand: number }> = await this.stock.query(
      `UPDATE stock SET on_hand = on_hand + $1 WHERE sku = $2 RETURNING sku, on_hand`,
      [quantity, sku],
    );
    const row = rows[0];
    if (!row) return null;
    return { sku: row.sku, onHand: row.on_hand };
  }
}
