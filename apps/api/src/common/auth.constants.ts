export const ACCESS_COOKIE = "ims_at";
export const REFRESH_COOKIE = "ims_rt";
export const ACCESS_COOKIE_PATH = "/";
export const REFRESH_COOKIE_PATH = "/api/auth";

// A browser only replays a cookie when its Path matches the prefixed request URL,
// so a deployment served under a subpath needs the same prefix on the cookie Path.
export function withBasePath(path: string, basePath?: string): string {
  const prefix = (basePath ?? "").trim().replace(/\/+$/, "");
  if (!prefix) return path;
  return `${prefix.startsWith("/") ? prefix : `/${prefix}`}${path}`;
}
