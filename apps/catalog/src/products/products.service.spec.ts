import { ConflictException, NotFoundException } from '@nestjs/common';
import { seedProducts } from '@market/contracts';
import { ProductsRepository, SkuAlreadyExistsError } from './products.repository.js';
import { ProductsService } from './products.service.js';
import type { PatchProduct, ProductView } from './products.schemas.js';

class MemoryProducts extends ProductsRepository {
  readonly rows = new Map<string, ProductView>();

  async insert(product: ProductView): Promise<ProductView> {
    if (this.rows.has(product.sku)) throw new SkuAlreadyExistsError(product.sku);
    this.rows.set(product.sku, { ...product });
    return { ...product };
  }

  async findAll(): Promise<ProductView[]> {
    return [...this.rows.values()].sort((a, b) => a.sku.localeCompare(b.sku));
  }

  async findBySku(sku: string): Promise<ProductView | null> {
    const row = this.rows.get(sku);
    return row ? { ...row } : null;
  }

  async update(sku: string, patch: PatchProduct): Promise<ProductView | null> {
    const row = this.rows.get(sku);
    if (!row) return null;
    const next = { ...row, ...patch };
    this.rows.set(sku, next);
    return { ...next };
  }

  async count(): Promise<number> {
    return this.rows.size;
  }
}

describe('ProductsService', () => {
  let repo: MemoryProducts;
  let service: ProductsService;

  beforeEach(() => {
    repo = new MemoryProducts();
    service = new ProductsService(repo);
  });

  it('seeds three products only when the table is empty', async () => {
    await service.onModuleInit();
    await service.onModuleInit();
    const products = await service.findAll();
    expect(products.map((product) => product.sku)).toEqual(seedProducts.map((product) => product.sku).sort());
    expect(products.every((product) => product.published)).toBe(true);
  });

  it('creates a product and rejects a duplicate sku', async () => {
    const created = await service.create({ sku: 'lamp', name: 'Lamp', price: 2500 });
    expect(created).toEqual({ sku: 'lamp', name: 'Lamp', price: 2500, published: true });
    await expect(service.create({ sku: 'lamp', name: 'Other', price: 100 })).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 for an unknown sku and updates price', async () => {
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    await service.create({ sku: 'lamp', name: 'Lamp', price: 2500 });
    await expect(service.update('lamp', { price: 2600 })).resolves.toMatchObject({ price: 2600 });
    await expect(service.update('missing', { published: false })).rejects.toBeInstanceOf(NotFoundException);
  });
});
