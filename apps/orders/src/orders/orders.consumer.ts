import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { topics } from '@market/contracts';
import { OrdersService } from './orders.service.js';

@Controller()
export class OrdersConsumer {
  constructor(private readonly orders: OrdersService) {}

  @EventPattern(topics.stockReserved)
  reserved(@Payload() payload: unknown) {
    return this.orders.applyInventory(payload);
  }

  @EventPattern(topics.reservationFailed)
  failed(@Payload() payload: unknown) {
    return this.orders.applyInventory(payload);
  }
}
