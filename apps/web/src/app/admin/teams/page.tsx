import { Boxes, Users } from "lucide-react";
import type { TeamSummary } from "@ims/shared";
import { serverGet } from "@/lib/server-api";
import { PageHeader } from "@/components/ui/page-header";
import { AvatarStack } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Teams & resources" };

export default async function TeamsPage() {
  const teams = await serverGet<TeamSummary[]>("/api/teams");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Organisation"
        title="Teams & resources"
        description="The squads building DxValley products. Team membership also drives product visibility for team-restricted products."
      />

      {!teams ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Teams unavailable"
          description="The teams directory could not be loaded. Confirm the API is running and that you are signed in."
        />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No teams yet"
          description="Create the first development team in the teams management phase."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <section key={team.id} className="surface-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary-soft font-display text-sm font-bold text-primary">
                  {team.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold text-muted">
                  {team.productCount} product{team.productCount === 1 ? "" : "s"}
                </span>
              </div>

              <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
                {team.name}
              </h2>
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted">
                {team.description ?? "No team description yet."}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-canvas/70 p-3">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                    <Users className="h-3 w-3" /> Members
                  </p>
                  <p className="mt-1.5 font-display text-xl font-semibold">
                    {team.memberCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-canvas/70 p-3">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                    <Boxes className="h-3 w-3" /> Products
                  </p>
                  <p className="mt-1.5 font-display text-xl font-semibold">
                    {team.productCount}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                  Products involved
                </p>
                {team.products.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {team.products.map((product) => (
                      <a
                        key={product.id}
                        href={`/admin/products/${product.id}`}
                        className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        {product.name}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">Not involved in any product yet.</p>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/70 pt-4">
                <div className="flex items-center gap-2">
                  <AvatarStack
                    people={team.members}
                    max={4}
                    size="h-7 w-7"
                  />
                  <span className="text-[10px] text-muted">
                    {team.memberCount} {team.memberCount === 1 ? "person" : "people"}
                  </span>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
