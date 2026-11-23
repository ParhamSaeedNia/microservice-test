import { Module, type DynamicModule, type MiddlewareConsumer, type NestModule, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from '../http/http-exception.filter.js';
import { RequestIdMiddleware } from '../http/request-id.middleware.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({})
export class ProductsModule implements NestModule {
  static register(options: { imports?: DynamicModule['imports']; repository: Provider }): DynamicModule {
    return {
      module: ProductsModule,
      imports: options.imports ?? [],
      controllers: [ProductsController],
      providers: [
        ProductsService,
        options.repository,
        { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes(ProductsController);
  }
}
