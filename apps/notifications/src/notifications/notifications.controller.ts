import { Controller, Get, Query } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ApiBadRequestResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { errorBodySchema, openApiSchema, queues } from '@market/contracts';
import { NotificationsHandler, type AckChannel } from './notifications.handler.js';
import { NotificationsRepository } from './notifications.repository.js';
import { customerQuerySchema, notificationViewSchema } from './notifications.schemas.js';

const listDoc = { type: 'array', items: openApiSchema(notificationViewSchema) };
const errorDoc = openApiSchema(errorBodySchema);

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly handler: NotificationsHandler,
  ) {}

  @Get()
  @ApiOkResponse({ schema: listDoc })
  @ApiBadRequestResponse({ schema: errorDoc })
  find(@Query('customerId', { schema: customerQuerySchema }) customerId: string) {
    return this.notifications.findByCustomer(customerId);
  }

  @EventPattern(queues.notificationsSend)
  onSend(@Payload() payload: unknown, @Ctx() context: unknown) {
    const rmq = context as RmqContext;
    const channel = rmq.getChannelRef() as AckChannel;
    return this.handler.handle(payload, channel, rmq.getMessage() as object);
  }
}
