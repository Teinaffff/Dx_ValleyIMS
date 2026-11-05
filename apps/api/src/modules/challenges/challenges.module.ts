import { Module } from "@nestjs/common";
import { PublicChallengesController } from "./public-challenges.controller";

@Module({
  controllers: [PublicChallengesController],
})
export class ChallengesModule {}
