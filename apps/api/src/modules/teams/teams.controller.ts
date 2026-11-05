import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { PERMISSIONS } from "@ims/shared";
import { TeamsService } from "./teams.service";
import { CreateTeamDto, UpdateTeamDto } from "./teams.dto";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth-user";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  list() {
    return this.teamsService.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.TEAM_MANAGE)
  create(@Body() dto: CreateTeamDto, @CurrentUser() user: AuthUser) {
    return this.teamsService.create(dto, user.id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.TEAM_MANAGE)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.teamsService.update(id, dto, user.id);
  }
}
