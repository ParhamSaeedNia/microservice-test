import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthIndicatorService } from '@nestjs/terminus';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../src/configure-app.js';
import { HealthModule } from '../src/health/health.module.js';
import { NotificationsModule } from '../src/notifications/notifications.module.js';
import { NotificationsRepository } from '../src/notifications/notifications.repository.js';
import type { NotificationView } from '../src/notifications/notifications.schemas.js';
import type { NotificationCommand } from '@market/contracts';

class MemoryNotifications extends NotificationsRepository {
  readonly rows: NotificationView[] = [
    {
      id: '55555555-5555-4555-8555-555555555555',
      commandId: '22222222-2222-4222-8222-222222222222',
      customerId: '11111111-1111-4111-8111-111111111111',
      orderId: '44444444-4444-4444-8444-444444444444',
      kind: 'stock-reserved',
      message: 'reserved',
    },
  ];

  async save(command: NotificationCommand): Promise<NotificationView> {
    const row = { id: '55555555-5555-4555-8555-555555555555', ...command };
    this.rows.push(row);
    return row;
  }

  async findByCustomer(customerId: string): Promise<NotificationView[]> {
    return this.rows.filter((row) => row.customerId === customerId);
  }
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        NotificationsModule.register({
          repository: { provide: NotificationsRepository, useClass: MemoryNotifications },
        }),
        HealthModule.register({
          inject: [HealthIndicatorService],
          useFactory: (indicators: HealthIndicatorService) => [() => Promise.resolve(indicators.check('database').up())],
        }),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, 'Notifications');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists notifications for a customer', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .query({ customerId: '11111111-1111-4111-8111-111111111111' })
      .expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].kind).toBe('stock-reserved');
  });

  it('rejects a missing customer id', async () => {
    const response = await request(app.getHttpServer()).get('/notifications').expect(400);
    expect(response.body.statusCode).toBe(400);
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('reports health when dependencies are up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('serves OpenAPI for the notification path', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const paths = Object.keys(response.body.paths);
    expect(paths).toEqual(expect.arrayContaining(['/notifications', '/health', '/docs-json']));
  });
});
