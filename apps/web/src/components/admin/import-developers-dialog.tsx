"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  teamsForRole,
  type ImportCommitResult,
  type ImportPreviewResult,
  type ImportRowStatus,
  type TeamRef,
} from "@ims/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const STATUS_META: Record<ImportRowStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-success/10 text-success" },
  duplicate: { label: "Duplicate email", className: "bg-warning/10 text-warning" },
  unknown_team: { label: "Unknown group", className: "bg-warning/10 text-warning" },
  invalid: { label: "Missing fields", className: "bg-danger/10 text-danger" },
};

function downloadTemplate() {
  const blob = new Blob(["Name,Email,Title,Team\n"], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "developer-import-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function ImportDevelopersFlow({
  teams,
  onDone,
}: {
  teams: TeamRef[];
  onDone: () => void;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<ImportPreviewResult | null>(null);
  const [busy, setBusy] = React.useState<"preview" | "commit" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const groupNames = teamsForRole(teams, "DEVELOPER")
    .map((team) => team.name)
    .join(" · ");

  async function previewFile(file: File) {
    setError(null);
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setError("Choose a .csv or .xlsx file. Download the template if you need a starting point.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is larger than 2 MB. Split it into smaller files and import them separately.");
      return;
    }
    setBusy("preview");
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await apiFetch<ImportPreviewResult>("/api/users/import/preview", {
        method: "POST",
        body,
      });
      setPreview(result);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not read that file. Please try again.",
      );
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setBusy("commit");
    setError(null);
    try {
      const rows = preview.rows
        .filter((row) => row.status === "new")
        .map((row) => ({
          name: row.name,
          email: row.email,
          title: row.title ?? undefined,
          team: row.team ?? undefined,
        }));
      const result = await apiFetch<ImportCommitResult>("/api/users/import", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      toast.success(
        result.counts.skipped > 0
          ? `Imported ${result.counts.created} developers · ${result.counts.skipped} skipped`
          : `Imported ${result.counts.created} developer${result.counts.created === 1 ? "" : "s"}`,
      );
      onDone();
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not import these developers. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  const errorBanner = error ? (
    <p className="rounded-2xl bg-danger/10 px-4 py-3 text-xs font-medium text-danger">
      {error}
    </p>
  ) : null;

  if (!preview) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-canvas/60 px-4 py-3">
          <div className="text-[11px] leading-snug text-muted">
            <p className="font-semibold text-ink/75">
              Columns: Name, Email, Title, Team
            </p>
            <p className="mt-0.5">
              Name and Email are required. Team must match an existing group
              {groupNames ? `: ${groupNames}` : ""}.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> CSV template
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="sr-only"
          id="developer-import-file"
          disabled={busy !== null}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void previewFile(file);
          }}
        />
        <label
          htmlFor="developer-import-file"
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-canvas/40 px-6 py-10 text-center transition hover:border-primary/40 hover:bg-primary-soft/40",
            busy === "preview" && "pointer-events-none opacity-60",
          )}
        >
          {busy === "preview" ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <Upload className="h-6 w-6 text-muted" />
          )}
          <span className="text-sm font-semibold text-ink/80">
            {busy === "preview" ? "Reading file…" : "Choose a CSV or Excel file"}
          </span>
          <span className="text-[11px] text-muted">
            .csv or .xlsx · up to 2 MB · up to 1,000 rows
          </span>
        </label>

        {errorBanner}

        <p className="text-[11px] leading-snug text-muted">
          Imported developers join the roster only — no portal sign-in is issued.
          You will see a preview before anything is created.
        </p>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onDone} disabled={busy !== null}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const counts = preview.counts;
  const summary = [
    { label: "New", value: counts.new, className: "text-success" },
    { label: "Duplicate email", value: counts.duplicate, className: "text-warning" },
    { label: "Unknown group", value: counts.unknownTeam, className: "text-warning" },
    { label: "Missing fields", value: counts.invalid, className: "text-danger" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink/75">
          <FileSpreadsheet className="h-4 w-4" /> {preview.fileName}
        </span>
        <span>
          {counts.total} row{counts.total === 1 ? "" : "s"} found
        </span>
      </div>

      <div className="flex divide-x divide-line rounded-2xl border border-line bg-canvas/50">
        {summary.map((item) => (
          <div key={item.label} className="flex-1 px-4 py-3 text-center">
            <p className={cn("font-display text-xl font-semibold", item.className)}>
              {item.value}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      {preview.truncated ? (
        <p className="rounded-2xl bg-warning/10 px-4 py-3 text-xs font-medium text-warning">
          Only the first 1,000 rows were read. Import this batch, then split the file
          and import the rest separately.
        </p>
      ) : null}

      {counts.unknownTeam > 0 ? (
        <p className="rounded-2xl bg-warning/10 px-4 py-3 text-xs font-medium text-warning">
          Rows with an unknown group are skipped. Use one of: {groupNames || "the existing groups"}.
          Fix the file and upload it again to include them.
        </p>
      ) : null}

      {preview.rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-canvas/50 px-4 py-6 text-center text-xs text-muted">
          No data rows found in this file. Add rows under the header row and upload
          it again.
        </p>
      ) : (
      <div className="max-h-[42vh] overflow-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-left">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              <th className="px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Email</th>
              <th className="px-3 py-2.5">Group</th>
              <th className="px-3 py-2.5">Title</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => {
              const meta = STATUS_META[row.status];
              return (
                <tr key={row.index} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2.5 text-[11px] text-muted">{row.index}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{row.name}</td>
                  <td className="px-3 py-2.5 text-[11px] text-muted">{row.email || "—"}</td>
                  <td className="px-3 py-2.5 text-[11px] text-muted">{row.team ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[11px] text-muted">{row.title ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                        meta.className,
                      )}
                    >
                      {meta.label}
                    </span>
                    {row.reasons.length ? (
                      <p className="mt-1 max-w-[220px] text-[10px] leading-snug text-muted">
                        {row.reasons.join("; ")}
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {errorBanner}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted">
          Only rows marked <span className="font-semibold text-success">New</span> are
          imported; the rest are skipped.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => {
              setPreview(null);
              setError(null);
            }}
          >
            Choose another file
          </Button>
          <Button
            type="button"
            onClick={() => void confirmImport()}
            disabled={busy !== null || counts.new === 0}
          >
            {busy === "commit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Import {counts.new} developer{counts.new === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ImportDevelopersDialog({ teams }: { teams: TeamRef[] }) {
  const [open, setOpen] = React.useState(false);
  const [flowKey, setFlowKey] = React.useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFlowKey((key) => key + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="md">
          <Upload className="h-4 w-4" /> Import developers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <p className="label-caps">People & access</p>
          <DialogTitle>Import developers</DialogTitle>
          <DialogDescription>
            Bulk-add developers from a CSV or Excel file. Duplicates are skipped by
            email, and every created account is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <ImportDevelopersFlow
          key={flowKey}
          teams={teams}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}