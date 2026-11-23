import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { MicroserviceHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { queues } from '@market/contracts';
import { notificationsEnvSchema } from './config.js';
import { MetricsController } from './observability.js';
import { HealthModule } from './health/health.module.js';
import { InitNotifications1710000000000 } from './migrations/init-notifications.js';
import { NotificationEntity } from './notifications/notification.entity.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { NotificationsRepository } from './notifications/notifications.repository.js';
import { TypeOrmNotificationsRepository } from './notifications/typeorm-notifications.repository.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: (env: Record<string, unknown>) => notificationsEnvSchema.parse(env),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('NOTIFICATIONS_DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [InitNotifications1710000000000],
      }),
    }),
    NotificationsModule.register({
      imports: [TypeOrmModule.forFeature([NotificationEntity])],
      repository: { provide: NotificationsRepository, useClass: TypeOrmNotificationsRepository },
    }),
    HealthModule.register({
      inject: [TypeOrmHealthIndicator, MicroserviceHealthIndicator, ConfigService],
      useFactory: (db: TypeOrmHealthIndicator, broker: MicroserviceHealthIndicator, config: ConfigService) => [
        () => db.pingCheck('database').withTimeout('1s'),
        () =>
          broker
            .pingCheck('rabbitmq', {
              transport: Transport.RMQ,
              options: {
                urls: [config.getOrThrow<string>('RABBITMQ_URL')],
                queue: queues.notificationsSend,
              },
            })
            .withTimeout('1s'),
      ],
    }),
  ],
  controllers: [MetricsController],
})
export class AppModule {}
