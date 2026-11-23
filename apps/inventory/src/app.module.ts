import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MicroserviceHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { consumerGroups } from '@market/contracts';
import { inventoryEnvSchema } from './config.js';
import { MetricsController } from './observability.js';
import { HealthModule } from './health/health.module.js';
import { InitReservations1710000000001 } from './migrations/init-reservations.js';
import { InitStock1710000000000 } from './migrations/init-stock.js';
import { EventPublisher } from './reservations/event-publisher.js';
import { INVENTORY_KAFKA, KafkaEventPublisher } from './reservations/kafka-event.publisher.js';
import { OrderStockEntity } from './reservations/order-stock.entity.js';
import { PendingPublishEntity } from './reservations/pending-publish.entity.js';
import { ProcessedEventEntity } from './reservations/processed-event.entity.js';
import { ReservationModule } from './reservations/reservation.module.js';
import { ReservationUnitOfWork } from './reservations/reservation.unit-of-work.js';
import { TypeOrmReservationUnitOfWork } from './reservations/typeorm-reservation.unit-of-work.js';
import { StockEntity } from './stock/stock.entity.js';
import { StockModule } from './stock/stock.module.js';
import { StockRepository } from './stock/stock.repository.js';
import { TypeOrmStockRepository } from './stock/typeorm-stock.repository.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: (env: Record<string, unknown>) => inventoryEnvSchema.parse(env),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('INVENTORY_DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [InitStock1710000000000, InitReservations1710000000001],
      }),
    }),
    StockModule.register({
      imports: [TypeOrmModule.forFeature([StockEntity])],
      repository: { provide: StockRepository, useClass: TypeOrmStockRepository },
    }),
    ReservationModule.register({
      imports: [
        TypeOrmModule.forFeature([OrderStockEntity, ProcessedEventEntity, PendingPublishEntity]),
        ClientsModule.registerAsync([
          {
            name: INVENTORY_KAFKA,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: 'inventory-publish',
                  brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(',').map((broker) => broker.trim()),
                },
                consumer: { groupId: consumerGroups.inventory },
                producerOnlyMode: true,
                postfixId: '',
              },
            }),
          },
        ]),
      ],
      unitOfWork: { provide: ReservationUnitOfWork, useClass: TypeOrmReservationUnitOfWork },
      publisher: { provide: EventPublisher, useClass: KafkaEventPublisher },
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
                  clientId: 'inventory-health',
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
