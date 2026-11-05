import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { ProductsService } from "./products.service";

@Public()
@Controller("public")
export class PublicProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get("portfolio")
  portfolio() {
    return this.productsService.publicPortfolio();
  }

  @Get("products/:slug")
  product(@Param("slug") slug: string) {
    return this.productsService.publicProduct(slug);
  }
}
