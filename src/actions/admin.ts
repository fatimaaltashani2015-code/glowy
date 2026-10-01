"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function createRoom(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "اسم الغرفة مطلوب" };
  const room = await prisma.room.create({ data: { name } });
  await writeAudit({
    userId: user.id,
    action: "CREATE_ROOM",
    entity: "Room",
    entityId: room.id,
    details: { name },
  });
  revalidatePath("/rooms");
}

export async function createService(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const name = String(formData.get("name") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes") ?? 60);
  if (!name) return { error: "اسم الخدمة مطلوب" };
  if (!durationMinutes || durationMinutes < 15) {
    return { error: "مدة الخدمة غير صالحة" };
  }
  const service = await prisma.service.create({
    data: { name, durationMinutes },
  });
  await writeAudit({
    userId: user.id,
    action: "CREATE_SERVICE",
    entity: "Service",
    entityId: service.id,
    details: { name, durationMinutes },
  });
  revalidatePath("/services");
}

export async function createExpert(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const name = String(formData.get("name") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const price = Number(formData.get("price"));
  const commissionPercent = Number(formData.get("commissionPercent"));
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !roomId || !serviceId) {
    return { error: "اسم الخبيرة والغرفة والتخصص مطلوبة" };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "سعر الخدمة غير صالح" };
  }
  if (
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    return { error: "نسبة الخبيرة يجب أن تكون بين 0 و 100" };
  }

  let userId: string | undefined;
  if (username) {
    if (!password) return { error: "كلمة المرور مطلوبة لحساب الخبيرة" };
    const account = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        role: ROLES.EXPERT,
      },
    });
    userId = account.id;
  }

  const expert = await prisma.expert.create({
    data: {
      name,
      roomId,
      serviceId,
      price,
      commissionPercent,
      userId,
    },
  });

  await writeAudit({
    userId: user.id,
    action: "CREATE_EXPERT",
    entity: "Expert",
    entityId: expert.id,
    details: { name, price, commissionPercent, roomId, serviceId },
  });
  revalidatePath("/experts");
}

export async function updateExpert(formData: FormData) {
  const actor = await requireSession([ROLES.MANAGER]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const price = Number(formData.get("price"));
  const commissionPercent = Number(formData.get("commissionPercent"));
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!id) return { error: "الخبيرة غير محددة" };
  if (!name || !roomId || !serviceId) {
    return { error: "اسم الخبيرة والغرفة والتخصص مطلوبة" };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "سعر الخدمة غير صالح" };
  }
  if (
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    return { error: "نسبة الخبيرة يجب أن تكون بين 0 و 100" };
  }

  const expert = await prisma.expert.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!expert) return { error: "الخبيرة غير موجودة" };

  if (username) {
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken && taken.id !== expert.userId) {
      return { error: "اسم الدخول مستخدم مسبقاً" };
    }
  }

  if (!expert.user && username && !password) {
    return { error: "كلمة المرور مطلوبة لحساب الخبيرة" };
  }
  if (expert.user && !username) {
    return { error: "اسم الدخول مطلوب لحساب الخبيرة" };
  }

  await prisma.$transaction(async (tx) => {
    let userId = expert.userId ?? undefined;

    if (!expert.user && username) {
      const account = await tx.user.create({
        data: {
          name,
          username,
          passwordHash: await bcrypt.hash(password, 10),
          role: ROLES.EXPERT,
        },
      });
      userId = account.id;
    } else if (expert.user) {
      await tx.user.update({
        where: { id: expert.user.id },
        data: {
          name,
          username,
          ...(password
            ? { passwordHash: await bcrypt.hash(password, 10) }
            : {}),
        },
      });
    }

    await tx.expert.update({
      where: { id },
      data: {
        name,
        roomId,
        serviceId,
        price,
        commissionPercent,
        userId,
      },
    });
  });

  await writeAudit({
    userId: actor.id,
    action: "UPDATE_EXPERT",
    entity: "Expert",
    entityId: id,
    details: { name, price, commissionPercent, roomId, serviceId },
  });
  revalidatePath("/experts");
  revalidatePath("/bookings");
  revalidatePath("/bookings/new");
}

