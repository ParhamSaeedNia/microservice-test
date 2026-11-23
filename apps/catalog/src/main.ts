import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { metricsMiddleware, nestLogger } from './observability.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: nestLogger });
  app.use(metricsMiddleware);
  configureApp(app, 'Catalog');
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  await app.listen(Number(config.getOrThrow('CATALOG_PORT')), '0.0.0.0');
}
await bootstrap();
