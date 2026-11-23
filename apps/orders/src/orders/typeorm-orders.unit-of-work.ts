import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { OrderEntity } from './order.entity.js';
import { OutboxEntity } from './outbox.entity.js';
import { ProcessedEventEntity } from './processed-event.entity.js';
import { OrdersUnitOfWork, type OrdersTx, type OutboxWrite } from './orders.unit-of-work.js';
import type { OrderView } from './orders.schemas.js';
import type { OrderStatus } from '@market/contracts';

@Injectable()
export class TypeOrmOrdersUnitOfWork extends OrdersUnitOfWork {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async findById(id: string): Promise<OrderView | null> {
    const row = await this.dataSource.getRepository(OrderEntity).findOneBy({ id });
    return row ? toView(row) : null;
  }

  async commit<T>(work: (tx: OrdersTx) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(OrderEntity);
      const outbox = manager.getRepository(OutboxEntity);
      const processed = manager.getRepository(ProcessedEventEntity);
      return work({
        insertOrder: async (order) => {
          await orders.insert({
            id: order.id,
            sku: order.sku,
            quantity: order.quantity,
            unitPrice: order.unitPrice,
            customerId: order.customerId,
            status: order.status,
          });
        },
        insertOutbox: async (event: OutboxWrite) => {
          await outbox.insert({
            id: event.id,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            payload: event.payload,
          });
        },
        findOrder: async (id) => {
          const row = await orders.findOneBy({ id });
          return row ? toView(row) : null;
        },
        updateStatus: async (id, status: OrderStatus) => {
          const result = await orders.update({ id }, { status });
          if (!result.affected) throw new NotFoundException(`Order ${id} not found`);
        },
        isProcessed: async (eventId) => {
          const row = await processed.findOneBy({ eventId });
          return row !== null;
        },
        markProcessed: async (eventId) => {
          await processed.query(`INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`, [eventId]);
        },
      });
    });
  }
}

function toView(row: OrderEntity): OrderView {
  return {
    id: row.id,
    sku: row.sku,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    customerId: row.customerId,
    status: row.status,
  };
}
