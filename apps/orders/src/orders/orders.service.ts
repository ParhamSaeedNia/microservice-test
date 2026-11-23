import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  orderCancelledEventSchema,
  orderPlacedEventSchema,
  reservationFailedEventSchema,
  stockReservedEventSchema,
  topics,
} from '@market/contracts';
import { randomUUID } from 'node:crypto';
import { CatalogClient, ProductUnavailableError } from './catalog.client.js';
import { decideCancel, statusAfterInventory } from './order-status.js';
import { bindEvent, metrics } from '../observability.js';
import { z } from 'zod';
import { OrdersUnitOfWork } from './orders.unit-of-work.js';
import type { OrderView, PlaceOrder } from './orders.schemas.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrdersUnitOfWork,
    private readonly catalog: CatalogClient,
  ) {}

  async place(input: PlaceOrder): Promise<OrderView> {
    const product = await this.readProduct(input.sku);
    if (!product.published) throw new ConflictException(`Product ${input.sku} is not published`);

    const id = randomUUID();
    const order: OrderView = {
      id,
      sku: input.sku,
      quantity: input.quantity,
      unitPrice: product.price,
      customerId: input.customerId,
      status: 'placed',
    };
    const event = orderPlacedEventSchema.parse({
      eventId: randomUUID(),
      eventType: topics.orderPlaced,
      occurredAt: new Date().toISOString(),
      aggregateId: id,
      data: {
        orderId: id,
        sku: order.sku,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        customerId: order.customerId,
      },
    });

    await this.orders.commit(async (tx) => {
      await tx.insertOrder(order);
      await tx.insertOutbox({
        id: event.eventId,
        aggregateType: topics.orderPlaced,
        aggregateId: id,
        eventType: topics.orderPlaced,
        payload: event,
      });
    });
    metrics.outbox.inc({ service: metrics.service });
    return order;
  }

  async applyInventory(raw: unknown): Promise<void> {
    const parsed = z.union([stockReservedEventSchema, reservationFailedEventSchema]).safeParse(raw);
    if (!parsed.success) return;
    const event = parsed.data;
    return bindEvent(event, async () => {
      await this.orders.commit(async (tx) => {
        if (await tx.isProcessed(event.eventId)) return;
        const order = await tx.findOrder(event.data.orderId);
        if (!order) {
          await tx.markProcessed(event.eventId);
          return;
        }
        const next = statusAfterInventory(order.status, event.eventType);
        if (next !== order.status) await tx.updateStatus(order.id, next);
        await tx.markProcessed(event.eventId);
      });
      metrics.kafka.inc({ service: metrics.service, topic: event.eventType });
    });
  }

  async findOne(id: string): Promise<OrderView> {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async cancel(id: string): Promise<OrderView> {
    return this.orders.commit(async (tx) => {
      const order = await tx.findOrder(id);
      if (!order) throw new NotFoundException(`Order ${id} not found`);
      const decision = decideCancel(order.status);
      if (!decision.emit) throw new ConflictException('Order is already cancelled');
      await tx.updateStatus(id, decision.status);
      const event = orderCancelledEventSchema.parse({
        eventId: randomUUID(),
        eventType: topics.orderCancelled,
        occurredAt: new Date().toISOString(),
        aggregateId: id,
        data: {
          orderId: id,
          sku: order.sku,
          quantity: order.quantity,
          customerId: order.customerId,
        },
      });
      await tx.insertOutbox({
        id: event.eventId,
        aggregateType: topics.orderCancelled,
        aggregateId: id,
        eventType: topics.orderCancelled,
        payload: event,
      });
      metrics.outbox.inc({ service: metrics.service });
      return { ...order, status: decision.status };
    });
  }

  private async readProduct(sku: string) {
    try {
      return await this.catalog.getProduct(sku);
    } catch (error) {
      if (error instanceof ProductUnavailableError) throw new NotFoundException(`Product ${sku} not found`);
      throw error;
    }
  }
}
