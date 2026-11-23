import { z } from 'zod';

export const dispatcherEnvSchema = z.object({
  DISPATCHER_PORT: z.coerce.number().int().positive().default(3005),
  KAFKA_BROKERS: z.string().min(1),
  RABBITMQ_URL: z.string().min(1),
});
