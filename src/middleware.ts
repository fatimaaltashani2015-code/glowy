import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "bc_session";

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "beauty-center-dev-secret-change-before-production",
  );
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const isLogin = req.nextUrl.pathname.startsWith("/login");

  if (!token && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token) {
    try {
      await jwtVerify(token, secret());
      if (isLogin) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    } catch {
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete(COOKIE);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon(?:\\.png)?$|brand/|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)",
  ],
};
