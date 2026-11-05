import { Module } from "@nestjs/common";
import { IdeasService } from "./ideas.service";
import { IdeasController, PublicIdeasController } from "./ideas.controller";

@Module({
  controllers: [PublicIdeasController, IdeasController],
  providers: [IdeasService],
  exports: [IdeasService],
})
export class IdeasModule {}
