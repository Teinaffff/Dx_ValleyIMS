"use client";

import { apiFetch } from "@/lib/api";

// Applicants have no portal account. Their work email plus the access code
// issued when they applied identify them; both are kept in this browser only.
const KEY = "ims.evaluator.credentials";

export interface EvaluatorCredentials {
  email: string;
  code: string;
}

export function getCredentials(): EvaluatorCredentials | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EvaluatorCredentials>;
    return parsed.email && parsed.code ? { email: parsed.email, code: parsed.code } : null;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: EvaluatorCredentials) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(credentials));
  } catch {
    // Private mode: the applicant can still copy the code by hand.
  }
}

export function clearCredentials() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function evaluatorFetch<T>(
  path: string,
  credentials: EvaluatorCredentials,
  init?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-evaluator-email": credentials.email,
      "x-evaluator-code": credentials.code,
    },
  });
}
