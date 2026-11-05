import { Controller, Get } from "@nestjs/common";
import { PERMISSIONS } from "@ims/shared";
import { DashboardService } from "./dashboard.service";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth-user";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PRODUCT_VIEW_ALL, PERMISSIONS.PRODUCT_VIEW_OWN)
  get(@CurrentUser() user: AuthUser) {
    return this.dashboardService.build(user);
  }
}
