import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'pending_publishes' })
export class PendingPublishEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ type: 'text' })
  topic: string;

  @Column({ type: 'jsonb' })
  payload: object;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;
}
