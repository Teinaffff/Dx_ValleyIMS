import { cookies } from "next/headers";
import type { SessionUser } from "@ims/shared";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const response = await fetch(`${API_URL}${path}`, {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  return serverGet<SessionUser>("/api/auth/me");
}
