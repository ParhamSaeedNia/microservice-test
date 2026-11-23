import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ReservationController } from './reservation.controller.js';
import { ReservationHandler } from './reservation.handler.js';

@Module({})
export class ReservationModule {
  static register(options: { imports?: DynamicModule['imports']; unitOfWork: Provider; publisher: Provider }): DynamicModule {
    return {
      module: ReservationModule,
      imports: options.imports ?? [],
      controllers: [ReservationController],
      providers: [ReservationHandler, options.unitOfWork, options.publisher],
    };
  }
}
