import { Module, StandardSchemaValidationPipe, type DynamicModule, type MiddlewareConsumer, type NestModule, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from '../http/http-exception.filter.js';
import { RequestIdMiddleware } from '../http/request-id.middleware.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsHandler } from './notifications.handler.js';

@Module({})
export class NotificationsModule implements NestModule {
  static register(options: { imports?: DynamicModule['imports']; repository: Provider }): DynamicModule {
    return {
      module: NotificationsModule,
      imports: options.imports ?? [],
      controllers: [NotificationsController],
      providers: [
        NotificationsHandler,
        options.repository,
        { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes(NotificationsController);
  }
}
