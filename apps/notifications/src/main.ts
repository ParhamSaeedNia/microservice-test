import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { queues } from '@market/contracts';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { metricsMiddleware, nestLogger } from './observability.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: nestLogger });
  app.use(metricsMiddleware);
  configureApp(app, 'Notifications');
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.getOrThrow<string>('RABBITMQ_URL')],
      queue: queues.notificationsSend,
      noAck: false,
      prefetchCount: 10,
      noAssert: true,
      queueOptions: { durable: true },
    },
  });
  await app.startAllMicroservices();
  await app.listen(Number(config.getOrThrow('NOTIFICATIONS_PORT')), '0.0.0.0');
}
await bootstrap();
