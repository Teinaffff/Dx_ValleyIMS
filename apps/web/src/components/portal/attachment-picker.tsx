"use client";

import * as React from "react";
import {
  FileText,
  Film,
  Image as ImageIcon,
  Mic,
  Music,
  Paperclip,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const MAX_FILES = 5;
const MB = 1024 * 1024;
const MAX_TOTAL = 40 * MB;
const MAX_RECORDING_SECONDS = 120;
const LIMITS = { image: 5 * MB, audio: 10 * MB, video: 25 * MB, document: 10 * MB };
const DOC_EXT = ["pdf", "docx", "pptx", "xlsx"];
const ACCEPT = "image/*,video/mp4,video/webm,video/quicktime,audio/*,.pdf,.docx,.pptx,.xlsx";

type Kind = keyof typeof LIMITS;

function kindOf(file: File): Kind | null {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (DOC_EXT.includes(ext)) return "document";
  return null;
}

function sizeLabel(bytes: number) {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function KindIcon({ kind }: { kind: Kind | null }) {
  const cls = "h-4 w-4";
  if (kind === "image") return <ImageIcon className={cls} />;
  if (kind === "video") return <Film className={cls} />;
  if (kind === "audio") return <Music className={cls} />;
  return <FileText className={cls} />;
}

function AudioPreview({ file }: { file: File }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <audio controls src={url} className="mt-2 h-9 w-full" /> : null;
}

export function AttachmentPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const filesRef = React.useRef(files);
  filesRef.current = files;

  // Browser support is only known after mount. Deciding it during render would
  // make the server HTML (no button) differ from the client's (button).
  const [canRecord, setCanRecord] = React.useState(false);
  React.useEffect(() => {
    setCanRecord(
      typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
    );
  }, []);

  function add(incoming: File[]) {
    setError(null);
    const next = [...filesRef.current];
    for (const file of incoming) {
      const kind = kindOf(file);
      if (!kind) {
        setError(`"${file.name}" is not supported. Use images, audio, video, PDF, Word, PowerPoint or Excel.`);
        continue;
      }
      if (file.size > LIMITS[kind]) {
        setError(`"${file.name}" is too large. ${kind} files can be up to ${LIMITS[kind] / MB} MB.`);
        continue;
      }
      if (next.length >= MAX_FILES) {
        setError(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (next.reduce((sum, f) => sum + f.size, 0) + file.size > MAX_TOTAL) {
        setError(`Attachments can total up to ${MAX_TOTAL / MB} MB.`);
        continue;
      }
      next.push(file);
    }
    onChange(next);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  React.useEffect(
    () => () => {
      stopTimer();
      releaseStream();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    },
    [],
  );

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopTimer();
        releaseStream();
        setRecording(false);
        const base = (recorder.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunksRef.current, { type: base });
        if (blob.size) {
          const ext = base.includes("mp4") ? "m4a" : base.includes("ogg") ? "ogg" : "webm";
          add([new File([blob], `voice-note.${ext}`, { type: base })]);
        }
      };
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((value) => {
          if (value + 1 >= MAX_RECORDING_SECONDS) recorder.state === "recording" && recorder.stop();
          return value + 1;
        });
      }, 1000);
    } catch {
      releaseStream();
      setError("We couldn't access your microphone. Allow microphone access in the browser and try again.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div>
      <p className="text-xs font-semibold text-ink/75">Add voice, video, images or documents</p>
      <p className="mt-0.5 text-[11px] text-muted">
        Optional when you write the idea out, and enough on its own if you add one. Up to {MAX_FILES} files.
      </p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            add(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={recording}
        >
          <Paperclip className="h-3.5 w-3.5" /> Attach files
        </Button>
        {canRecord ? (
          recording ? (
            <Button type="button" variant="danger" size="sm" onClick={stopRecording}>
              <Square className="h-3.5 w-3.5" /> Stop · {mmss}
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={startRecording}>
              <Mic className="h-3.5 w-3.5" /> Record voice note
            </Button>
          )
        ) : null}
      </div>

      {recording ? (
        <p className="mt-2 flex items-center gap-2 text-[11px] font-medium text-danger">
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
          Recording… speak your idea (up to 2 minutes)
        </p>
      ) : null}

      {error ? <p className="mt-2 text-[11px] font-medium text-danger">{error}</p> : null}

      {files.length ? (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => {
            const kind = kindOf(file);
            return (
              <li
                key={`${file.name}-${index}`}
                className="rounded-2xl border border-line/70 bg-canvas/50 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-muted">
                    <KindIcon kind={kind} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{file.name}</span>
                  <span className="text-[10px] text-muted">{sizeLabel(file.size)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onChange(files.filter((_, i) => i !== index))}
                    className="rounded-full p-1 text-muted transition hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {kind === "audio" ? <AudioPreview file={file} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
