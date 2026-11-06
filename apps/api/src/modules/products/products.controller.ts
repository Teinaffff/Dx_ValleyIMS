import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { PERMISSIONS } from "@ims/shared";
import { ProductsService } from "./products.service";
import {
  SetMilestoneStatusDto,
  CreateMilestoneDto,
  CreateProductDto,
  ListMilestonesDto,
  ListProductsDto,
  ReorderMilestonesDto,
  UpdateMilestoneDto,
  UpdateProductDto,
} from "./products.dto";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth-user";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get("meta")
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW_ALL, PERMISSIONS.PRODUCT_VIEW_OWN)
  meta() {
    return this.productsService.meta();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW_ALL, PERMISSIONS.PRODUCT_VIEW_OWN)
  list(@Query() query: ListProductsDto, @CurrentUser() user: AuthUser) {
    return this.productsService.list(query, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PRODUCT_CREATE)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.productsService.create(dto, user);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW_ALL, PERMISSIONS.PRODUCT_VIEW_OWN)
  detail(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.getDetail(id, user);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.PRODUCT_UPDATE)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Post(":id/archive")
  @RequirePermissions(PERMISSIONS.PRODUCT_ARCHIVE)
  archive(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.archive(id, user);
  }

  @Post(":id/restore")
  @RequirePermissions(PERMISSIONS.PRODUCT_ARCHIVE)
  restore(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.restore(id, user);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.PRODUCT_DELETE)
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.remove(id, user);
  }

  @Get(":id/milestones")
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW_ALL, PERMISSIONS.PRODUCT_VIEW_OWN)
  listMilestones(
    @Param("id") id: string,
    @Query() query: ListMilestonesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.listMilestones(id, query, user);
  }

  @Post(":id/milestones")
  @RequirePermissions(PERMISSIONS.MILESTONE_MANAGE)
  createMilestone(
    @Param("id") id: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.createMilestone(id, dto, user);
  }

  @Post(":id/milestones/reorder")
  @RequirePermissions(PERMISSIONS.MILESTONE_MANAGE)
  reorderMilestones(
    @Param("id") id: string,
    @Body() dto: ReorderMilestonesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.reorderMilestones(id, dto, user);
  }

  @Patch(":id/milestones/:milestoneId")
  @RequirePermissions(PERMISSIONS.MILESTONE_MANAGE)
  updateMilestone(
    @Param("id") id: string,
    @Param("milestoneId") milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.updateMilestone(id, milestoneId, dto, user);
  }

  @Post(":id/milestones/:milestoneId/status")
  @RequirePermissions(PERMISSIONS.MILESTONE_MANAGE)
  setMilestoneStatus(
    @Param("id") id: string,
    @Param("milestoneId") milestoneId: string,
    @Body() dto: SetMilestoneStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.setMilestoneStatus(id, milestoneId, dto, user);
  }

  @Post(":id/milestones/:milestoneId/reopen")
  @RequirePermissions(PERMISSIONS.MILESTONE_MANAGE)
  reopenMilestone(
    @Param("id") id: string,
    @Param("milestoneId") milestoneId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.reopenMilestone(id, milestoneId, user);
  }

  @Delete(":id/milestones/:milestoneId")
  @RequirePermissions(PERMISSIONS.MILESTONE_MANAGE)
  deleteMilestone(
    @Param("id") id: string,
    @Param("milestoneId") milestoneId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.deleteMilestone(id, milestoneId, user);
  }

  @Get(":id/history")
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW_ALL, PERMISSIONS.PRODUCT_VIEW_OWN)
  history(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.history(id, user);
  }
}
