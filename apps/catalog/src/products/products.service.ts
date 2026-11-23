import { ConflictException, Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { seedProducts } from '@market/contracts';
import { ProductsRepository, SkuAlreadyExistsError } from './products.repository.js';
import type { CreateProduct, PatchProduct, ProductView } from './products.schemas.js';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(private readonly products: ProductsRepository) {}

  async onModuleInit(): Promise<void> {
    if ((await this.products.count()) > 0) return;
    for (const product of seedProducts) {
      await this.products.insert({ ...product, published: true });
    }
  }

  async create(input: CreateProduct): Promise<ProductView> {
    try {
      return await this.products.insert({
        sku: input.sku,
        name: input.name,
        price: input.price,
        published: input.published ?? true,
      });
    } catch (error) {
      if (error instanceof SkuAlreadyExistsError) {
        throw new ConflictException(`Product ${error.sku} already exists`);
      }
      throw error;
    }
  }

  async findAll(): Promise<ProductView[]> {
    return this.products.findAll();
  }

  async findOne(sku: string): Promise<ProductView> {
    const product = await this.products.findBySku(sku);
    if (!product) throw new NotFoundException(`Product ${sku} not found`);
    return product;
  }

  async update(sku: string, patch: PatchProduct): Promise<ProductView> {
    const product = await this.products.update(sku, patch);
    if (!product) throw new NotFoundException(`Product ${sku} not found`);
    return product;
  }
}
