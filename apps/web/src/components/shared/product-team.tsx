"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import type {
  ProductDetail,
  ProductMemberRef,
  RosterCandidate,
  UserRef,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";

const roleTone: Record<string, string> = {
  DEVELOPER: "bg-canvas text-ink/50 ring-1 ring-inset ring-line",
  PRODUCT_OWNER: "bg-primary-soft text-primary",
  ADMIN: "bg-ink text-white",
  EVALUATOR: "bg-soft text-ink/60",
};

function teamKey(team: { name: string }) {
  return team.name;
}

function MemberChip({ member }: { member: ProductMemberRef }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5">
      <UserAvatar name={member.name} src={member.avatarUrl} className="h-6 w-6" />
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold leading-tight">{member.name}</p>
        <p className="truncate text-[10px] leading-tight text-muted">
          {[member.title, ...member.teams.map((t) => t.name)].filter(Boolean).join(" · ") ||
            member.roleLabel}
        </p>
      </div>
    </div>
  );
}

export function ProductTeam({
  productId,
  initialMembers,
  owner,
  canManage,
}: {
  productId: string;
  initialMembers: ProductMemberRef[];
  owner: UserRef | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [members, setMembers] = React.useState(initialMembers);
  const [candidates, setCandidates] = React.useState<RosterCandidate[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<ProductMemberRef | null>(null);

  async function loadCandidates() {
    setLoadingCandidates(true);
    try {
      const next = await apiFetch<RosterCandidate[]>(
        `/api/products/${productId}/members/candidates`,
      );
      setCandidates(next);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not load the roster picker.",
      );
    } finally {
      setLoadingCandidates(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && !candidates && !loadingCandidates) void loadCandidates();
  }

  async function addMember(person: RosterCandidate) {
    setBusyId(person.id);
    try {
      const updated = await apiFetch<ProductDetail>(`/api/products/${productId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: person.id }),
      });
      setMembers(updated.members);
      setCandidates((prev) => (prev ? prev.filter((c) => c.id !== person.id) : prev));
      toast.success(`${person.name} added to the team`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not add that person.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusyId(removing.id);
    try {
      const updated = await apiFetch<ProductDetail>(
        `/api/products/${productId}/members/${removing.id}`,
        { method: "DELETE" },
      );
      setMembers(updated.members);
      setCandidates((prev) =>
        prev
          ? [
              ...prev,
              {
                id: removing.id,
                name: removing.name,
                email: removing.email,
                title: removing.title,
                avatarUrl: removing.avatarUrl,
                role: removing.role,
                roleLabel: removing.roleLabel,
                teams: removing.teams,
              },
            ]
          : prev,
      );
      toast.success(`${removing.name} removed from the team`);
      setRemoving(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not remove that person.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const grouped = React.useMemo(() => {
    const needle = term.trim().toLowerCase();
    const pool = (candidates ?? []).filter((person) =>
      needle
        ? [person.name, person.email, person.title ?? "", ...person.teams.map((t) => t.name)]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        : true,
    );
    const map = new Map<string, RosterCandidate[]>();
    for (const person of pool) {
      const keys = person.teams.length ? person.teams.map(teamKey) : ["Unassigned"];
      for (const key of keys) {
        const bucket = map.get(key) ?? [];
        if (!bucket.some((item) => item.id === person.id)) bucket.push(person);
        map.set(key, bucket);
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [candidates, term]);

  const groupedMembers = React.useMemo(() => {
    const map = new Map<string, ProductMemberRef[]>();
    for (const member of members) {
      const keys = member.teams.length ? member.teams.map(teamKey) : ["Unassigned"];
      for (const key of keys) {
        const bucket = map.get(key) ?? [];
        if (!bucket.some((item) => item.id === member.id)) bucket.push(member);
        map.set(key, bucket);
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [members]);

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps mb-1.5">Team</p>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Delivery roster
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">
            {members.length} {members.length === 1 ? "developer" : "developers"}
          </span>
          {canManage ? (
            <Dialog open={open} onOpenChange={onOpenChange}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <UserPlus className="h-4 w-4" /> Add developers
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <p className="label-caps">Team</p>
                  <DialogTitle>Add developers to this team</DialogTitle>
                  <DialogDescription>
                    Pick developers from each delivery group. They gain no portal access —
                    they appear here and can be set as milestone owners. The product owner is
                    separate and is not added to this roster.
                  </DialogDescription>
                </DialogHeader>
                <input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Search name, email or team"
                  className="mb-3 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-primary/40"
                  aria-label="Search people to assign"
                />
                <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
                  {loadingCandidates ? (
                    <p className="flex items-center gap-2 py-6 text-sm text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading people…
                    </p>
                  ) : grouped.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">
                      Every developer is already on this team.
                    </p>
                  ) : (
                    grouped.map(([teamName, people]) => (
                      <div key={teamName}>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                          {teamName}
                        </p>
                        <div className="space-y-1.5">
                          {people.map((person) => (
                            <div
                              key={`${teamName}-${person.id}`}
                              className="flex items-center gap-3 rounded-2xl border border-line/70 bg-canvas/40 px-3 py-2"
                            >
                              <UserAvatar
                                name={person.name}
                                src={person.avatarUrl}
                                className="h-8 w-8"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold">
                                  {person.name}
                                </p>
                                <p className="truncate text-[11px] text-muted">
                                  {person.title ?? person.email}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold sm:inline-flex",
                                  roleTone[person.role] ?? "bg-canvas text-ink/60",
                                )}
                              >
                                {person.roleLabel}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void addMember(person)}
                                disabled={busyId === person.id}
                              >
                                {busyId === person.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="label-caps mb-2">Product owner</p>
          {owner ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/40 py-1 pl-1 pr-3">
              <UserAvatar name={owner.name} src={owner.avatarUrl} className="h-6 w-6" />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold leading-tight text-primary">
                  {owner.name}
                </p>
                <p className="text-[10px] leading-tight text-primary/70">
                  Runs the product · set in product details
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted">No owner assigned.</p>
          )}
        </div>

        <div>
          <p className="label-caps mb-2">Developers</p>
          {groupedMembers.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-2xl bg-canvas/60 px-4 py-3 text-[12px] text-muted">
              <Users className="h-4 w-4" />
              No developers assigned yet.{" "}
              {canManage
                ? "Use Add developers to build the team."
                : "The owner can add developers."}
            </div>
          ) : (
            <div className="space-y-3">
              {groupedMembers.map(([teamName, people]) => (
                <div key={teamName}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    {teamName}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {people.map((member) =>
                      canManage ? (
                        <span key={`${teamName}-${member.id}`} className="group/relative relative inline-flex">
                          <MemberChip member={member} />
                          <button
                            type="button"
                            onClick={() => setRemoving(member)}
                            aria-label={`Remove ${member.name}`}
                            className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-ink text-white shadow transition group-hover/relative:inline-flex"
                          >
                            {busyId === member.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </button>
                        </span>
                      ) : (
                        <MemberChip key={`${teamName}-${member.id}`} member={member} />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmActionDialog
        open={!!removing}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        tone="warning"
        icon={<X className="h-5 w-5" />}
        title={<>Remove {removing?.name} from this team?</>}
        description="They are taken off the delivery roster for this product."
        consequencesLabel="What changes"
        consequences={[
          "They can no longer be chosen as a milestone owner on this product",
          "Any milestones they own here become unassigned",
          "Their account and other products are untouched",
        ]}
        cancelLabel="Keep on team"
        confirmLabel="Remove from team"
        busyLabel="Removing…"
        onConfirm={confirmRemove}
      />
    </section>
  );
}
