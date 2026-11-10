import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RoleCode } from "@prisma/client";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import * as bcrypt from "bcryptjs";
import * as ExcelJS from "exceljs";
import { ROLE_LABELS, isProductsTeam, teamsForRole } from "@ims/shared";
import type {
  ImportCommitResult,
  ImportPreviewResult,
  ImportPreviewRow,
  ImportRowStatus,
} from "@ims/shared";
import { PrismaService } from "../../common/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateUserDto, ImportDeveloperRowDto, UpdateUserDto } from "./users.dto";

const MAX_IMPORT_ROWS = 1000;

interface RawImportRow {
  name: string;
  email: string;
  title: string;
  team: string;
}

const userInclude = {
  role: true,
  teams: { include: { team: { select: { id: true, name: true } } } },
  _count: { select: { productsOwned: true } },
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      include: userInclude,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return users.map((user) => this.mapUser(user));
  }

  async owners() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: { code: { in: [RoleCode.PRODUCT_OWNER, RoleCode.ADMIN] } },
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateUserDto, actorId: string) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("A user with that email already exists");

    if (dto.role === "PEER_EVALUATOR") {
      throw new BadRequestException(
        "Peer evaluator accounts are created from Evaluator management once someone qualifies.",
      );
    }

    const role = await this.prisma.role.findUnique({ where: { code: dto.role } });
    if (!role) throw new BadRequestException("Choose a valid role");

    if (dto.teamIds?.length) {
      const teams = await this.prisma.team.findMany({
        where: { id: { in: dto.teamIds } },
        select: { name: true },
      });
      if (teams.length !== dto.teamIds.length) {
        throw new BadRequestException("One or more teams were not found");
      }
      this.assertRoleTeams(dto.role, teams);
    }

    // Developers are recorded for rostering only and never sign in, so no
    // password is issued — store an unusable random hash. Every other role
    // must be given a password.
    if (dto.role !== "DEVELOPER" && !dto.password) {
      throw new BadRequestException("A password is required for this role");
    }
    const passwordHash =
      dto.role === "DEVELOPER"
        ? await bcrypt.hash(randomUUID(), 12)
        : await bcrypt.hash(dto.password as string, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        title: dto.title?.trim() || null,
        passwordHash,
        roleId: role.id,
        teams: dto.teamIds?.length
          ? { create: dto.teamIds.map((teamId) => ({ teamId })) }
          : undefined,
      },
      include: userInclude,
    });

    await this.audit.record({
      actorId,
      action: "user.created",
      entityType: "User",
      entityId: user.id,
      summary: `Added ${user.name} as ${ROLE_LABELS[dto.role]}`,
      metadata: { email: user.email, role: dto.role },
    });

    return this.mapUser(user);
  }

  async update(id: string, dto: UpdateUserDto, actor: { id: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude,
    });
    if (!existing) throw new NotFoundException("User not found");

    if (dto.isActive === false && id === actor.id) {
      throw new BadRequestException("You cannot deactivate your own account");
    }

    if (
      dto.role &&
      dto.role !== existing.role.code &&
      (dto.role === "PEER_EVALUATOR" || existing.role.code === "PEER_EVALUATOR")
    ) {
      throw new BadRequestException(
        "Change a peer evaluator's access from Evaluator management, not the user form.",
      );
    }

    if (dto.role && dto.role !== existing.role.code && id === actor.id) {
      throw new BadRequestException("You cannot change your own role");
    }

    const losesAdminAccess =
      existing.role.code === RoleCode.ADMIN &&
      existing.isActive &&
      ((dto.role !== undefined && dto.role !== RoleCode.ADMIN) ||
        dto.isActive === false);

    if (losesAdminAccess) {
      const remainingAdmins = await this.prisma.user.count({
        where: {
          id: { not: id },
          deletedAt: null,
          isActive: true,
          role: { code: RoleCode.ADMIN },
        },
      });
      if (remainingAdmins === 0) {
        throw new BadRequestException("At least one active administrator must remain");
      }
    }

    let email: string | undefined;
    if (dto.email) {
      email = dto.email.toLowerCase().trim();
      const emailOwner = await this.prisma.user.findFirst({
        where: { email, id: { not: id } },
        select: { id: true },
      });
      if (emailOwner) {
        throw new ConflictException("A user with that email already exists");
      }
    }

    let roleId: string | undefined;
    if (dto.role) {
      const role = await this.prisma.role.findUnique({ where: { code: dto.role } });
      if (!role) throw new BadRequestException("Choose a valid role");
      roleId = role.id;
    }

    const effectiveRole = (dto.role ?? existing.role.code) as RoleCode;
    if (dto.teamIds) {
      const teams = await this.prisma.team.findMany({
        where: { id: { in: dto.teamIds } },
        select: { name: true },
      });
      if (teams.length !== dto.teamIds.length) {
        throw new BadRequestException("One or more teams were not found");
      }
      this.assertRoleTeams(effectiveRole, teams);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          email,
          title: dto.title === undefined ? undefined : dto.title?.trim() || null,
          roleId,
          isActive: dto.isActive,
        },
      });

      if (dto.teamIds) {
        await tx.userTeam.deleteMany({ where: { userId: id } });
        if (dto.teamIds.length) {
          await tx.userTeam.createMany({
            data: dto.teamIds.map((teamId) => ({ userId: id, teamId })),
          });
        }
      } else if (dto.role && dto.role !== existing.role.code) {
        // A role change without an explicit team list must not leave
        // memberships that violate the new role's team rule.
        const allowed = new Set(
          teamsForRole(
            existing.teams.map((membership) => membership.team),
            effectiveRole,
          ).map((team) => team.id),
        );
        const removed = existing.teams
          .filter((membership) => !allowed.has(membership.team.id))
          .map((membership) => membership.team.id);
        if (removed.length) {
          await tx.userTeam.deleteMany({
            where: { userId: id, teamId: { in: removed } },
          });
        }
      }
    });

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: userInclude,
    });

    const statusChanged = existing.isActive !== updated.isActive;
    const action = statusChanged
      ? updated.isActive
        ? "user.activated"
        : "user.deactivated"
      : "user.updated";
    const summary = statusChanged
      ? `${updated.isActive ? "Activated" : "Deactivated"} ${updated.name}`
      : `Updated ${updated.name}`;

    await this.audit.record({
      actorId: actor.id,
      action,
      entityType: "User",
      entityId: id,
      summary,
      before: {
        name: existing.name,
        email: existing.email,
        role: existing.role.code,
        isActive: existing.isActive,
      },
      after: {
        name: updated.name,
        email: updated.email,
        role: updated.role.code,
        isActive: updated.isActive,
      },
    });

    return this.mapUser(updated);
  }

  async remove(id: string, actor: { id: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude,
    });
    if (!existing) throw new NotFoundException("User not found");

    if (id === actor.id) {
      throw new BadRequestException("You cannot delete your own account");
    }

    if (existing.role.code === RoleCode.ADMIN && existing.isActive) {
      const remainingAdmins = await this.prisma.user.count({
        where: {
          id: { not: id },
          deletedAt: null,
          isActive: true,
          role: { code: RoleCode.ADMIN },
        },
      });
      if (remainingAdmins === 0) {
        throw new BadRequestException("At least one active administrator must remain");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await tx.team.updateMany({ where: { leadId: id }, data: { leadId: null } });
      await tx.userTeam.deleteMany({ where: { userId: id } });
    });

    await this.audit.record({
      actorId: actor.id,
      action: "user.deleted",
      entityType: "User",
      entityId: id,
      summary: `Deleted ${existing.name}`,
      before: {
        name: existing.name,
        email: existing.email,
        role: existing.role.code,
        isActive: existing.isActive,
      },
      metadata: { ownedProductCount: existing._count.productsOwned },
    });

    return { success: true };
  }

  async previewImport(file?: Express.Multer.File): Promise<ImportPreviewResult> {
    if (!file || !file.buffer || !file.buffer.length) {
      throw new BadRequestException("Upload a CSV or Excel file to import developers.");
    }
    const parsed = await this.readDeveloperSheet(file);
    // The Products team holds product owners, so it is not a valid import group.
    const teams = (
      await this.prisma.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    ).filter((team) => !isProductsTeam(team.name));
    const existingEmails = await this.existingEmailsFor(parsed.rows.map((r) => r.email));
    const rows = this.classifyRows(parsed.rows, teams, existingEmails);
    return {
      rows,
      counts: this.countStatuses(rows),
      teams,
      fileName: parsed.fileName,
      truncated: parsed.truncated,
    };
  }

  async commitImport(
    rows: ImportDeveloperRowDto[],
    actorId: string,
  ): Promise<ImportCommitResult> {
    const raw: RawImportRow[] = rows.map((row) => ({
      name: (row.name ?? "").trim(),
      email: (row.email ?? "").trim(),
      title: (row.title ?? "").trim(),
      team: (row.team ?? "").trim(),
    }));
    if (!raw.length) throw new BadRequestException("There is nothing to import.");

    const teams = (
      await this.prisma.team.findMany({ select: { id: true, name: true } })
    ).filter((team) => !isProductsTeam(team.name));
    const classified = this.classifyRows(raw, teams, await this.existingEmailsFor(raw.map((r) => r.email)));
    const eligible = classified.filter((row) => row.status === "new");

    const created: ImportCommitResult["created"] = [];
    const skipped: ImportCommitResult["skipped"] = [];

    if (eligible.length) {
      const role = await this.prisma.role.findUnique({ where: { code: RoleCode.DEVELOPER } });
      if (!role) {
        throw new BadRequestException(
          "The developer role is missing. Ask an admin to run the database seed.",
        );
      }
      // Developers never sign in, so store a single unusable random hash.
      const devHash = await bcrypt.hash(randomUUID(), 12);

      for (const row of eligible) {
        const team = teams.find((t) => t.name.toLowerCase() === (row.team ?? "").toLowerCase());
        try {
          const user = await this.prisma.user.create({
            data: {
              name: row.name,
              email: row.email,
              title: row.title || null,
              passwordHash: devHash,
              isActive: true,
              roleId: role.id,
              teams: team ? { create: { teamId: team.id } } : undefined,
            },
          });
          created.push({ name: user.name, email: user.email, team: team?.name ?? null });
          await this.audit.record({
            actorId,
            action: "user.created",
            entityType: "User",
            entityId: user.id,
            summary: `Imported ${user.name} as ${ROLE_LABELS.DEVELOPER}`,
            metadata: { email: user.email, role: "DEVELOPER", source: "bulk_import" },
          });
        } catch {
          skipped.push({ email: row.email, reason: "Email already exists" });
        }
      }
    }

    for (const row of classified) {
      if (row.status !== "new") {
        skipped.push({ email: row.email, reason: row.reasons[0] ?? "Not eligible" });
      }
    }

    return { created, skipped, counts: { created: created.length, skipped: skipped.length } };
  }

  private assertRoleTeams(role: RoleCode, teams: { name: string }[]) {
    if (role !== RoleCode.DEVELOPER && teams.some((team) => !isProductsTeam(team.name))) {
      throw new BadRequestException(
        "Admins, product owners and evaluators belong to the Products team, not the developer groups",
      );
    }
    if (role === RoleCode.DEVELOPER && teams.some((team) => isProductsTeam(team.name))) {
      throw new BadRequestException(
        "The Products team is for product owners. Choose a developer group instead.",
      );
    }
  }

  private async existingEmailsFor(emails: string[]): Promise<Set<string>> {
    const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    if (!normalized.length) return new Set();
    const found = await this.prisma.user.findMany({
      where: { email: { in: normalized } },
      select: { email: true },
    });
    return new Set(found.map((u) => u.email.toLowerCase()));
  }

  private async readDeveloperSheet(
    file: Express.Multer.File,
  ): Promise<{ rows: RawImportRow[]; truncated: boolean; fileName: string }> {
    const fileName = file.originalname || "upload";
    const looksCsv = /\.csv$/i.test(fileName) || /csv/i.test(file.mimetype || "");
    const data = Buffer.from(file.buffer);

    const loadInto = async (kind: "csv" | "xlsx") => {
      const workbook = new ExcelJS.Workbook();
      if (kind === "csv") {
        await workbook.csv.read(Readable.from(data));
      } else {
        // exceljs's Buffer typing predates @types/node's generic Buffer; Buffer
        // is a Uint8Array, so accept it structurally. Cast the reader object,
        // not the method — load() needs its `this` receiver.
        const xlsx = workbook.xlsx as unknown as {
          load(bytes: Uint8Array): Promise<ExcelJS.Workbook>;
        };
        await xlsx.load(data);
      }
      return workbook;
    };

    let workbook: ExcelJS.Workbook;
    try {
      workbook = await loadInto(looksCsv ? "csv" : "xlsx");
    } catch {
      workbook = await loadInto(looksCsv ? "xlsx" : "csv");
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException("That file has no readable sheet.");

    // Excel stores hyperlinks (auto-linked emails), rich text and formulas as
    // objects, so unwrap them to plain text before trimming.
    const cellText = (value: ExcelJS.CellValue): string => {
      if (value === null || value === undefined) return "";
      if (typeof value !== "object") return String(value);
      if (value instanceof Date) return value.toISOString();
      const v = value as unknown as Record<string, unknown>;
      if ("richText" in v && Array.isArray(v.richText)) {
        return (v.richText as { text: string }[]).map((part) => part.text).join("");
      }
      if ("result" in v && v.result !== undefined) return cellText(v.result as ExcelJS.CellValue);
      if ("text" in v && v.text !== undefined) return cellText(v.text as ExcelJS.CellValue);
      if (typeof v.hyperlink === "string") return v.hyperlink.replace(/^mailto:/i, "");
      return "";
    };

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => {
      headers[col] = cellText(cell.value).trim().toLowerCase();
    });
    const column = (synonyms: string[]) =>
      headers.findIndex((header) => header && synonyms.includes(header));

    const nameCol = column(["name", "full name", "developer", "employee", "person"]);
    const emailCol = column(["email", "e-mail", "email address"]);
    const titleCol = column(["title", "job title", "position", "designation"]);
    const teamCol = column(["team", "group", "department", "division", "unit"]);

    if (nameCol < 0 || emailCol < 0) {
      throw new BadRequestException(
        "We need at least 'Name' and 'Email' columns. Download the template to see the exact headers.",
      );
    }

    const read = (row: ExcelJS.Row, col: number) =>
      col > 0 ? cellText(row.getCell(col).value).replace(/^mailto:/i, "").trim() : "";

    const rows: RawImportRow[] = [];
    let truncated = false;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const record: RawImportRow = {
        name: read(row, nameCol),
        email: read(row, emailCol),
        title: read(row, titleCol),
        team: read(row, teamCol),
      };
      if (!record.name && !record.email && !record.title && !record.team) return;
      if (rows.length >= MAX_IMPORT_ROWS) {
        truncated = true;
        return;
      }
      rows.push(record);
    });

    return { rows, truncated, fileName };
  }

  private classifyRows(
    rows: RawImportRow[],
    teams: { id: string; name: string }[],
    existingEmails: Set<string>,
  ): ImportPreviewRow[] {
    const teamByName = new Map(teams.map((team) => [team.name.toLowerCase(), team]));
    const seen = new Set<string>();

    return rows.map((row, index) => {
      const reasons: string[] = [];
      const email = row.email.trim().toLowerCase();
      const name = row.name.trim();
      const teamName = row.team.trim();
      const teamMatch = teamName ? teamByName.get(teamName.toLowerCase()) : undefined;
      let status: ImportRowStatus = "new";

      if (name.length < 2) {
        reasons.push("Name is required (2+ characters)");
        status = "invalid";
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        reasons.push("A valid email is required");
        status = "invalid";
      } else if (status !== "invalid" && teamName && !teamMatch) {
        reasons.push(`Unknown group: ${teamName}`);
        status = "unknown_team";
      } else if (status !== "invalid") {
        if (seen.has(email)) {
          reasons.push("Duplicate email in this file");
          status = "duplicate";
        } else if (existingEmails.has(email)) {
          reasons.push("A user with this email already exists");
          status = "duplicate";
        }
      }
      seen.add(email);

      return {
        index: index + 1,
        name: name || email || `Row ${index + 1}`,
        email,
        title: row.title.trim() || null,
        team: teamMatch ? teamMatch.name : teamName || null,
        status,
        reasons,
      };
    });
  }

  private countStatuses(rows: ImportPreviewRow[]): ImportPreviewResult["counts"] {
    const counts: ImportPreviewResult["counts"] = {
      total: rows.length,
      new: 0,
      duplicate: 0,
      unknownTeam: 0,
      invalid: 0,
    };
    for (const row of rows) {
      if (row.status === "new") counts.new += 1;
      else if (row.status === "duplicate") counts.duplicate += 1;
      else if (row.status === "unknown_team") counts.unknownTeam += 1;
      else counts.invalid += 1;
    }
    return counts;
  }

  private mapUser(user: UserWithRelations) {
    const role = user.role.code as RoleCode;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
      role,
      roleLabel: ROLE_LABELS[role] ?? user.role.name,
      isActive: user.isActive,
      teams: user.teams.map((membership) => membership.team),
      ownedProductCount: user._count.productsOwned,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
