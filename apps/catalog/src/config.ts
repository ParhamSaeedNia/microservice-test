import { z } from 'zod';

export const catalogEnvSchema = z.object({
  CATALOG_PORT: z.coerce.number().int().positive().default(3001),
  CATALOG_DATABASE_URL: z.string().min(1),
});

export type CatalogEnv = z.infer<typeof catalogEnvSchema>;
