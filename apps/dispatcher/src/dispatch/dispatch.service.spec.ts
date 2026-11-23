import { topics, type StockReservedEvent } from '@market/contracts';
import { DispatchService } from './dispatch.service.js';
import { NotificationBus } from './notification-bus.js';

class FakeBus extends NotificationBus {
  readonly commands: unknown[] = [];

  async send(command: unknown): Promise<void> {
    this.commands.push(command);
  }
}

const event: StockReservedEvent = {
  eventId: '22222222-2222-4222-8222-222222222222',
  eventType: topics.stockReserved,
  occurredAt: '2026-11-23T12:00:00.000Z',
  aggregateId: '44444444-4444-4444-8444-444444444444',
  data: {
    orderId: '44444444-4444-4444-8444-444444444444',
    sku: 'mug',
    quantity: 2,
    customerId: '11111111-1111-4111-8111-111111111111',
  },
};

describe('DispatchService', () => {
  it('publishes a notification command for a stock reservation', async () => {
    const bus = new FakeBus();
    const service = new DispatchService(bus);
    await service.dispatch(event);
    expect(bus.commands).toEqual([
      {
        commandId: event.eventId,
        customerId: event.data.customerId,
        orderId: event.data.orderId,
        kind: 'stock-reserved',
        message: `Order ${event.data.orderId} reserved 2 of mug`,
      },
    ]);
  });

  it('ignores a payload that is not an inventory event', async () => {
    const bus = new FakeBus();
    await new DispatchService(bus).dispatch({ hello: 'nope' });
    expect(bus.commands).toHaveLength(0);
  });
});
