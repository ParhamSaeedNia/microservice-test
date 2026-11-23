import { z } from 'zod';

export const ordersEnvSchema = z.object({
  ORDERS_PORT: z.coerce.number().int().positive().default(3002),
  ORDERS_DATABASE_URL: z.string().min(1),
  CATALOG_BASE_URL: z.string().min(1),
  KAFKA_BROKERS: z.string().min(1),
});
