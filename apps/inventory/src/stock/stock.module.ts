import { Module, type DynamicModule, type MiddlewareConsumer, type NestModule, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from '../http/http-exception.filter.js';
import { RequestIdMiddleware } from '../http/request-id.middleware.js';
import { StockController } from './stock.controller.js';
import { StockService } from './stock.service.js';

@Module({})
export class StockModule implements NestModule {
  static register(options: { imports?: DynamicModule['imports']; repository: Provider }): DynamicModule {
    return {
      module: StockModule,
      imports: options.imports ?? [],
      controllers: [StockController],
      providers: [
        StockService,
        options.repository,
        { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes(StockController);
  }
}