export async function closeDay(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const businessDate = String(formData.get("businessDate") ?? "");
  if (!businessDate) return { error: "تاريخ اليوم مطلوب" };

  const existing = await prisma.dayClose.findUnique({
    where: { businessDate },
  });
  if (existing) return { error: "هذا اليوم مغلق مسبقًا" };

  const { getDailySettlement } = await import("@/lib/settlement");
  const report = await getDailySettlement(businessDate);

  const closed = await prisma.dayClose.create({
    data: {
      businessDate,
      closedById: user.id,
      totalCollected: report.totalCollected,
      totalDeposits: report.totalDeposits,
      totalRefunds: report.totalRefunds,
      totalExpertDues: report.totalExpertDues,
      netRevenue: report.netRevenue,
      cashTotal: report.cashTotal,
      cardTotal: report.cardTotal,
      transferTotal: report.transferTotal,
    },
  });

  await writeAudit({
    userId: user.id,
    action: "CLOSE_DAY",
    entity: "DayClose",
    entityId: closed.id,
    details: report,
  });
  revalidatePath("/day-close");
  revalidatePath("/settlement");
}

export async function createStaffUser(formData: FormData) {
  const actor = await requireSession([ROLES.MANAGER]);
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!name || !username || !password) {
    return { error: "الاسم واسم الدخول وكلمة المرور مطلوبة" };
  }
  if (role !== ROLES.MANAGER && role !== ROLES.RECEPTION) {
    return { error: "الدور غير صالح" };
  }

  const account = await prisma.user.create({
    data: {
      name,
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role,
    },
  });
  await writeAudit({
    userId: actor.id,
    action: "CREATE_USER",
    entity: "User",
    entityId: account.id,
    details: { username, role },
  });
  revalidatePath("/users");
}

export async function updateRoom(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "الغرفة غير محددة" };
  if (!name) return { error: "اسم الغرفة مطلوب" };

  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) return { error: "الغرفة غير موجودة" };

  const clash = await prisma.room.findUnique({ where: { name } });
  if (clash && clash.id !== id) return { error: "اسم الغرفة مستخدم مسبقاً" };

  await prisma.room.update({ where: { id }, data: { name } });
  await writeAudit({
    userId: user.id,
    action: "UPDATE_ROOM",
    entity: "Room",
    entityId: id,
    details: { name },
  });
  revalidatePath("/rooms");
  revalidatePath("/experts");
}

export async function updateService(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes") ?? 60);
  if (!id) return { error: "الخدمة غير محددة" };
  if (!name) return { error: "اسم الخدمة مطلوب" };
  if (!durationMinutes || durationMinutes < 15) {
    return { error: "مدة الخدمة غير صالحة" };
  }

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return { error: "الخدمة غير موجودة" };

  const clash = await prisma.service.findUnique({ where: { name } });
  if (clash && clash.id !== id) return { error: "اسم الخدمة مستخدم مسبقاً" };

  await prisma.service.update({
    where: { id },
    data: { name, durationMinutes },
  });
  await writeAudit({
    userId: user.id,
    action: "UPDATE_SERVICE",
    entity: "Service",
    entityId: id,
    details: { name, durationMinutes },
  });
  revalidatePath("/services");
  revalidatePath("/experts");
  revalidatePath("/bookings/new");
}

export async function updateCustomer(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!id) return { error: "العميلة غير محددة" };
  if (!name || !phone) return { error: "الاسم ورقم الهاتف مطلوبان" };

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return { error: "العميلة غير موجودة" };

  const clash = await prisma.customer.findFirst({
    where: { phone, id: { not: id } },
  });
  if (clash) return { error: "رقم الهاتف مسجّل لعميلة أخرى" };

  await prisma.customer.update({ where: { id }, data: { name, phone } });
  await writeAudit({
    userId: user.id,
    action: "UPDATE_CUSTOMER",
    entity: "Customer",
    entityId: id,
    details: { name, phone },
  });
  revalidatePath("/customers");
  revalidatePath("/bookings");
}

