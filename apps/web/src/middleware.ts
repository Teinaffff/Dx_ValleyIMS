import { NextResponse, type NextRequest } from "next/server";
import { isDisabledAdminRoute } from "@/config/features";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("ims_at");
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (isDisabledAdminRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
