import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { OrderStatus } from '@market/contracts';

@Entity({ name: 'orders' })
export class OrderEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  sku: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ type: 'varchar', length: 32 })
  status: OrderStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
