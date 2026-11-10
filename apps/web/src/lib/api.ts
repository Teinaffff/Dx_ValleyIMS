export const API_URL = process.env.API_URL ?? "http://localhost:4000";

// Paths handed to apiFetch are app-relative; the browser resolves them against
// the origin, so a subpath deployment (/ims) has to be added here.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message.join(", ");
    if (payload.message) return payload.message;
  } catch {
    // ignore malformed bodies
  }
  return "Something went wrong. Please try again.";
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const perform = () =>
    fetch(`${BASE_PATH}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        // Let the browser set the multipart boundary for file uploads.
        ...(init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(init?.headers ?? {}),
      },
    });

  let response = await perform();

  if (
    response.status === 401 &&
    !path.startsWith("/api/auth/") &&
    typeof window !== "undefined"
  ) {
    const refreshed = await fetch(`${BASE_PATH}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) response = await perform();
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
