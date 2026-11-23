import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'stock' })
export class StockEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  sku: string;

  @Column({ name: 'on_hand', type: 'int' })
  onHand: number;
}
