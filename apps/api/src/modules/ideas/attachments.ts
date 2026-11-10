import { BadRequestException } from "@nestjs/common";
import type { AttachmentKind } from "@prisma/client";

export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
export const MAX_BYTES: Record<AttachmentKind, number> = {
  IMAGE: 5 * 1024 * 1024,
  AUDIO: 10 * 1024 * 1024,
  VIDEO: 25 * 1024 * 1024,
  DOCUMENT: 10 * 1024 * 1024,
};
export const MAX_FILE_BYTES = Math.max(...Object.values(MAX_BYTES));

export interface DetectedFile {
  kind: AttachmentKind;
  mimeType: string;
}

const starts = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf: Buffer, text: string, offset = 0) =>
  starts(
    buf,
    [...text].map((c) => c.charCodeAt(0)),
    offset,
  );

/**
 * Decide what a file really is from its leading bytes. The browser-reported
 * type and the extension are only hints (audio vs video containers share
 * signatures), never trusted on their own. Returns null for anything that is
 * not an allowed type.
 */
export function detectFile(
  buf: Buffer,
  declaredMime: string,
  fileName: string,
): DetectedFile | null {
  const declared = (declaredMime || "").toLowerCase();
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();

  if (starts(buf, [0x89, 0x50, 0x4e, 0x47])) return { kind: "IMAGE", mimeType: "image/png" };
  if (starts(buf, [0xff, 0xd8, 0xff])) return { kind: "IMAGE", mimeType: "image/jpeg" };
  if (ascii(buf, "GIF8")) return { kind: "IMAGE", mimeType: "image/gif" };
  if (ascii(buf, "RIFF") && ascii(buf, "WEBP", 8)) {
    return { kind: "IMAGE", mimeType: "image/webp" };
  }

  if (ascii(buf, "RIFF") && ascii(buf, "WAVE", 8)) return { kind: "AUDIO", mimeType: "audio/wav" };
  if (ascii(buf, "OggS")) return { kind: "AUDIO", mimeType: "audio/ogg" };
  if (
    ascii(buf, "ID3") ||
    starts(buf, [0xff, 0xfb]) ||
    starts(buf, [0xff, 0xf3]) ||
    starts(buf, [0xff, 0xf2])
  ) {
    return { kind: "AUDIO", mimeType: "audio/mpeg" };
  }

  // Matroska/WebM: MediaRecorder voice notes and uploaded clips share this.
  if (starts(buf, [0x1a, 0x45, 0xdf, 0xa3])) {
    return declared.startsWith("audio/")
      ? { kind: "AUDIO", mimeType: "audio/webm" }
      : { kind: "VIDEO", mimeType: "video/webm" };
  }
  // ISO base media (mp4 / m4a / mov).
  if (ascii(buf, "ftyp", 4)) {
    if (declared.startsWith("audio/") || ext === "m4a") {
      return { kind: "AUDIO", mimeType: "audio/mp4" };
    }
    return ext === "mov" || declared === "video/quicktime"
      ? { kind: "VIDEO", mimeType: "video/quicktime" }
      : { kind: "VIDEO", mimeType: "video/mp4" };
  }

  if (ascii(buf, "%PDF")) return { kind: "DOCUMENT", mimeType: "application/pdf" };
  // OOXML files are zip archives; only the three office extensions are allowed.
  if (starts(buf, [0x50, 0x4b, 0x03, 0x04])) {
    const office: Record<string, string> = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    if (office[ext]) return { kind: "DOCUMENT", mimeType: office[ext] };
  }
  return null;
}

export function validateFiles(files: Express.Multer.File[]) {
  if (files.length > MAX_FILES) {
    throw new BadRequestException(`Attach at most ${MAX_FILES} files.`);
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    throw new BadRequestException(
      `Attachments are limited to ${MAX_TOTAL_BYTES / 1024 / 1024} MB in total.`,
    );
  }
  return files.map((file) => {
    const name = cleanName(file.originalname);
    const detected = detectFile(file.buffer, file.mimetype, name);
    if (!detected) {
      throw new BadRequestException(
        `"${name}" is not an allowed file. Use images, audio, video, PDF, Word, PowerPoint or Excel.`,
      );
    }
    if (file.size === 0) throw new BadRequestException(`"${name}" is empty.`);
    if (file.size > MAX_BYTES[detected.kind]) {
      throw new BadRequestException(
        `"${name}" is too large. ${detected.kind.toLowerCase()} files are limited to ${
          MAX_BYTES[detected.kind] / 1024 / 1024
        } MB.`,
      );
    }
    return { ...detected, fileName: name, size: file.size, data: file.buffer };
  });
}

function cleanName(raw: string) {
  // Multer decodes names as latin1; undo that so non-ASCII names survive, then
  // strip path parts and control characters.
  let name = raw ?? "file";
  try {
    name = Buffer.from(name, "latin1").toString("utf8");
  } catch {
    // keep as is
  }
  name = name.replace(/[\\/]/g, "_").replace(/[\u0000-\u001f]/g, "").trim();
  return (name || "file").slice(0, 120);
}
