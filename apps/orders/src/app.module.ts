import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MicroserviceHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ordersEnvSchema } from './config.js';
import { MetricsController } from './observability.js';
import { HealthModule } from './health/health.module.js';
import { InitOrders1710000000000 } from './migrations/init-orders.js';
import { CatalogClient } from './orders/catalog.client.js';
import { OrderEntity } from './orders/order.entity.js';
import { OrdersModule } from './orders/orders.module.js';
import { OrdersUnitOfWork } from './orders/orders.unit-of-work.js';
import { OutboxEntity } from './orders/outbox.entity.js';
import { ProcessedEventEntity } from './orders/processed-event.entity.js';
import { TypeOrmOrdersUnitOfWork } from './orders/typeorm-orders.unit-of-work.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: (env: Record<string, unknown>) => ordersEnvSchema.parse(env),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('ORDERS_DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [InitOrders1710000000000],
      }),
    }),
    OrdersModule.register({
      imports: [TypeOrmModule.forFeature([OrderEntity, OutboxEntity, ProcessedEventEntity])],
      unitOfWork: { provide: OrdersUnitOfWork, useClass: TypeOrmOrdersUnitOfWork },
      catalog: { provide: CatalogClient, useClass: CatalogClient },
    }),
    HealthModule.register({
      inject: [TypeOrmHealthIndicator, MicroserviceHealthIndicator, ConfigService],
      useFactory: (db: TypeOrmHealthIndicator, broker: MicroserviceHealthIndicator, config: ConfigService) => [
        () => db.pingCheck('database').withTimeout('1s'),
        () =>
          broker
            .pingCheck('kafka', {
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: 'orders-health',
                  brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(',').map((item) => item.trim()),
                },
              },
            })
            .withTimeout('1s'),
      ],
    }),
  ],
  controllers: [MetricsController],
})
export class AppModule {}
