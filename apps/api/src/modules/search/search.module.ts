import { Module } from "@nestjs/common";
import { ProductsModule } from "../products/products.module";
import { IdeasModule } from "../ideas/ideas.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [ProductsModule, IdeasModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
