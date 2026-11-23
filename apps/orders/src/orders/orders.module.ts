import { Module, StandardSchemaValidationPipe, type DynamicModule, type MiddlewareConsumer, type NestModule, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from '../http/http-exception.filter.js';
import { RequestIdMiddleware } from '../http/request-id.middleware.js';
import { OrdersConsumer } from './orders.consumer.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({})
export class OrdersModule implements NestModule {
  static register(options: { imports?: DynamicModule['imports']; unitOfWork: Provider; catalog: Provider }): DynamicModule {
    return {
      module: OrdersModule,
      imports: options.imports ?? [],
      controllers: [OrdersController, OrdersConsumer],
      providers: [
        OrdersService,
        options.unitOfWork,
        options.catalog,
        { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes(OrdersController);
  }
}
