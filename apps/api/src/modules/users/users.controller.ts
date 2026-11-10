import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PERMISSIONS } from "@ims/shared";
import { UsersService } from "./users.service";
import { CommitImportDto, CreateUserDto, UpdateUserDto } from "./users.dto";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthUser } from "../../common/auth-user";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("owners")
  @RequirePermissions(PERMISSIONS.PRODUCT_CREATE)
  owners() {
    return this.usersService.owners();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  list() {
    return this.usersService.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.create(dto, user.id);
  }

  @Post("import/preview")
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  previewImport(@UploadedFile() file?: Express.Multer.File) {
    return this.usersService.previewImport(file);
  }

  @Post("import")
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  commitImport(@Body() dto: CommitImportDto, @CurrentUser() user: AuthUser) {
    return this.usersService.commitImport(dto.rows, user.id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.remove(id, user);
  }
}
