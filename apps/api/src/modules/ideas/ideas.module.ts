import { Module } from "@nestjs/common";
import { IdeasService } from "./ideas.service";
import { IdeasController, PublicIdeasController } from "./ideas.controller";
import { ProductsModule } from "../products/products.module";

@Module({
  imports: [ProductsModule],
  controllers: [PublicIdeasController, IdeasController],
  providers: [IdeasService],
  exports: [IdeasService],
})
export class IdeasModule {}
