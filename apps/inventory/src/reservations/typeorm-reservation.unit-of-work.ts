import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import type { OrderStock, OrderStockState } from './decide-stock.js';
import { ReservationUnitOfWork, type PendingPublish, type ReservationTx } from './reservation.unit-of-work.js';

@Injectable()
export class TypeOrmReservationUnitOfWork extends ReservationUnitOfWork {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async commit<T>(work: (tx: ReservationTx) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => work(new SqlReservationTx(manager)));
  }

  async markPublished(eventId: string): Promise<void> {
    await this.dataSource.query(`UPDATE pending_publishes SET published_at = now() WHERE event_id = $1`, [eventId]);
  }
}

class SqlReservationTx implements ReservationTx {
  constructor(private readonly manager: EntityManager) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const rows: unknown[] = await this.manager.query(`SELECT 1 FROM processed_events WHERE event_id = $1`, [eventId]);
    return rows.length > 0;
  }

  async unpublished(eventId: string): Promise<PendingPublish | null> {
    const rows: Array<{ event_id: string; topic: string; payload: object }> = await this.manager.query(
      `SELECT event_id, topic, payload FROM pending_publishes WHERE event_id = $1 AND published_at IS NULL`,
      [eventId],
    );
    const row = rows[0];
    if (!row) return null;
    return { eventId: row.event_id, topic: row.topic, payload: row.payload };
  }

  async findOrder(orderId: string): Promise<OrderStock | null> {
    const rows: Array<{ order_id: string; sku: string; quantity: number; state: OrderStockState }> = await this.manager.query(
      `SELECT order_id, sku, quantity, state FROM order_stock WHERE order_id = $1`,
      [orderId],
    );
    const row = rows[0];
    if (!row) return null;
    return { orderId: row.order_id, sku: row.sku, quantity: row.quantity, state: row.state };
  }

  async onHand(sku: string): Promise<number | null> {
    const rows: Array<{ on_hand: number }> = await this.manager.query(`SELECT on_hand FROM stock WHERE sku = $1`, [sku]);
    return rows[0] ? rows[0].on_hand : null;
  }

  async decrementIfEnough(sku: string, quantity: number): Promise<boolean> {
    const rows: unknown[] = await this.manager.query(
      `UPDATE stock SET on_hand = on_hand - $1 WHERE sku = $2 AND on_hand >= $1 RETURNING on_hand`,
      [quantity, sku],
    );
    return rows.length > 0;
  }

  async increment(sku: string, quantity: number): Promise<void> {
    await this.manager.query(`UPDATE stock SET on_hand = on_hand + $1 WHERE sku = $2`, [quantity, sku]);
  }

  async saveOrder(order: OrderStock): Promise<void> {
    await this.manager.query(
      `INSERT INTO order_stock (order_id, sku, quantity, state) VALUES ($1, $2, $3, $4)
       ON CONFLICT (order_id) DO UPDATE SET sku = EXCLUDED.sku, quantity = EXCLUDED.quantity, state = EXCLUDED.state`,
      [order.orderId, order.sku, order.quantity, order.state],
    );
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.manager.query(`INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`, [eventId]);
  }

  async savePending(row: PendingPublish): Promise<void> {
    await this.manager.query(
      `INSERT INTO pending_publishes (event_id, topic, payload) VALUES ($1, $2, $3::jsonb) ON CONFLICT (event_id) DO NOTHING`,
      [row.eventId, row.topic, JSON.stringify(row.payload)],
    );
  }
}
