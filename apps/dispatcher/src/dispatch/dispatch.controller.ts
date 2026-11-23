import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { topics } from '@market/contracts';
import { DispatchService } from './dispatch.service.js';

@Controller()
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @EventPattern(topics.stockReserved)
  reserved(@Payload() payload: unknown) {
    return this.dispatch.dispatch(payload);
  }

  @EventPattern(topics.reservationFailed)
  failed(@Payload() payload: unknown) {
    return this.dispatch.dispatch(payload);
  }
}
