import { ConflictException, NotFoundException } from '@nestjs/common';
import { stockReservedEventSchema, topics } from '@market/contracts';
import { CatalogClient, ProductUnavailableError } from './catalog.client.js';
import { OrdersService } from './orders.service.js';
import type { CatalogProduct } from './orders.schemas.js';
import { MemoryOrders } from '../../test/memory-orders.js';

const customerId = '11111111-1111-4111-8111-111111111111';

class FakeCatalog extends CatalogClient {
  constructor(private readonly products: Map<string, CatalogProduct>) {
    super({ getOrThrow: () => 'http://catalog.test' } as never);
  }

  override async getProduct(sku: string): Promise<CatalogProduct> {
    const product = this.products.get(sku);
    if (!product) throw new ProductUnavailableError(sku);
    return product;
  }
}

describe('OrdersService', () => {
  let orders: MemoryOrders;
  let catalog: FakeCatalog;
  let service: OrdersService;

  beforeEach(() => {
    orders = new MemoryOrders();
    catalog = new FakeCatalog(
      new Map([
        ['mug', { sku: 'mug', name: 'Ceramic mug', price: 1299, published: true }],
        ['draft', { sku: 'draft', name: 'Draft', price: 500, published: false }],
      ]),
    );
    service = new OrdersService(orders, catalog);
  });

  it('writes the order and the outbox row in one transaction', async () => {
    const order = await service.place({ sku: 'mug', quantity: 2, customerId });
    expect(order).toMatchObject({ sku: 'mug', quantity: 2, unitPrice: 1299, status: 'placed', customerId });
    expect(orders.commits).toBe(1);
    expect(orders.orders.get(order.id)?.status).toBe('placed');
    expect(orders.outbox).toHaveLength(1);
    expect(orders.outbox[0]).toMatchObject({
      aggregateType: topics.orderPlaced,
      aggregateId: order.id,
      eventType: topics.orderPlaced,
    });
    expect(orders.outbox[0]?.payload).toMatchObject({
      eventType: topics.orderPlaced,
      data: { orderId: order.id, unitPrice: 1299, quantity: 2, customerId },
    });
  });

  it('does not write when the sku is unknown', async () => {
    await expect(service.place({ sku: 'missing', quantity: 1, customerId })).rejects.toBeInstanceOf(NotFoundException);
    expect(orders.commits).toBe(0);
    expect(orders.outbox).toHaveLength(0);
    expect(orders.orders.size).toBe(0);
  });

  it('does not write when the product is unpublished', async () => {
    await expect(service.place({ sku: 'draft', quantity: 1, customerId })).rejects.toBeInstanceOf(ConflictException);
    expect(orders.commits).toBe(0);
  });

  it('writes one cancel event and rejects a second cancel', async () => {
    const order = await service.place({ sku: 'mug', quantity: 1, customerId });
    const cancelled = await service.cancel(order.id);
    expect(cancelled.status).toBe('cancelled');
    await expect(service.cancel(order.id)).rejects.toBeInstanceOf(ConflictException);
    const cancellations = orders.outbox.filter((row) => row.eventType === topics.orderCancelled);
    expect(cancellations).toHaveLength(1);
    expect(orders.orders.get(order.id)?.status).toBe('cancelled');
  });

  it('moves a placed order to reserved once for one event id', async () => {
    const order = await service.place({ sku: 'mug', quantity: 1, customerId });
    const event = stockReservedEventSchema.parse({
      eventId: '22222222-2222-4222-8222-222222222222',
      eventType: topics.stockReserved,
      occurredAt: new Date().toISOString(),
      aggregateId: order.id,
      data: { orderId: order.id, sku: 'mug', quantity: 1, customerId },
    });
    await service.applyInventory(event);
    await service.applyInventory(event);
    expect((await service.findOne(order.id)).status).toBe('reserved');
    expect(orders.processed.size).toBe(1);
  });
});
