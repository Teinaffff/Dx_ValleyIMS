import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PERMISSIONS } from "@ims/shared";
import { GatesService } from "./gates.service";
import { GateDecisionDto, SubmitGateDto } from "./gates.dto";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth-user";

@Controller("products/:productId/gate")
export class GatesController {
  constructor(private readonly gatesService: GatesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.GATE_VIEW)
  state(@Param("productId") productId: string, @CurrentUser() user: AuthUser) {
    return this.gatesService.state(productId, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.GATE_SUBMIT)
  submit(
    @Param("productId") productId: string,
    @Body() dto: SubmitGateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gatesService.submit(productId, dto, user);
  }

  @Post("decision")
  @RequirePermissions(PERMISSIONS.GATE_DECIDE)
  decide(
    @Param("productId") productId: string,
    @Body() dto: GateDecisionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.gatesService.decide(productId, dto, user);
  }
}
