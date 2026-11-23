import { z } from 'zod';

export const notificationsEnvSchema = z.object({
  NOTIFICATIONS_PORT: z.coerce.number().int().positive().default(3004),
  NOTIFICATIONS_DATABASE_URL: z.string().min(1),
  RABBITMQ_URL: z.string().min(1),
});
