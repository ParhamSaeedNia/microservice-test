import { z } from 'zod';

export const inventoryEnvSchema = z.object({
  INVENTORY_PORT: z.coerce.number().int().positive().default(3003),
  INVENTORY_DATABASE_URL: z.string().min(1),
  KAFKA_BROKERS: z.string().min(1),
});

export type InventoryEnv = z.infer<typeof inventoryEnvSchema>;