export async function updateStaffUser(formData: FormData) {
  const actor = await requireSession([ROLES.MANAGER]);
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!id) return { error: "المستخدم غير محدد" };
  if (!name || !username) {
    return { error: "الاسم واسم الدخول مطلوبان" };
  }

  const account = await prisma.user.findUnique({
    where: { id },
    include: { expert: true },
  });
  if (!account) return { error: "المستخدم غير موجود" };

  const taken = await prisma.user.findUnique({ where: { username } });
  if (taken && taken.id !== id) {
    return { error: "اسم الدخول مستخدم مسبقاً" };
  }

  if (account.expert) {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        username,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });
    await prisma.expert.update({
      where: { id: account.expert.id },
      data: { name },
    });
  } else {
    if (role !== ROLES.MANAGER && role !== ROLES.RECEPTION) {
      return { error: "الدور غير صالح" };
    }
    if (account.role === ROLES.MANAGER && role !== ROLES.MANAGER) {
      const managers = await prisma.user.count({
        where: { role: ROLES.MANAGER },
      });
      if (managers <= 1) return { error: "لا يمكن إزالة آخر مدير في النظام" };
    }
    await prisma.user.update({
      where: { id },
      data: {
        name,
        username,
        role,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });
  }

  await writeAudit({
    userId: actor.id,
    action: "UPDATE_USER",
    entity: "User",
    entityId: id,
    details: { username, role: account.expert ? account.role : role },
  });
  revalidatePath("/users");
  revalidatePath("/experts");
}

function deleteFail(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return { error: error.message };
  return { error: fallback };
}

export async function deleteRoom(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "الغرفة غير محددة" };

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { _count: { select: { experts: true, bookings: true } } },
    });
    if (!room) return { error: "الغرفة غير موجودة" };
    if (room._count.experts > 0) {
      return {
        error:
          "لا يمكن حذف الغرفة لأنها مرتبطة بخبيرات. احذفي أو انقلي الخبيرات أولاً.",
      };
    }
    if (room._count.bookings > 0) {
      return {
        error:
          "لا يمكن حذف الغرفة لأنها مرتبطة بحجوزات. احذفي الحجوزات أولاً.",
      };
    }

    await prisma.room.delete({ where: { id } });
    await writeAudit({
      userId: user.id,
      action: "DELETE_ROOM",
      entity: "Room",
      entityId: id,
      details: { name: room.name },
    });
    revalidatePath("/rooms");
    revalidatePath("/experts");
  } catch (error) {
    return deleteFail(error, "تعذر حذف الغرفة");
  }
}

export async function deleteService(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "الخدمة غير محددة" };

  try {
    const service = await prisma.service.findUnique({
      where: { id },
      include: { _count: { select: { experts: true, bookings: true } } },
    });
    if (!service) return { error: "الخدمة غير موجودة" };
    if (service._count.experts > 0) {
      return {
        error:
          "لا يمكن حذف الخدمة لأنها مرتبطة بخبيرات. احذفي أو انقلي الخبيرات أولاً.",
      };
    }
    if (service._count.bookings > 0) {
      return {
        error:
          "لا يمكن حذف الخدمة لأنها مرتبطة بحجوزات. احذفي الحجوزات أولاً.",
      };
    }

    await prisma.service.delete({ where: { id } });
    await writeAudit({
      userId: user.id,
      action: "DELETE_SERVICE",
      entity: "Service",
      entityId: id,
      details: { name: service.name },
    });
    revalidatePath("/services");
    revalidatePath("/experts");
    revalidatePath("/bookings/new");
  } catch (error) {
    return deleteFail(error, "تعذر حذف الخدمة");
  }
}

