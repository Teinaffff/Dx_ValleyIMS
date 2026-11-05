import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { PublicProductsController } from "./public-products.controller";
import { ProductsService } from "./products.service";

@Module({
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
