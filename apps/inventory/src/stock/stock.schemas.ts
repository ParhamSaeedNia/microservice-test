import { quantitySchema, skuSchema } from '@market/contracts';
import { z } from 'zod';

export const stockViewSchema = z.object({
  sku: skuSchema,
  onHand: z.number().int().nonnegative(),
});

export type StockView = z.infer<typeof stockViewSchema>;

export const replenishSchema = z.object({
  quantity: quantitySchema,
});

export type Replenish = z.infer<typeof replenishSchema>;