export async function deleteExpert(formData: FormData) {
  const actor = await requireSession([ROLES.MANAGER]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "الخبيرة غير محددة" };

  try {
    const expert = await prisma.expert.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!expert) return { error: "الخبيرة غير موجودة" };
    if (expert._count.bookings > 0) {
      return {
        error:
          "لا يمكن حذف الخبيرة لأنها مرتبطة بحجوزات. احذفي الحجوزات أولاً.",
      };
    }

    const linkedUserId = expert.userId;
    try {
      await prisma.$executeRaw`DELETE FROM BlacklistEntry WHERE expertId = ${id}`;
    } catch {
      /* ignore */
    }
    await prisma.expert.delete({ where: { id } });

    if (linkedUserId) {
      const linked = await prisma.user.findUnique({
        where: { id: linkedUserId },
        include: {
          _count: {
            select: {
              createdBookings: true,
              createdPayments: true,
              createdRefunds: true,
              closedDays: true,
            },
          },
        },
      });
      if (
        linked &&
        linked._count.createdBookings === 0 &&
        linked._count.createdPayments === 0 &&
        linked._count.createdRefunds === 0 &&
        linked._count.closedDays === 0
      ) {
        await prisma.auditLog.deleteMany({ where: { userId: linkedUserId } });
        try {
          await prisma.$executeRaw`DELETE FROM BlacklistEntry WHERE createdById = ${linkedUserId}`;
        } catch {
          /* ignore */
        }
        await prisma.user.delete({ where: { id: linkedUserId } });
      }
    }

    await writeAudit({
      userId: actor.id,
      action: "DELETE_EXPERT",
      entity: "Expert",
      entityId: id,
      details: { name: expert.name },
    });
    revalidatePath("/experts");
    revalidatePath("/users");
    revalidatePath("/blacklist");
    revalidatePath("/bookings/new");
  } catch (error) {
    return deleteFail(error, "تعذر حذف الخبيرة");
  }
}

export async function deleteCustomer(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "العميلة غير محددة" };

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bookings: { select: { id: true } },
      },
    });
    if (!customer) return { error: "العميلة غير موجودة" };

    const bookingIds = customer.bookings.map((booking) => booking.id);

    try {
      await prisma.$executeRaw`DELETE FROM BlacklistEntry WHERE customerId = ${id}`;
    } catch {
      /* جدول القائمة السوداء قد لا يكون موجوداً بعد */
    }

    await prisma.$transaction(async (tx) => {
      if (bookingIds.length > 0) {
        await tx.payment.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await tx.refund.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
        await tx.booking.deleteMany({ where: { customerId: id } });
      }
      await tx.customer.delete({ where: { id } });
    });

    await writeAudit({
      userId: user.id,
      action: "DELETE_CUSTOMER",
      entity: "Customer",
      entityId: id,
      details: {
        name: customer.name,
        phone: customer.phone,
        bookingsRemoved: bookingIds.length,
      },
    });
    revalidatePath("/customers");
    revalidatePath("/blacklist");
    revalidatePath("/bookings");
    revalidatePath("/");
    revalidatePath("/month");
    revalidatePath("/settlement");
  } catch (error) {
    return deleteFail(error, "تعذر حذف العميلة");
  }
}

export async function deleteStaffUser(formData: FormData) {
  const actor = await requireSession([ROLES.MANAGER]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "المستخدم غير محدد" };
  if (id === actor.id) return { error: "لا يمكن حذف حسابك أثناء تسجيل الدخول" };

  try {
    const account = await prisma.user.findUnique({
      where: { id },
      include: {
        expert: true,
        _count: {
          select: {
            createdBookings: true,
            createdPayments: true,
            createdRefunds: true,
            closedDays: true,
          },
        },
      },
    });
    if (!account) return { error: "المستخدم غير موجود" };
    if (account.expert) {
      return { error: "هذا حساب خبيرة. احذفيه من صفحة الخبيرات." };
    }
    if (account.role === ROLES.MANAGER) {
      const managers = await prisma.user.count({
        where: { role: ROLES.MANAGER },
      });
      if (managers <= 1) return { error: "لا يمكن حذف آخر مدير في النظام" };
    }
    if (account._count.createdBookings > 0) {
      return { error: "لا يمكن حذف الحساب لأنه أنشأ حجوزات" };
    }
    if (account._count.createdPayments > 0 || account._count.createdRefunds > 0) {
      return { error: "لا يمكن حذف الحساب لأنه مرتبط بدفعات أو استرجاع" };
    }
    if (account._count.closedDays > 0) {
      return { error: "لا يمكن حذف الحساب لأنه أغلق أيام عمل" };
    }

    await prisma.auditLog.deleteMany({ where: { userId: id } });
    try {
      await prisma.$executeRaw`DELETE FROM BlacklistEntry WHERE createdById = ${id}`;
    } catch {
      /* ignore */
    }
    await prisma.user.delete({ where: { id } });

    await writeAudit({
      userId: actor.id,
      action: "DELETE_USER",
      entity: "User",
      entityId: id,
      details: { username: account.username, role: account.role },
    });
    revalidatePath("/users");
  } catch (error) {
    return deleteFail(error, "تعذر حذف المستخدم");
  }
}
