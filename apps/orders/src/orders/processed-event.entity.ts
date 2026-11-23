import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'processed_events' })
export class ProcessedEventEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'processed_at', type: 'timestamptz', default: () => 'now()' })
  processedAt: Date;
}
