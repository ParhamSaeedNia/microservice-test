import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'products' })
export class ProductEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  sku: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'boolean', default: true })
  published: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
