export const topics = {
  orderPlaced: 'orders.order-placed',
  orderCancelled: 'orders.order-cancelled',
  stockReserved: 'inventory.stock-reserved',
  reservationFailed: 'inventory.reservation-failed',
} as const;

export type TopicName = (typeof topics)[keyof typeof topics];

export const queues = {
  notificationsSend: 'notifications.send',
  notificationsSendDlq: 'notifications.send.dlq',
} as const;

export const exchanges = {
  notificationsDlx: 'notifications.dlx',
} as const;

export const consumerGroups = {
  inventory: 'inventory-service',
  orders: 'orders-service',
  dispatcher: 'dispatcher',
} as const;

export const metricNames = {
  httpDuration: 'http_request_duration_seconds',
  outboxWritten: 'outbox_events_written_total',
  kafkaConsumed: 'kafka_messages_consumed_total',
  rabbitConsumed: 'rabbitmq_messages_consumed_total',
  notificationsSent: 'notifications_sent_total',
} as const;
