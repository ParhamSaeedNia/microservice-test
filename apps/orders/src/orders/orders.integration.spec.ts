import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { CatalogClient } from './catalog.client.js';
import { InitOrders1710000000000 } from '../migrations/init-orders.js';
import { OrderEntity } from './order.entity.js';
import { OrdersService } from './orders.service.js';
import { OutboxEntity } from './outbox.entity.js';
import { ProcessedEventEntity } from './processed-event.entity.js';
import { TypeOrmOrdersUnitOfWork } from './typeorm-orders.unit-of-work.js';
import type { CatalogProduct } from './orders.schemas.js';

const customerId = '11111111-1111-4111-8111-111111111111';

class StubCatalog extends CatalogClient {
  constructor() {
    super({ getOrThrow: () => 'http://catalog.test' } as never);
  }

  override async getProduct(sku: string): Promise<CatalogProduct> {
    return { sku, name: 'Ceramic mug', price: 1299, published: true };
  }
}

describe.skipIf(process.env.RUN_INTEGRATION !== '1')('orders transaction', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let dataSource: DataSource | undefined;
  let docker = true;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16').start();
      dataSource = new DataSource({
        type: 'postgres',
        url: container.getConnectionUri(),
        entities: [OrderEntity, OutboxEntity, ProcessedEventEntity],
        migrations: [InitOrders1710000000000],
        migrationsRun: true,
      });
      await dataSource.initialize();
    } catch {
      docker = false;
    }
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  it('writes the order row and the outbox row', async (ctx) => {
    if (!docker || !dataSource) {
      ctx.skip();
      return;
    }
    const service = new OrdersService(new TypeOrmOrdersUnitOfWork(dataSource), new StubCatalog());
    const order = await service.place({ sku: 'mug', quantity: 2, customerId });
    const orders: Array<{ id: string; status: string }> = await dataSource.query(`SELECT id, status FROM orders`);
    const outbox: Array<{ event_type: string; aggregate_id: string }> = await dataSource.query(
      `SELECT event_type, aggregate_id FROM outbox`,
    );
    expect(orders).toEqual([{ id: order.id, status: 'placed' }]);
    expect(outbox).toEqual([{ event_type: 'orders.order-placed', aggregate_id: order.id }]);
  });
});
