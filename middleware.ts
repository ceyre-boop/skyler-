import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions, type SessionData } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, getSessionOptions());

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isApi = pathname.startsWith("/api/");

  if (!session.userId && !isAuthPage && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (session.userId && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.*|manifest.webmanifest|.*\\.(?:png|jpg|svg|ico)$).*)",
  ],
};
