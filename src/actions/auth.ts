"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  setSessionCookie,
  type SessionUser,
} from "@/lib/auth";
import type { Role } from "@/lib/constants";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    redirect("/login?error=empty");
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { expert: true },
  });
  if (!user) redirect("/login?error=invalid");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) redirect("/login?error=invalid");

  const session: SessionUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role as Role,
    expertId: user.expert?.id ?? null,
  };
  await setSessionCookie(session);
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
