import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'outbox' })
export class OutboxEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'aggregate_type', type: 'text' })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'text' })
  aggregateId: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: object;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
