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
  configureApp(app, 'Inventory');
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const brokers = config.getOrThrow<string>('KAFKA_BROKERS').split(',').map((broker) => broker.trim());
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { clientId: 'inventory', brokers },
      consumer: { groupId: consumerGroups.inventory },
      postfixId: '',
    },
  });
  await app.startAllMicroservices();
  await app.listen(Number(config.getOrThrow('INVENTORY_PORT')), '0.0.0.0');
}
await bootstrap();
