import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/configure-app.js';
import { HealthModule } from '../src/health/health.module.js';
import { CatalogClient, ProductUnavailableError } from '../src/orders/catalog.client.js';
import { OrdersModule } from '../src/orders/orders.module.js';
import { OrdersUnitOfWork } from '../src/orders/orders.unit-of-work.js';
import type { CatalogProduct } from '../src/orders/orders.schemas.js';
import { MemoryOrders } from './memory-orders.js';

const customerId = '11111111-1111-4111-8111-111111111111';

const fakeCatalog = {
  async getProduct(sku: string): Promise<CatalogProduct> {
    if (sku === 'missing') throw new ProductUnavailableError(sku);
    return { sku, name: 'Ceramic mug', price: 1299, published: true };
  },
};

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        OrdersModule.register({
          unitOfWork: { provide: OrdersUnitOfWork, useClass: MemoryOrders },
          catalog: { provide: CatalogClient, useValue: fakeCatalog },
        }),
        HealthModule.register({
          inject: [HealthIndicatorService],
          useFactory: (indicators: HealthIndicatorService) => [() => Promise.resolve(indicators.check('database').up())],
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app, 'Orders');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects a quantity below 1', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ sku: 'mug', quantity: 0, customerId })
      .expect(400);
    expect(response.body).toMatchObject({ statusCode: 400, requestId: expect.any(String) });
    expect(typeof response.body.message).toBe('string');
  });

  it('returns 404 when the catalog does not know the sku', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ sku: 'missing', quantity: 1, customerId })
      .expect(404);
    expect(response.body.statusCode).toBe(404);
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('places an order against the mocked catalog price', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ sku: 'mug', quantity: 2, customerId })
      .expect(201);
    expect(response.body).toMatchObject({ sku: 'mug', quantity: 2, unitPrice: 1299, status: 'placed', customerId });

    const fetched = await request(app.getHttpServer()).get(`/orders/${response.body.id}`).expect(200);
    expect(fetched.body).toEqual(response.body);
  });

  it('reports health when the database check is up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('serves OpenAPI for the order paths', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const paths = Object.keys(response.body.paths);
    expect(paths).toEqual(expect.arrayContaining(['/orders', '/health', '/docs-json']));
    expect(paths.some((path) => path.includes('cancel'))).toBe(true);
  });
});
