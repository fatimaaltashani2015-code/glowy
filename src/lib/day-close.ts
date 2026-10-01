import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";

export async function isDayClosed(businessDate: string): Promise<boolean> {
  const row = await prisma.dayClose.findUnique({
    where: { businessDate },
  });
  return Boolean(row);
}

export async function assertCanMutateDay(
  businessDate: string,
  user: SessionUser,
  actionLabel: string,
) {
  const closed = await isDayClosed(businessDate);
  if (!closed) return { closed: false };
  if (user.role !== ROLES.MANAGER) {
    throw new Error(
      `اليوم ${businessDate} مغلق. لا يمكن لموظف الاستقبال ${actionLabel} إلا بصلاحية المدير.`,
    );
  }
  return { closed: true };
}

export function canManageCenter(role: Role) {
  return role === ROLES.MANAGER;
}

export function canOperateReception(role: Role) {
  return role === ROLES.MANAGER || role === ROLES.RECEPTION;
}
