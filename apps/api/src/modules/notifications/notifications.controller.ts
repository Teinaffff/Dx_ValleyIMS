import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { PERMISSIONS } from "@ims/shared";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth-user";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@RequirePermissions(PERMISSIONS.NOTIFICATION_VIEW)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notificationsService.list(user.id);
  }

  @Post("read-all")
  @HttpCode(200)
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Post(":id/read")
  @HttpCode(200)
  markRead(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markRead(id, user.id);
  }
}
