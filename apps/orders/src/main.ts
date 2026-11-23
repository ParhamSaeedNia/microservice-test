import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { consumerGroups } from '@market/contracts';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { metricsMiddleware, nestLogger } from './observability.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: nestLogger });
  app.use(metricsMiddleware);
  configureApp(app, 'Orders');
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const brokers = config.getOrThrow<string>('KAFKA_BROKERS').split(',').map((broker) => broker.trim());
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { clientId: 'orders', brokers },
      consumer: { groupId: consumerGroups.orders },
      postfixId: '',
    },
  });
  await app.startAllMicroservices();
  await app.listen(Number(config.getOrThrow('ORDERS_PORT')), '0.0.0.0');
}
await bootstrap();
