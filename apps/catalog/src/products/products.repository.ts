import type { PatchProduct, ProductView } from './products.schemas.js';

export class SkuAlreadyExistsError extends Error {
  constructor(readonly sku: string) {
    super(`Product ${sku} already exists`);
  }
}

export abstract class ProductsRepository {
  abstract insert(product: ProductView): Promise<ProductView>;
  abstract findAll(): Promise<ProductView[]>;
  abstract findBySku(sku: string): Promise<ProductView | null>;
  abstract update(sku: string, patch: PatchProduct): Promise<ProductView | null>;
  abstract count(): Promise<number>;
}
