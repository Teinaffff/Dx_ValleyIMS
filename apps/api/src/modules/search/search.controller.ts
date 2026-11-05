import { Controller, Get, Query } from "@nestjs/common";
import { AuthUser } from "../../common/auth-user";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query("q") query = "", @CurrentUser() user: AuthUser) {
    return this.searchService.search(query, user);
  }
}
