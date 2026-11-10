import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PERMISSIONS } from "@ims/shared";
import type { AuthUser } from "../../common/auth-user";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { AssessmentService } from "./assessment.service";
import { EvaluatorsAdminService } from "./evaluators-admin.service";
import {
  ApplyEvaluatorDto,
  AssignProductsDto,
  AuthorizeDto,
  ConfigDto,
  ListApplicantsDto,
  ListQuestionsDto,
  NoteDto,
  QuestionDto,
  SaveAnswersDto,
  UpdateAuthorizationDto,
  UpdateQuestionDto,
} from "./evaluators.dto";

/**
 * Staff apply and take the assessment without a portal account. They are
 * identified by their work email plus the access code issued when they apply.
 */
@Public()
@Controller("public/evaluator")
export class PublicEvaluatorController {
  constructor(private readonly assessment: AssessmentService) {}

  @Get("info")
  info() {
    return this.assessment.info();
  }

  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post("apply")
  @HttpCode(201)
  apply(@Body() dto: ApplyEvaluatorDto) {
    return this.assessment.apply(dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get("status")
  status(
    @Headers("x-evaluator-email") email?: string,
    @Headers("x-evaluator-code") code?: string,
  ) {
    return this.assessment.status(email, code);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("attempts")
  @HttpCode(201)
  start(
    @Headers("x-evaluator-email") email?: string,
    @Headers("x-evaluator-code") code?: string,
  ) {
    return this.assessment.start(email, code);
  }

  @Get("attempts/:id")
  resume(
    @Param("id") id: string,
    @Headers("x-evaluator-email") email?: string,
    @Headers("x-evaluator-code") code?: string,
  ) {
    return this.assessment.resume(id, email, code);
  }

  @Put("attempts/:id/answers")
  save(
    @Param("id") id: string,
    @Body() dto: SaveAnswersDto,
    @Headers("x-evaluator-email") email?: string,
    @Headers("x-evaluator-code") code?: string,
  ) {
    return this.assessment.saveAnswers(id, dto.answers, email, code);
  }

  @Post("attempts/:id/submit")
  @HttpCode(200)
  submit(
    @Param("id") id: string,
    @Body() dto: SaveAnswersDto,
    @Headers("x-evaluator-email") email?: string,
    @Headers("x-evaluator-code") code?: string,
  ) {
    return this.assessment.submit(id, dto.answers, email, code);
  }
}

@Controller("admin/evaluators")
@RequirePermissions(PERMISSIONS.EVALUATOR_MANAGE)
export class EvaluatorsAdminController {
  constructor(private readonly admin: EvaluatorsAdminService) {}

  @Get("overview")
  overview() {
    return this.admin.overview();
  }

  @Get("applicants")
  applicants(@Query() query: ListApplicantsDto) {
    return this.admin.listApplicants(query);
  }

  @Get("applicants/:id")
  applicant(@Param("id") id: string) {
    return this.admin.applicant(id);
  }

  @Post("applicants/:id/authorize")
  @HttpCode(200)
  authorize(@Param("id") id: string, @Body() dto: AuthorizeDto, @CurrentUser() user: AuthUser) {
    return this.admin.authorize(id, dto, user);
  }

  @Patch("applicants/:id/authorization")
  updateAuthorization(
    @Param("id") id: string,
    @Body() dto: UpdateAuthorizationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.updateAuthorization(id, dto, user);
  }

  @Post("applicants/:id/reject")
  @HttpCode(200)
  reject(@Param("id") id: string, @Body() dto: NoteDto, @CurrentUser() user: AuthUser) {
    return this.admin.reject(id, dto.note, user);
  }

  @Post("applicants/:id/suspend")
  @HttpCode(200)
  suspend(@Param("id") id: string, @Body() dto: NoteDto, @CurrentUser() user: AuthUser) {
    return this.admin.suspend(id, dto.note, user);
  }

  @Post("applicants/:id/reinstate")
  @HttpCode(200)
  reinstate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.admin.reinstate(id, user);
  }

  @Post("applicants/:id/revoke")
  @HttpCode(200)
  revoke(@Param("id") id: string, @Body() dto: NoteDto, @CurrentUser() user: AuthUser) {
    return this.admin.revoke(id, dto.note, user);
  }

  @Put("applicants/:id/products")
  assign(@Param("id") id: string, @Body() dto: AssignProductsDto, @CurrentUser() user: AuthUser) {
    return this.admin.assignProducts(id, dto, user);
  }

  @Get("events")
  events(@Query("limit", new ParseIntPipe({ optional: true })) limit?: number) {
    return this.admin.events(limit);
  }

  @Get("questions")
  questions(@Query() query: ListQuestionsDto) {
    return this.admin.listQuestions(query);
  }

  @Post("questions")
  @HttpCode(201)
  createQuestion(@Body() dto: QuestionDto, @CurrentUser() user: AuthUser) {
    return this.admin.createQuestion(dto, user);
  }

  @Patch("questions/:id")
  updateQuestion(
    @Param("id") id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.admin.updateQuestion(id, dto, user);
  }

  @Delete("questions/:id")
  deleteQuestion(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.admin.deleteQuestion(id, user);
  }

  @Get("config")
  config() {
    return this.admin.config();
  }

  @Put("config")
  updateConfig(@Body() dto: ConfigDto, @CurrentUser() user: AuthUser) {
    return this.admin.updateConfig(dto, user);
  }
}
