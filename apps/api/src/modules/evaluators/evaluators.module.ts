import { Module } from "@nestjs/common";
import { AssessmentService } from "./assessment.service";
import { EvaluatorsAdminService } from "./evaluators-admin.service";
import { EvaluatorsAdminController, PublicEvaluatorController } from "./evaluators.controller";

@Module({
  controllers: [PublicEvaluatorController, EvaluatorsAdminController],
  providers: [AssessmentService, EvaluatorsAdminService],
})
export class EvaluatorsModule {}
