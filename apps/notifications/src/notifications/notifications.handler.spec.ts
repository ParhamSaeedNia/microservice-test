import type { NotificationCommand } from '@market/contracts';
import { NotificationsHandler, type AckChannel } from './notifications.handler.js';
import { NotificationsRepository } from './notifications.repository.js';
import type { NotificationView } from './notifications.schemas.js';

const command: NotificationCommand = {
  commandId: '22222222-2222-4222-8222-222222222222',
  customerId: '11111111-1111-4111-8111-111111111111',
  orderId: '44444444-4444-4444-8444-444444444444',
  kind: 'stock-reserved',
  message: 'Order 44444444-4444-4444-8444-444444444444 reserved 2 of mug',
};

class MemoryNotifications extends NotificationsRepository {
  readonly rows: NotificationView[] = [];
  fail = false;

  async save(input: NotificationCommand): Promise<NotificationView> {
    if (this.fail) throw new Error('db down');
    const existing = this.rows.find((row) => row.commandId === input.commandId);
    if (existing) return existing;
    const row = { id: '55555555-5555-4555-8555-555555555555', ...input };
    this.rows.push(row);
    return row;
  }

  async findByCustomer(customerId: string): Promise<NotificationView[]> {
    return this.rows.filter((row) => row.customerId === customerId);
  }
}

describe('NotificationsHandler', () => {
  it('persists one row and acks', async () => {
    const repo = new MemoryNotifications();
    const handler = new NotificationsHandler(repo);
    const message = { content: 'ok' };
    const ack = vi.fn();
    const nack = vi.fn();
    const channel: AckChannel = { ack, nack };
    await handler.handle(command, channel, message);
    await handler.handle(command, channel, message);
    expect(repo.rows).toHaveLength(1);
    expect(ack).toHaveBeenCalledWith(message);
    expect(nack).not.toHaveBeenCalled();
  });

  it('nacks and does not ack when saving throws', async () => {
    const repo = new MemoryNotifications();
    repo.fail = true;
    const handler = new NotificationsHandler(repo);
    const message = { content: 'bad' };
    const ack = vi.fn();
    const nack = vi.fn();
    const channel: AckChannel = { ack, nack };
    await expect(handler.handle(command, channel, message)).rejects.toThrow('db down');
    expect(nack).toHaveBeenCalledWith(message, false, false);
    expect(ack).not.toHaveBeenCalled();
    expect(repo.rows).toHaveLength(0);
  });
});
