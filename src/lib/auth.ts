import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/constants";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
  expertId: string | null;
};

const COOKIE = "bc_session";

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "beauty-center-dev-secret-change-before-production",
  );
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user } as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function readSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      username: String(payload.username),
      role: payload.role as Role,
      expertId: payload.expertId ? String(payload.expertId) : null,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function requireSession(roles?: Role[]): Promise<SessionUser> {
  const user = await readSession();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

export { COOKIE as SESSION_COOKIE };
