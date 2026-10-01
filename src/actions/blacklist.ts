"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  findBlacklistRow,
  hasBlacklistEntry,
  insertBlacklistEntry,
  lookupBlacklist,
  removeBlacklistEntry,
} from "@/lib/blacklist";
import { BLACKLIST_SCOPE, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

function fail(message: string) {
  return { error: message } as const;
}

export async function searchBlacklist(name: string, phone: string) {
  await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  return lookupBlacklist(name, phone);
}

export async function addBlacklistEntry(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const customerId = String(formData.get("customerId") ?? "");
  const scope = String(formData.get("scope") ?? "");
  const expertId = String(formData.get("expertId") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!customerId) return fail("اختاري العميلة أولاً");
  if (scope !== BLACKLIST_SCOPE.CENTER && scope !== BLACKLIST_SCOPE.EXPERT) {
    return fail("حددي إن كان المنع للمركز أو لخبيرة");
  }
  if (scope === BLACKLIST_SCOPE.EXPERT && !expertId) {
    return fail("اختاري الخبيرة التي لا تريد التعامل معها");
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return fail("العميلة غير موجودة");

  if (
    await hasBlacklistEntry({
      customerId,
      scope,
      expertId: scope === BLACKLIST_SCOPE.EXPERT ? expertId : null,
    })
  ) {
    return fail(
      scope === BLACKLIST_SCOPE.CENTER
        ? "هذه العميلة مضافة مسبقاً للقائمة السوداء للمركز"
        : "هذه العميلة مضافة مسبقاً لقائمة هذه الخبيرة",
    );
  }

  if (scope === BLACKLIST_SCOPE.EXPERT && expertId) {
    const expert = await prisma.expert.findUnique({ where: { id: expertId } });
    if (!expert) return fail("الخبيرة غير موجودة");
  }

  const id = await insertBlacklistEntry({
    customerId,
    scope,
    expertId: scope === BLACKLIST_SCOPE.EXPERT ? expertId : null,
    reason,
    createdById: user.id,
  });

  await writeAudit({
    userId: user.id,
    action: "ADD_BLACKLIST",
    entity: "BlacklistEntry",
    entityId: id,
    details: {
      customer: customer.name,
      phone: customer.phone,
      scope,
      expertId,
      reason,
    },
  });

  revalidatePath("/blacklist");
  revalidatePath("/customers");
  revalidatePath("/bookings/new");
  revalidatePath("/bookings");
}

export async function deleteBlacklistEntry(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("السجل غير محدد");

  try {
    const entry = await findBlacklistRow(id);
    if (!entry) return fail("السجل غير موجود");

    await removeBlacklistEntry(id);
    await writeAudit({
      userId: user.id,
      action: "DELETE_BLACKLIST",
      entity: "BlacklistEntry",
      entityId: id,
      details: {
        customer: entry.customerName,
        phone: entry.customerPhone,
        scope: entry.scope,
        expert: entry.expertName,
      },
    });

    revalidatePath("/blacklist");
    revalidatePath("/customers");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "تعذر حذف السجل");
  }
}
