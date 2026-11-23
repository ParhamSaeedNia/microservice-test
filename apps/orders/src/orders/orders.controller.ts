import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { errorBodySchema, openApiSchema } from '@market/contracts';
import { z } from 'zod';
import { OrdersService } from './orders.service.js';
import { orderViewSchema, placeOrderSchema, type PlaceOrder } from './orders.schemas.js';

const orderDoc = openApiSchema(orderViewSchema);
const errorDoc = openApiSchema(errorBodySchema);
const idSchema = z.uuid();

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiCreatedResponse({ schema: orderDoc })
  @ApiBadRequestResponse({ schema: errorDoc })
  @ApiNotFoundResponse({ schema: errorDoc })
  @ApiConflictResponse({ schema: errorDoc })
  place(@Body({ schema: placeOrderSchema }) body: PlaceOrder) {
    return this.orders.place(body);
  }

  @Get(':id')
  @ApiOkResponse({ schema: orderDoc })
  @ApiNotFoundResponse({ schema: errorDoc })
  findOne(@Param('id', { schema: idSchema }) id: string) {
    return this.orders.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOkResponse({ schema: orderDoc })
  @ApiConflictResponse({ schema: errorDoc })
  @ApiNotFoundResponse({ schema: errorDoc })
  cancel(@Param('id', { schema: idSchema }) id: string) {
    return this.orders.cancel(id);
  }
}
