import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/configure-app.js';
import { HealthModule } from '../src/health/health.module.js';
import { ProductsModule } from '../src/products/products.module.js';
import { ProductsRepository, SkuAlreadyExistsError } from '../src/products/products.repository.js';
import type { PatchProduct, ProductView } from '../src/products/products.schemas.js';

class MemoryProducts extends ProductsRepository {
  readonly rows = new Map<string, ProductView>();

  async insert(product: ProductView): Promise<ProductView> {
    if (this.rows.has(product.sku)) throw new SkuAlreadyExistsError(product.sku);
    this.rows.set(product.sku, { ...product });
    return { ...product };
  }

  async findAll(): Promise<ProductView[]> {
    return [...this.rows.values()].sort((a, b) => a.sku.localeCompare(b.sku));
  }

  async findBySku(sku: string): Promise<ProductView | null> {
    const row = this.rows.get(sku);
    return row ? { ...row } : null;
  }

  async update(sku: string, patch: PatchProduct): Promise<ProductView | null> {
    const row = this.rows.get(sku);
    if (!row) return null;
    const next = { ...row, ...patch };
    this.rows.set(sku, next);
    return { ...next };
  }

  async count(): Promise<number> {
    return this.rows.size;
  }
}

describe('Catalog (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ProductsModule.register({
          repository: { provide: ProductsRepository, useClass: MemoryProducts },
        }),
        HealthModule.register({
          inject: [HealthIndicatorService],
          useFactory: (indicators: HealthIndicatorService) => [() => Promise.resolve(indicators.check('database').up())],
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app, 'Catalog');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a product and reads it back', async () => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .send({ sku: 'lamp', name: 'Lamp', price: 2500 })
      .expect(201);
    expect(created.body).toEqual({ sku: 'lamp', name: 'Lamp', price: 2500, published: true });
    expect(created.headers['x-request-id']).toEqual(expect.any(String));

    const fetched = await request(app.getHttpServer()).get('/products/lamp').expect(200);
    expect(fetched.body).toEqual(created.body);

    const list = await request(app.getHttpServer()).get('/products').expect(200);
    expect(list.body.map((product: ProductView) => product.sku)).toContain('lamp');
    expect(list.body.map((product: ProductView) => product.sku)).toEqual(expect.arrayContaining(['mug', 'notebook', 'pen']));
  });

  it('rejects an invalid body with the error shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('x-request-id', 'req-catalog')
      .send({ sku: 'lamp', name: '', price: 0 })
      .expect(400);
    expect(response.body.statusCode).toBe(400);
    expect(typeof response.body.message).toBe('string');
    expect(response.body.error).toEqual(expect.any(String));
    expect(response.body.requestId).toBe('req-catalog');
  });

  it('reports health when the database check is up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('serves OpenAPI for the catalog paths', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const paths = Object.keys(response.body.paths);
    expect(paths).toEqual(expect.arrayContaining(['/products', '/health', '/docs-json']));
    expect(paths.some((path) => path.includes('sku'))).toBe(true);
  });
});
