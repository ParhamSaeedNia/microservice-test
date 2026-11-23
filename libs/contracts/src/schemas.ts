import { z } from 'zod';
import { topics } from './topics.js';

export const skuSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);
export const quantitySchema = z.number().int().positive();
export const customerIdSchema = z.uuid();
export const centsSchema = z.number().int().positive().describe('Integer cents');

export const errorBodySchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  error: z.string(),
  requestId: z.string(),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

export const orderStatusSchema = z.enum(['placed', 'reserved', 'rejected', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

const envelope = {
  eventId: z.uuid(),
  occurredAt: z.iso.datetime(),
  aggregateId: z.uuid(),
};

export const orderPlacedDataSchema = z.object({
  orderId: z.uuid(),
  sku: skuSchema,
  quantity: quantitySchema,
  unitPrice: centsSchema,
  customerId: customerIdSchema,
});

export const orderPlacedEventSchema = z.object({
  ...envelope,
  eventType: z.literal(topics.orderPlaced),
  data: orderPlacedDataSchema,
});

export const orderCancelledDataSchema = z.object({
  orderId: z.uuid(),
  sku: skuSchema,
  quantity: quantitySchema,
  customerId: customerIdSchema,
});

export const orderCancelledEventSchema = z.object({
  ...envelope,
  eventType: z.literal(topics.orderCancelled),
  data: orderCancelledDataSchema,
});

export const stockReservedDataSchema = z.object({
  orderId: z.uuid(),
  sku: skuSchema,
  quantity: quantitySchema,
  customerId: customerIdSchema,
});

export const stockReservedEventSchema = z.object({
  ...envelope,
  eventType: z.literal(topics.stockReserved),
  data: stockReservedDataSchema,
});

export const reservationFailedDataSchema = stockReservedDataSchema.extend({
  reason: z.literal('insufficient_stock'),
});

export const reservationFailedEventSchema = z.object({
  ...envelope,
  eventType: z.literal(topics.reservationFailed),
  data: reservationFailedDataSchema,
});

export const notificationCommandSchema = z.object({
  commandId: z.uuid(),
  customerId: customerIdSchema,
  orderId: z.uuid(),
  kind: z.enum(['stock-reserved', 'reservation-failed']),
  message: z.string().min(1),
});

export type OrderPlacedEvent = z.infer<typeof orderPlacedEventSchema>;
export type OrderCancelledEvent = z.infer<typeof orderCancelledEventSchema>;
export type StockReservedEvent = z.infer<typeof stockReservedEventSchema>;
export type ReservationFailedEvent = z.infer<typeof reservationFailedEventSchema>;
export type NotificationCommand = z.infer<typeof notificationCommandSchema>;

export function openApiSchema(schema: z.ZodType): Record<string, unknown> {
  const document = z.toJSONSchema(schema) as Record<string, unknown>;
  delete document.$schema;
  return document;
}
