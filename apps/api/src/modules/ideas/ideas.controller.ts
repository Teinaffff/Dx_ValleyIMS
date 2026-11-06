import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PERMISSIONS } from "@ims/shared";
import type { AuthUser } from "../../common/auth-user";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import {
  CreatePublicIdeaDto,
  DeleteIdeaDto,
  ListIdeasDto,
  UpdateIdeaStatusDto,
} from "./ideas.dto";
import { CreateProductDto } from "../products/products.dto";
import { IdeasService } from "./ideas.service";

@Public()
@Controller("public/ideas")
export class PublicIdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @HttpCode(201)
  submit(@Body() dto: CreatePublicIdeaDto) {
    return this.ideasService.submitPublic(dto);
  }
}

@Controller("ideas")
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.IDEA_VIEW)
  list(@Query() query: ListIdeasDto) {
    return this.ideasService.list(query);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.IDEA_APPROVE)
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateIdeaStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ideasService.updateStatus(id, dto, user);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.IDEA_DELETE)
  softDelete(
    @Param("id") id: string,
    @Body() dto: DeleteIdeaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ideasService.softDelete(id, dto, user);
  }

  @Post(":id/restore")
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.IDEA_RESTORE)
  restore(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ideasService.restore(id, user);
  }

  @Post(":id/convert")
  @HttpCode(201)
  @RequirePermissions(PERMISSIONS.PRODUCT_CREATE)
  convert(
    @Param("id") id: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ideasService.convert(id, dto, user);
  }
}
