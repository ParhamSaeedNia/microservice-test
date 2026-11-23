import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catalogProductSchema, type CatalogProduct } from './orders.schemas.js';

export class ProductUnavailableError extends Error {
  constructor(readonly sku: string) {
    super(`Product ${sku} not found`);
  }
}

@Injectable()
export class CatalogClient {
  constructor(private readonly config: ConfigService) {}

  async getProduct(sku: string): Promise<CatalogProduct> {
    const base = this.config.getOrThrow<string>('CATALOG_BASE_URL').replace(/\/$/, '');
    let response: Response;
    try {
      response = await fetch(`${base}/products/${encodeURIComponent(sku)}`, {
        signal: AbortSignal.timeout(2000),
      });
    } catch {
      throw new ServiceUnavailableException('Catalog is unavailable');
    }
    if (response.status === 404) throw new ProductUnavailableError(sku);
    if (!response.ok) throw new ServiceUnavailableException('Catalog is unavailable');
    const parsed = catalogProductSchema.safeParse(await response.json());
    if (!parsed.success) throw new ServiceUnavailableException('Catalog is unavailable');
    return parsed.data;
  }
}
