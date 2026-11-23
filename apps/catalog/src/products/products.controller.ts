import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { errorBodySchema, openApiSchema, skuSchema } from '@market/contracts';
import { ProductsService } from './products.service.js';
import { createProductSchema, patchProductSchema, productViewSchema, type CreateProduct, type PatchProduct } from './products.schemas.js';

const productDoc = openApiSchema(productViewSchema);
const errorDoc = openApiSchema(errorBodySchema);

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @ApiCreatedResponse({ schema: productDoc })
  @ApiBadRequestResponse({ schema: errorDoc })
  @ApiConflictResponse({ schema: errorDoc })
  create(@Body({ schema: createProductSchema }) body: CreateProduct) {
    return this.products.create(body);
  }

  @Get()
  @ApiOkResponse({ schema: { type: 'array', items: productDoc } })
  findAll() {
    return this.products.findAll();
  }

  @Get(':sku')
  @ApiOkResponse({ schema: productDoc })
  @ApiNotFoundResponse({ schema: errorDoc })
  findOne(@Param('sku', { schema: skuSchema }) sku: string) {
    return this.products.findOne(sku);
  }

  @Patch(':sku')
  @ApiOkResponse({ schema: productDoc })
  @ApiBadRequestResponse({ schema: errorDoc })
  @ApiNotFoundResponse({ schema: errorDoc })
  update(@Param('sku', { schema: skuSchema }) sku: string, @Body({ schema: patchProductSchema }) body: PatchProduct) {
    return this.products.update(sku, body);
  }
}
