import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { errorBodySchema, openApiSchema, skuSchema } from '@market/contracts';
import { StockService } from './stock.service.js';
import { replenishSchema, stockViewSchema, type Replenish } from './stock.schemas.js';

const stockDoc = openApiSchema(stockViewSchema);
const errorDoc = openApiSchema(errorBodySchema);

@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get(':sku')
  @ApiOkResponse({ schema: stockDoc })
  @ApiNotFoundResponse({ schema: errorDoc })
  get(@Param('sku', { schema: skuSchema }) sku: string) {
    return this.stock.get(sku);
  }

  @Post(':sku/replenish')
  @HttpCode(200)
  @ApiOkResponse({ schema: stockDoc })
  @ApiBadRequestResponse({ schema: errorDoc })
  @ApiNotFoundResponse({ schema: errorDoc })
  replenish(@Param('sku', { schema: skuSchema }) sku: string, @Body({ schema: replenishSchema }) body: Replenish) {
    return this.stock.replenish(sku, body.quantity);
  }
}
