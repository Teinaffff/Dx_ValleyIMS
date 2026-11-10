"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PublicIdeaForm } from "@/components/portal/public-idea-form";
import { TrackIdeaForm } from "@/components/portal/track-idea-form";

type Tab = "new" | "track";

const TABS: { key: Tab; label: string }[] = [
  { key: "new", label: "New idea" },
  { key: "track", label: "I have an access code" },
];

/**
 * One panel for both things a submitter does: share a new idea, or come back
 * with the reference and access code they were given to see where it stands.
 */
export function IdeaSubmissionPanel() {
  const [tab, setTab] = React.useState<Tab>("new");

  return (
    <div>
      <div role="tablist" aria-label="Idea submission" className="mb-6 inline-flex rounded-full bg-canvas p-1 text-[11px] font-semibold">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`idea-tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`idea-panel-${item.key}`}
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 transition",
              tab === item.key ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Both stay mounted so a half-written idea isn't lost when peeking at a status. */}
      <div role="tabpanel" id="idea-panel-new" aria-labelledby="idea-tab-new" hidden={tab !== "new"}>
        <PublicIdeaForm />
      </div>
      <div role="tabpanel" id="idea-panel-track" aria-labelledby="idea-tab-track" hidden={tab !== "track"}>
        <TrackIdeaForm key={tab} onShareAnother={() => setTab("new")} />
      </div>
    </div>
  );
}
