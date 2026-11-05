"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import type { GlobalSearchResults } from "@ims/shared";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  group: string;
  label: string;
  detail: string | null;
  meta: string | null;
  href: string;
};

const DEBOUNCE_MS = 220;

export function GlobalSearch({ pages }: { pages: { href: string; label: string }[] }) {
  const router = useRouter();
  const listId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GlobalSearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);

  const term = query.trim();
  const searching = term.length >= 2;

  React.useEffect(() => {
    function onFocusShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = inputRef.current;
        if (!input || input.offsetParent === null) return;
        event.preventDefault();
        input.focus();
        input.select();
      }
    }
    document.addEventListener("keydown", onFocusShortcut);
    return () => document.removeEventListener("keydown", onFocusShortcut);
  }, []);

  React.useEffect(() => {
    if (!searching) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      apiFetch<GlobalSearchResults>(`/api/search?q=${encodeURIComponent(term)}`)
        .then((data) => {
          if (cancelled) return;
          setResults(data);
          setActive(0);
        })
        .catch(() => {
          if (!cancelled) setResults(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, searching]);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const rows = React.useMemo<Row[]>(() => {
    const lower = term.toLowerCase();
    const pageRows: Row[] = pages
      .filter((page) => page.label.toLowerCase().includes(lower))
      .slice(0, 3)
      .map((page) => ({
        key: `page:${page.href}`,
        group: "Jump to",
        label: page.label,
        detail: null,
        meta: "Page",
        href: page.href,
      }));

    const resultRows: Row[] = (results?.groups ?? []).flatMap((group) =>
      group.items.map((item) => ({
        key: `${group.group}:${item.id}`,
        group: group.label,
        label: item.label,
        detail: item.detail,
        meta: item.meta,
        href: item.href,
      })),
    );

    return [...pageRows, ...resultRows];
  }, [pages, results, term]);

  const sections = React.useMemo(() => {
    const grouped: { title: string; rows: { row: Row; index: number }[] }[] = [];
    rows.forEach((row, index) => {
      const last = grouped[grouped.length - 1];
      if (last?.title === row.group) last.rows.push({ row, index });
      else grouped.push({ title: row.group, rows: [{ row, index }] });
    });
    return grouped;
  }, [rows]);

  function goTo(row: Row | undefined) {
    if (!row) return;
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(row.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (rows.length ? (index + 1) % rows.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (rows.length ? (index - 1 + rows.length) % rows.length : 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      goTo(rows[active]);
    }
  }

  const showPanel = open && searching;
  const nothingFound = !loading && rows.length === 0;

  return (
    <div ref={boxRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted/70" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search anything"
        aria-label="Search the workspace"
        aria-expanded={showPanel}
        aria-controls={listId}
        role="combobox"
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && rows[active] ? `${listId}-${rows[active].key}` : undefined
        }
        className={cn(
          "h-9 w-full rounded-[10px] bg-soft pl-9 pr-11 text-[12px] text-ink outline-none transition placeholder:text-muted/70 focus:bg-white focus:ring-1 focus:ring-black/[0.08]",
          query && "pr-3",
        )}
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setResults(null);
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          Clear
        </button>
      ) : (
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-black/[0.08] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-muted">
          ⌘K
        </kbd>
      )}

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[62vh] overflow-y-auto rounded-[14px] border border-black/[0.08] bg-white p-1.5 shadow-[0_22px_50px_-24px_rgba(15,23,42,0.45)]"
        >
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-[11px] text-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching…
            </p>
          ) : null}

          {nothingFound ? (
            <p className="px-3 py-3 text-[11px] text-muted">
              No matches for “{term}”. Try a product, idea reference, team or name.
            </p>
          ) : null}

          {!loading &&
            sections.map((section) => (
              <div key={section.title} className="mb-1 last:mb-0">
                <p className="px-3 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink/35">
                  {section.title}
                </p>
                {section.rows.map(({ row, index }) => (
                  <button
                    key={row.key}
                    id={`${listId}-${row.key}`}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => goTo(row)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left transition-colors",
                      index === active ? "bg-soft" : "hover:bg-soft/60",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-ink">
                        {row.label}
                      </span>
                      {row.detail ? (
                        <span className="block truncate text-[10.5px] text-muted">
                          {row.detail}
                        </span>
                      ) : null}
                    </span>
                    {row.meta ? (
                      <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[9.5px] font-medium text-ink/50">
                        {row.meta}
                      </span>
                    ) : null}
                    {index === active ? (
                      <CornerDownLeft className="h-3 w-3 shrink-0 text-ink/30" />
                    ) : null}
                  </button>
                ))}
              </div>
            ))}

          <p className="mt-1 hidden items-center justify-between border-t border-black/[0.06] px-3 pb-1 pt-2 text-[9.5px] text-muted sm:flex">
            <span>↑↓ to move · Enter to open · Esc to close</span>
            <span>{results ? `${results.total} matches` : ""}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
