import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import { ProductEntity } from './product.entity.js';
import { ProductsRepository, SkuAlreadyExistsError } from './products.repository.js';
import type { PatchProduct, ProductView } from './products.schemas.js';

@Injectable()
export class TypeOrmProductsRepository extends ProductsRepository {
  constructor(@InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>) {
    super();
  }

  async insert(product: ProductView): Promise<ProductView> {
    try {
      await this.products.insert({
        sku: product.sku,
        name: product.name,
        price: product.price,
        published: product.published,
      });
      return product;
    } catch (error) {
      if (isUniqueViolation(error)) throw new SkuAlreadyExistsError(product.sku);
      throw error;
    }
  }

  async findAll(): Promise<ProductView[]> {
    const rows = await this.products.find({ order: { sku: 'ASC' } });
    return rows.map(toView);
  }

  async findBySku(sku: string): Promise<ProductView | null> {
    const row = await this.products.findOneBy({ sku });
    return row ? toView(row) : null;
  }

  async update(sku: string, patch: PatchProduct): Promise<ProductView | null> {
    const changes: { price?: number; published?: boolean } = {};
    if (patch.price !== undefined) changes.price = patch.price;
    if (patch.published !== undefined) changes.published = patch.published;
    const result = await this.products.update({ sku }, changes);
    if (!result.affected) return null;
    const row = await this.products.findOneByOrFail({ sku });
    return toView(row);
  }

  async count(): Promise<number> {
    return this.products.count();
  }
}

function toView(row: ProductEntity): ProductView {
  return { sku: row.sku, name: row.name, price: row.price, published: row.published };
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string };
  return driverError.code === '23505';
}
