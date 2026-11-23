import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { catalogEnvSchema } from './config.js';
import { MetricsController } from './observability.js';
import { HealthModule } from './health/health.module.js';
import { InitProducts1710000000000 } from './migrations/init-products.js';
import { ProductEntity } from './products/product.entity.js';
import { ProductsModule } from './products/products.module.js';
import { ProductsRepository } from './products/products.repository.js';
import { TypeOrmProductsRepository } from './products/typeorm-products.repository.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: (env: Record<string, unknown>) => catalogEnvSchema.parse(env),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('CATALOG_DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [InitProducts1710000000000],
      }),
    }),
    ProductsModule.register({
      imports: [TypeOrmModule.forFeature([ProductEntity])],
      repository: { provide: ProductsRepository, useClass: TypeOrmProductsRepository },
    }),
    HealthModule.register({
      inject: [TypeOrmHealthIndicator],
      useFactory: (db: TypeOrmHealthIndicator) => [() => db.pingCheck('database').withTimeout('1s')],
    }),
  ],
  controllers: [MetricsController],
})
export class AppModule {}
