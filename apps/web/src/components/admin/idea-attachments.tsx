import { Download, FileText, Paperclip } from "lucide-react";
import type { IdeaAttachmentRef } from "@ims/shared";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function sizeLabel(bytes: number) {
  const mb = 1024 * 1024;
  return bytes >= mb ? `${(bytes / mb).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function IdeaAttachments({
  ideaId,
  attachments,
}: {
  ideaId: string;
  attachments: IdeaAttachmentRef[];
}) {
  const urlFor = (id: string) => `${BASE_PATH}/api/ideas/${ideaId}/attachments/${id}`;

  return (
    <div className="mt-3 rounded-2xl border border-line/70 p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        <Paperclip className="h-3 w-3" /> Attachments · {attachments.length}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {attachments.map((file) => (
          <figure key={file.id} className="min-w-0 rounded-xl bg-canvas/60 p-2.5">
            {file.kind === "IMAGE" ? (
              <a href={urlFor(file.id)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlFor(file.id)}
                  alt={file.fileName}
                  loading="lazy"
                  className="max-h-56 w-full rounded-lg object-contain"
                />
              </a>
            ) : file.kind === "VIDEO" ? (
              <video
                controls
                preload="metadata"
                src={urlFor(file.id)}
                className="max-h-56 w-full rounded-lg bg-black"
              />
            ) : file.kind === "AUDIO" ? (
              <audio controls preload="metadata" src={urlFor(file.id)} className="w-full" />
            ) : (
              <a
                href={urlFor(file.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 py-2 text-[12px] font-medium text-primary hover:underline"
              >
                <FileText className="h-4 w-4" /> Open document
              </a>
            )}
            <figcaption className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
              <span className="min-w-0 truncate">{file.fileName}</span>
              <a
                href={urlFor(file.id)}
                download={file.fileName}
                aria-label={`Download ${file.fileName}`}
                className="inline-flex shrink-0 items-center gap-1 hover:text-primary"
              >
                {sizeLabel(file.size)} <Download className="h-3 w-3" />
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
