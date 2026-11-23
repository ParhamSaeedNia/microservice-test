import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/configure-app.js';
import { HealthModule } from '../src/health/health.module.js';
import { StockModule } from '../src/stock/stock.module.js';
import { StockRepository } from '../src/stock/stock.repository.js';
import type { StockView } from '../src/stock/stock.schemas.js';

class MemoryStock extends StockRepository {
  readonly rows = new Map<string, StockView>();

  async findBySku(sku: string): Promise<StockView | null> {
    const row = this.rows.get(sku);
    return row ? { ...row } : null;
  }

  async insertIfAbsent(sku: string, onHand: number): Promise<void> {
    if (!this.rows.has(sku)) this.rows.set(sku, { sku, onHand });
  }

  async add(sku: string, quantity: number): Promise<StockView | null> {
    const row = this.rows.get(sku);
    if (!row) return null;
    const next = { sku, onHand: row.onHand + quantity };
    this.rows.set(sku, next);
    return { ...next };
  }
}

describe('Inventory (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        StockModule.register({
          repository: { provide: StockRepository, useClass: MemoryStock },
        }),
        HealthModule.register({
          inject: [HealthIndicatorService],
          useFactory: (indicators: HealthIndicatorService) => [() => Promise.resolve(indicators.check('database').up())],
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app, 'Inventory');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('seeds stock and replenishes it', async () => {
    const seeded = await request(app.getHttpServer()).get('/stock/mug').expect(200);
    expect(seeded.body).toEqual({ sku: 'mug', onHand: 100 });

    const replenished = await request(app.getHttpServer()).post('/stock/mug/replenish').send({ quantity: 5 }).expect(200);
    expect(replenished.body).toEqual({ sku: 'mug', onHand: 105 });
  });

  it('returns 404 for an unknown sku', async () => {
    const response = await request(app.getHttpServer()).get('/stock/missing').expect(404);
    expect(response.body.statusCode).toBe(404);
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('reports health when the database check is up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('serves OpenAPI for the stock paths', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const paths = Object.keys(response.body.paths);
    expect(paths).toEqual(expect.arrayContaining(['/health', '/docs-json']));
    expect(paths.some((path) => path.includes('stock') && path.includes('sku'))).toBe(true);
    expect(paths.some((path) => path.includes('replenish'))).toBe(true);
  });
});
