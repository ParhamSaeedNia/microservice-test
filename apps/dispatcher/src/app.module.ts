import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MicroserviceHealthIndicator } from '@nestjs/terminus';
import { queues } from '@market/contracts';
import { dispatcherEnvSchema } from './config.js';
import { MetricsController } from './observability.js';
import { DispatchController } from './dispatch/dispatch.controller.js';
import { DispatchService } from './dispatch/dispatch.service.js';
import { NotificationBus } from './dispatch/notification-bus.js';
import { NOTIFICATIONS_BUS, RabbitNotificationBus } from './dispatch/rabbit-notification.bus.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: (env: Record<string, unknown>) => dispatcherEnvSchema.parse(env),
    }),
    ClientsModule.registerAsync([
      {
        name: NOTIFICATIONS_BUS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: queues.notificationsSend,
            noAssert: true,
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
    HealthModule.register({
      inject: [MicroserviceHealthIndicator, ConfigService],
      useFactory: (broker: MicroserviceHealthIndicator, config: ConfigService) => {
        const brokers = config.getOrThrow<string>('KAFKA_BROKERS').split(',').map((item) => item.trim());
        return [
          () =>
            broker
              .pingCheck('kafka', {
                transport: Transport.KAFKA,
                options: { client: { clientId: 'dispatcher-health', brokers } },
              })
              .withTimeout('1s'),
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
        ];
      },
    }),
  ],
  controllers: [DispatchController, MetricsController],
  providers: [DispatchService, { provide: NotificationBus, useClass: RabbitNotificationBus }],
})
export class AppModule {}
