import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'notifications' })
export class NotificationEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'command_id', type: 'uuid', unique: true })
  commandId: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'varchar', length: 64 })
  kind: string;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
