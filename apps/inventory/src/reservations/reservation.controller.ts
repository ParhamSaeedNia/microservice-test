import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { topics } from '@market/contracts';
import { ReservationHandler } from './reservation.handler.js';

@Controller()
export class ReservationController {
  constructor(private readonly reservations: ReservationHandler) {}

  @EventPattern(topics.orderPlaced)
  placed(@Payload() payload: unknown) {
    return this.reservations.handle(payload);
  }

  @EventPattern(topics.orderCancelled)
  cancelled(@Payload() payload: unknown) {
    return this.reservations.handle(payload);
  }
}
