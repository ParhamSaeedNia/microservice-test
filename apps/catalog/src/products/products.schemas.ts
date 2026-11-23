import { skuSchema } from '@market/contracts';
import { z } from 'zod';

export const productViewSchema = z.object({
  sku: skuSchema,
  name: z.string(),
  price: z.number().int().describe('Price in cents'),
  published: z.boolean(),
});

export type ProductView = z.infer<typeof productViewSchema>;

export const createProductSchema = z.object({
  sku: skuSchema,
  name: z.string().trim().min(1).max(200),
  price: z.number().int().positive(),
  published: z.boolean().optional(),
});

export type CreateProduct = z.infer<typeof createProductSchema>;

export const patchProductSchema = z
  .object({
    price: z.number().int().positive().optional(),
    published: z.boolean().optional(),
  })
  .refine((value) => value.price !== undefined || value.published !== undefined, {
    message: 'price or published is required',
  });

export type PatchProduct = z.infer<typeof patchProductSchema>;
