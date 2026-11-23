import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { OrderStockState } from './decide-stock.js';

@Entity({ name: 'order_stock' })
export class OrderStockEntity {
  @PrimaryColumn({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'varchar', length: 64 })
  sku: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 32 })
  state: OrderStockState;
}
