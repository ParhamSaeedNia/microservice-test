import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { NotificationCommand } from '@market/contracts';
import { randomUUID } from 'node:crypto';
import { QueryFailedError, type Repository } from 'typeorm';
import { NotificationEntity } from './notification.entity.js';
import { NotificationsRepository } from './notifications.repository.js';
import type { NotificationView } from './notifications.schemas.js';

@Injectable()
export class TypeOrmNotificationsRepository extends NotificationsRepository {
  constructor(@InjectRepository(NotificationEntity) private readonly notifications: Repository<NotificationEntity>) {
    super();
  }

  async save(command: NotificationCommand): Promise<NotificationView> {
    const existing = await this.notifications.findOneBy({ commandId: command.commandId });
    if (existing) return toView(existing);
    try {
      const row = {
        id: randomUUID(),
        commandId: command.commandId,
        customerId: command.customerId,
        orderId: command.orderId,
        kind: command.kind,
        message: command.message,
      };
      await this.notifications.insert(row);
      return row;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const row = await this.notifications.findOneByOrFail({ commandId: command.commandId });
      return toView(row);
    }
  }

  async findByCustomer(customerId: string): Promise<NotificationView[]> {
    const rows = await this.notifications.find({ where: { customerId }, order: { createdAt: 'ASC' } });
    return rows.map(toView);
  }
}

function toView(row: NotificationEntity): NotificationView {
  return {
    id: row.id,
    commandId: row.commandId,
    customerId: row.customerId,
    orderId: row.orderId,
    kind: row.kind as NotificationView['kind'],
    message: row.message,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string };
  return driverError.code === '23505';
}
