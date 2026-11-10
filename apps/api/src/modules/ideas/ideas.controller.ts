import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { MAX_FILES, MAX_FILE_BYTES } from "./attachments";
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
  ParkIdeaDto,
  ReissueIdeaCodeDto,
  RejectIdeaDto,
  ScoreIdeaDto,
  TrackIdeaDto,
  UpdateIdeaStatusDto,
} from "./ideas.dto";
import { CreateProductDto } from "../products/products.dto";
import { IdeasService } from "./ideas.service";

@Public()
@Controller("public/ideas")
export class PublicIdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  // POST so the access code and email never end up in a URL or access log.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("track")
  @HttpCode(200)
  track(@Body() dto: TrackIdeaDto) {
    return this.ideasService.track(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post("track/reissue")
  @HttpCode(200)
  reissue(@Body() dto: ReissueIdeaCodeDto) {
    return this.ideasService.reissueCode(dto.reference, dto.email);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES, {
      limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
    }),
  )
  submit(
    @Body() dto: CreatePublicIdeaDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    return this.ideasService.submitPublic(dto, files ?? []);
  }
}

@Controller("ideas")
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.IDEA_VIEW)
  list(@Query() query: ListIdeasDto, @CurrentUser() user: AuthUser) {
    return this.ideasService.list(query, user.id);
  }

  @Put(":id/score")
  @RequirePermissions(PERMISSIONS.IDEA_REVIEW)
  score(
    @Param("id") id: string,
    @Body() dto: ScoreIdeaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ideasService.score(id, dto, user);
  }

  @Get(":id/attachments/:attachmentId")
  @RequirePermissions(PERMISSIONS.IDEA_VIEW)
  async download(
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.ideasService.attachment(id, attachmentId);
    const bytes = Buffer.from(file.data);
    const total = bytes.length;
    const inline = file.kind !== "DOCUMENT" || file.mimeType === "application/pdf";
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "sandbox");
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );

    // Range support so browsers can seek inside video and audio.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
      if (start <= end && start < total) {
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
        res.setHeader("Content-Length", String(end - start + 1));
        return new StreamableFile(bytes.subarray(start, end + 1));
      }
    }
    res.setHeader("Content-Length", String(total));
    return new StreamableFile(bytes);
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

  @Post(":id/reject")
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.IDEA_APPROVE)
  reject(@Param("id") id: string, @Body() dto: RejectIdeaDto, @CurrentUser() user: AuthUser) {
    return this.ideasService.reject(id, dto, user);
  }

  @Post(":id/park")
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.IDEA_APPROVE)
  park(@Param("id") id: string, @Body() dto: ParkIdeaDto, @CurrentUser() user: AuthUser) {
    return this.ideasService.park(id, dto, user);
  }

  @Post(":id/reopen")
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.IDEA_APPROVE)
  reopen(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ideasService.reopen(id, user);
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
