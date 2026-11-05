import { Module } from "@nestjs/common";
import { GatesService } from "./gates.service";
import { GatesController } from "./gates.controller";

@Module({
  controllers: [GatesController],
  providers: [GatesService],
})
export class GatesModule {}
