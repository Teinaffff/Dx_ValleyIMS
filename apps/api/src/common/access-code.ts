import { createHash, randomBytes, timingSafeEqual } from "crypto";

// Short, easy to read aloud: no 0/O or 1/I. Used wherever someone without an
// account needs a secret to come back to something (evaluator applications,
// submitted ideas). Only the hash is ever stored.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const normalize = (code: string) => code.replace(/[\s-]/g, "").toUpperCase();

export function newAccessCode(): string {
  const chars = Array.from(randomBytes(12), (byte) => ALPHABET[byte % ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)]
    .map((part) => part.join(""))
    .join("-");
}

export function hashAccessCode(code: string): string {
  return sha256(normalize(code));
}

/** Constant-time check; a missing hash never matches. */
export function matchesAccessCode(code: string | undefined | null, hash: string | null | undefined) {
  const given = Buffer.from(hashAccessCode(code ?? ""));
  const stored = Buffer.from(hash ?? sha256("no-code"));
  return Boolean(code) && Boolean(hash) && given.length === stored.length && timingSafeEqual(given, stored);
}
