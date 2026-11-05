import { Injectable } from "@nestjs/common";
import {
  PERMISSIONS,
  stageLabel,
  type GlobalSearchResults,
} from "@ims/shared";
import { PrismaService } from "../../common/prisma.service";
import { AuthUser } from "../../common/auth-user";
import { ProductsService } from "../products/products.service";
import { ListProductsDto } from "../products/products.dto";
import { IdeasService } from "../ideas/ideas.service";
import { ListIdeasDto } from "../ideas/ideas.dto";

const PER_GROUP = 4;

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly ideasService: IdeasService,
  ) {}

  async search(rawQuery: string, user: AuthUser): Promise<GlobalSearchResults> {
    const query = (rawQuery ?? "").trim().slice(0, 60);
    if (query.length < 2) return { query, total: 0, groups: [] };

    const can = (permission: string) =>
      user.role === "ADMIN" || user.permissions.includes(permission);
    const contains = { contains: query, mode: "insensitive" as const };
    const ideaHref = `/admin/ideas?q=${encodeURIComponent(query)}`;
    const userHref = `/admin/users?q=${encodeURIComponent(query)}`;

    const [products, ideas, teams, people] = await Promise.all([
      can(PERMISSIONS.PRODUCT_VIEW_ALL) || can(PERMISSIONS.PRODUCT_VIEW_OWN)
        ? this.productsService
            .list(
              {
                search: query,
                page: 1,
                pageSize: PER_GROUP,
                sort: "updated_desc",
              } as ListProductsDto,
              user,
            )
            .then((result) => result.items)
        : Promise.resolve([]),
      can(PERMISSIONS.IDEA_VIEW)
        ? this.ideasService
            .list({
              q: query,
              status: "all",
              sort: "newest",
              page: 1,
              pageSize: PER_GROUP,
            } as ListIdeasDto)
            .then((result) => result.items)
        : Promise.resolve([]),
      this.prisma.team.findMany({
        where: { isArchived: false, name: contains },
        select: { id: true, name: true, description: true },
        orderBy: { name: "asc" },
        take: PER_GROUP,
      }),
      can(PERMISSIONS.USER_MANAGE)
        ? this.prisma.user.findMany({
            where: {
              deletedAt: null,
              OR: [{ name: contains }, { email: contains }, { title: contains }],
            },
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              role: { select: { name: true } },
            },
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
            take: PER_GROUP,
          })
        : Promise.resolve([]),
    ]);

    const groups = [
      {
        group: "products" as const,
        label: "Products",
        items: products.map((product) => ({
          id: product.id,
          label: product.name,
          detail: product.owner.name,
          meta: stageLabel(product.stage),
          href: `/admin/products/${product.id}`,
        })),
      },
      {
        group: "ideas" as const,
        label: "Ideas",
        items: ideas.map((idea) => ({
          id: idea.id,
          label: idea.title,
          detail: idea.submitter.name,
          meta: titleCase(idea.status),
          href: ideaHref,
        })),
      },
      {
        group: "teams" as const,
        label: "Teams",
        items: teams.map((team) => ({
          id: team.id,
          label: team.name,
          detail: team.description,
          meta: "Portfolio",
          href: `/admin/products?teamId=${team.id}`,
        })),
      },
      {
        group: "people" as const,
        label: "People",
        items: people.map((person) => ({
          id: person.id,
          label: person.name,
          detail: person.email,
          meta: person.role.name,
          href: userHref,
        })),
      },
    ].filter((group) => group.items.length > 0);

    return {
      query,
      total: groups.reduce((sum, group) => sum + group.items.length, 0),
      groups,
    };
  }
}
