import {
  Controller,
  Get,
  Inject,
  Module,
  type DynamicModule,
  type FactoryProvider,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { HealthCheck, HealthCheckService, TerminusModule, type HealthIndicatorFunction } from '@nestjs/terminus';
import { RequestIdMiddleware } from '../http/request-id.middleware.js';

export const HEALTH_CHECKS = Symbol('HEALTH_CHECKS');

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(HEALTH_CHECKS) private readonly checks: HealthIndicatorFunction[],
  ) {}

  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check(this.checks);
  }
}

@Module({})
export class HealthModule implements NestModule {
  static register(factory: Omit<FactoryProvider<HealthIndicatorFunction[]>, 'provide'>): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule.forRoot({ gracefulShutdownTimeoutMs: 1000 })],
      controllers: [HealthController],
      providers: [{ provide: HEALTH_CHECKS, ...factory }],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes(HealthController);
  }
}
