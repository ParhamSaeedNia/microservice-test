import { centsSchema, customerIdSchema, orderStatusSchema, quantitySchema, skuSchema } from '@market/contracts';
import { z } from 'zod';

export const orderViewSchema = z.object({
  id: z.uuid(),
  sku: skuSchema,
  quantity: quantitySchema,
  unitPrice: centsSchema,
  customerId: customerIdSchema,
  status: orderStatusSchema,
});

export type OrderView = z.infer<typeof orderViewSchema>;

export const placeOrderSchema = z.object({
  sku: skuSchema,
  quantity: quantitySchema,
  customerId: customerIdSchema,
});

export type PlaceOrder = z.infer<typeof placeOrderSchema>;

export const catalogProductSchema = z.object({
  sku: skuSchema,
  name: z.string(),
  price: centsSchema,
  published: z.boolean(),
});

export type CatalogProduct = z.infer<typeof catalogProductSchema>;
