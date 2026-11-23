import { customerIdSchema, notificationCommandSchema } from '@market/contracts';
import { z } from 'zod';

export const notificationViewSchema = notificationCommandSchema.extend({
  id: z.uuid(),
});

export type NotificationView = z.infer<typeof notificationViewSchema>;

export const customerQuerySchema = customerIdSchema;
