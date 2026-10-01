"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ATTENDANCE, ROLES } from "@/lib/constants";
import { addMinutes, businessDateFrom, slotToDate } from "@/lib/dates";
import { assertCanMutateDay, canOperateReception } from "@/lib/day-close";
import { roundMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { assertCanBookCustomer } from "@/lib/blacklist";
import { hasExpertConflict } from "@/lib/slots";
import { bookingBalance } from "@/lib/settlement";

function fail(message: string) {
  return { error: message } as const;
}

function parseAttendance(value: string) {
  if (
    value === ATTENDANCE.PENDING ||
    value === ATTENDANCE.ATTENDED ||
    value === ATTENDANCE.NO_SHOW
  ) {
    return value;
  }
  return null;
}

export async function createBooking(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  if (!canOperateReception(user.role)) return fail("لا صلاحية");

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const expertId = String(formData.get("expertId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const isGift = formData.get("isGift") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!customerName || !customerPhone) {
    return fail("اسم العميلة ورقم الهاتف مطلوبان");
  }
  if (!expertId || !date || !time) {
    return fail("الخبيرة والتاريخ والوقت مطلوبة");
  }

  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    include: { service: true },
  });
  if (!expert || !expert.active) return fail("الخبيرة غير متاحة");

  const startAt = slotToDate(date, time);
  const endAt = addMinutes(startAt, expert.service.durationMinutes);
  const businessDate = businessDateFrom(startAt);

  let gate: { closed: boolean };
  try {
    gate = await assertCanMutateDay(businessDate, user, "إنشاء حجز");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "اليوم مغلق");
  }

  if (await hasExpertConflict({ expertId, startAt, endAt })) {
    return fail("هذا الوقت متعارض مع حجز آخر لنفس الخبيرة");
  }

  try {
    await assertCanBookCustomer(customerName, customerPhone, expertId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "العميلة في القائمة السوداء");
  }

  const customer =
    (await prisma.customer.findFirst({
      where: { phone: customerPhone },
    })) ??
    (await prisma.customer.create({
      data: { name: customerName, phone: customerPhone },
    }));

  if (customer.name !== customerName) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name: customerName },
    });
  }

  const last = await prisma.booking.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 100) + 1;

  const chargedPrice = isGift ? 0 : expert.price;
  const booking = await prisma.booking.create({
    data: {
      number,
      customerId: customer.id,
      expertId: expert.id,
      serviceId: expert.serviceId,
      roomId: expert.roomId,
      startAt,
      endAt,
      businessDate,
      catalogPrice: expert.price,
      chargedPrice,
      commissionPercent: expert.commissionPercent,
      isGift,
      giftReason: isGift ? "هدية من الخبيرة" : null,
      notes,
      createdById: user.id,
    },
  });

  await writeAudit({
    userId: user.id,
    action: gate.closed ? "CREATE_BOOKING_AFTER_CLOSE" : "CREATE_BOOKING",
    entity: "Booking",
    entityId: booking.id,
    details: {
      number: booking.number,
      expert: expert.name,
      isGift,
      chargedPrice,
    },
  });

  revalidatePath("/bookings");
  revalidatePath("/");
  revalidatePath("/month");
  return { id: booking.id, number: booking.number };
}

export async function addPayment(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const bookingId = String(formData.get("bookingId") ?? "");
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "CASH");
  const type = String(formData.get("type") ?? "DEPOSIT");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!bookingId || !Number.isFinite(amount) || amount <= 0) {
    return fail("مبلغ الدفع غير صالح");
  }

  const { booking, remaining, collected } = await bookingBalance(bookingId);
  if (booking.isGift) return fail("هذه الخدمة هدية ولا تُحصّل عليها مبالغ");
  if (amount > remaining + 0.001) {
    return fail(`المبلغ أكبر من المتبقي (${remaining} د.ل)`);
  }

  const businessDate = businessDateFrom();
  let gate: { closed: boolean };
  try {
    gate = await assertCanMutateDay(businessDate, user, "تسجيل دفعة");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "اليوم مغلق");
  }

  const payment = await prisma.payment.create({
    data: {
      bookingId,
      amount,
      method,
      type,
      businessDate,
      createdById: user.id,
      note,
    },
  });

  await writeAudit({
    userId: user.id,
    action: gate.closed ? "ADD_PAYMENT_AFTER_CLOSE" : "ADD_PAYMENT",
    entity: "Payment",
    entityId: payment.id,
    details: { bookingId, amount, method, type, businessDate },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/settlement");
  return {
    paymentId: payment.id,
    amount,
    method,
    type,
    paidAt: payment.paidAt.toISOString(),
    cashierName: user.name,
    collected: roundMoney(collected + amount),
    remaining: roundMoney(Math.max(0, remaining - amount)),
  };
}

export async function addRefund(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const bookingId = String(formData.get("bookingId") ?? "");
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "CASH");
  const reason = String(formData.get("reason") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!bookingId || !Number.isFinite(amount) || amount <= 0) {
    return fail("مبلغ الاسترجاع غير صالح");
  }
  if (reason !== "EXPERT_APOLOGY" && reason !== "FORCE_MAJEURE") {
    return fail("سبب الاسترجاع يجب أن يكون اعتذار الخبيرة أو ظرفًا قهريًا");
  }

  const { collected, remaining } = await bookingBalance(bookingId);
  if (amount > collected + 0.001) {
    return fail("لا يمكن استرجاع مبلغ أكبر من المحصّل");
  }

  const businessDate = businessDateFrom();
  let gate: { closed: boolean };
  try {
    gate = await assertCanMutateDay(businessDate, user, "استرجاع مبلغ");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "اليوم مغلق");
  }

  const refund = await prisma.refund.create({
    data: {
      bookingId,
      amount,
      method,
      reason,
      businessDate,
      createdById: user.id,
      note,
    },
  });

  await writeAudit({
    userId: user.id,
    action: gate.closed ? "ADD_REFUND_AFTER_CLOSE" : "ADD_REFUND",
    entity: "Refund",
    entityId: refund.id,
    details: { bookingId, amount, reason, businessDate },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/settlement");
  return {
    refundId: refund.id,
    amount,
    method,
    reason,
    refundedAt: refund.createdAt.toISOString(),
    cashierName: user.name,
    collected: roundMoney(Math.max(0, collected - amount)),
    remaining: roundMoney(remaining + amount),
  };
}

export async function updateBooking(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  if (!canOperateReception(user.role)) return fail("لا صلاحية");

  const id = String(formData.get("id") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const expertId = String(formData.get("expertId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "").slice(0, 5);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "SCHEDULED");
  const attendance = parseAttendance(String(formData.get("attendance") ?? ""));
  const isGift = formData.get("isGift") === "on";

  if (!id) return fail("الحجز غير محدد");
  if (!customerName || !customerPhone) {
    return fail("اسم العميلة ورقم الهاتف مطلوبان");
  }
  if (!expertId || !date || !time) {
    return fail("الخبيرة والتاريخ والوقت مطلوبة");
  }
  if (
    status !== "SCHEDULED" &&
    status !== "COMPLETED" &&
    status !== "CANCELLED"
  ) {
    return fail("حالة الحجز غير صالحة");
  }
  if (!attendance) {
    return fail("حالة الحضور غير صالحة");
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!booking) return fail("الحجز غير موجود");

  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    include: { service: true },
  });
  if (!expert || !expert.active) return fail("الخبيرة غير متاحة");

  const startAt = slotToDate(date, time);
  const endAt = addMinutes(startAt, expert.service.durationMinutes);
  const businessDate = businessDateFrom(startAt);
  const { collected } = await bookingBalance(id);

  if (isGift && collected > 0) {
    return fail("لا يمكن تحويل الحجز إلى هدية بعد تسجيل دفعات");
  }

  try {
    await assertCanMutateDay(booking.businessDate, user, "تعديل حجز");
    await assertCanMutateDay(businessDate, user, "تعديل حجز");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "اليوم مغلق");
  }

  if (
    await hasExpertConflict({
      expertId,
      startAt,
      endAt,
      excludeBookingId: id,
    })
  ) {
    return fail("هذا الوقت متعارض مع حجز آخر لنفس الخبيرة");
  }

  const phoneClash = await prisma.customer.findFirst({
    where: { phone: customerPhone, id: { not: booking.customerId } },
  });
  if (phoneClash) {
    return fail("رقم الهاتف مسجّل لعميلة أخرى");
  }

  try {
    await assertCanBookCustomer(customerName, customerPhone, expertId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "العميلة في القائمة السوداء");
  }

  const catalogPrice = collected > 0 ? booking.catalogPrice : expert.price;
  const commissionPercent =
    collected > 0 ? booking.commissionPercent : expert.commissionPercent;
  const chargedPrice = isGift ? 0 : collected > 0 ? booking.chargedPrice : expert.price;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: booking.customerId },
      data: { name: customerName, phone: customerPhone },
    }),
    prisma.booking.update({
      where: { id },
      data: {
        expertId: expert.id,
        serviceId: expert.serviceId,
        roomId: expert.roomId,
        startAt,
        endAt,
        businessDate,
        catalogPrice,
        chargedPrice,
        commissionPercent,
        isGift,
        giftReason: isGift ? booking.giftReason ?? "هدية من الخبيرة" : null,
        notes,
        status,
        attendance,
      },
    }),
  ]);

  await writeAudit({
    userId: user.id,
    action: "UPDATE_BOOKING",
    entity: "Booking",
    entityId: id,
    details: {
      expertId,
      businessDate,
      status,
      attendance,
      isGift,
    },
  });

  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");
  revalidatePath("/");
  revalidatePath("/month");
  revalidatePath("/appointments");
  revalidatePath("/customers");
}

export async function updateAttendance(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  if (!canOperateReception(user.role)) return fail("لا صلاحية");

  const id = String(formData.get("id") ?? "");
  const attendance = parseAttendance(String(formData.get("attendance") ?? ""));
  if (!id) return fail("الحجز غير محدد");
  if (!attendance) return fail("حالة الحضور غير صالحة");

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return fail("الحجز غير موجود");

  let gate: { closed: boolean };
  try {
    gate = await assertCanMutateDay(booking.businessDate, user, "تسجيل حضور");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "اليوم مغلق");
  }

  await prisma.booking.update({
    where: { id },
    data: { attendance },
  });

  await writeAudit({
    userId: user.id,
    action: gate.closed ? "UPDATE_ATTENDANCE_AFTER_CLOSE" : "UPDATE_ATTENDANCE",
    entity: "Booking",
    entityId: id,
    details: { number: booking.number, attendance },
  });

  revalidatePath(`/bookings/${id}`);
  revalidatePath("/bookings");
  revalidatePath("/");
  revalidatePath("/month");
  revalidatePath("/appointments");
}

export async function deleteBooking(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  if (!canOperateReception(user.role)) return fail("لا صلاحية");

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("الحجز غير محدد");

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        customer: true,
        _count: { select: { payments: true, refunds: true } },
      },
    });
    if (!booking) return fail("الحجز غير موجود");

    let gate: { closed: boolean };
    try {
      gate = await assertCanMutateDay(booking.businessDate, user, "حذف حجز");
    } catch (error) {
      return fail(error instanceof Error ? error.message : "اليوم مغلق");
    }

    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { bookingId: id } }),
      prisma.refund.deleteMany({ where: { bookingId: id } }),
      prisma.booking.delete({ where: { id } }),
    ]);

    await writeAudit({
      userId: user.id,
      action: gate.closed ? "DELETE_BOOKING_AFTER_CLOSE" : "DELETE_BOOKING",
      entity: "Booking",
      entityId: id,
      details: {
        number: booking.number,
        customer: booking.customer.name,
        businessDate: booking.businessDate,
        payments: booking._count.payments,
        refunds: booking._count.refunds,
      },
    });

    revalidatePath(`/bookings/${id}`);
    revalidatePath("/bookings");
    revalidatePath("/");
    revalidatePath("/month");
    revalidatePath("/appointments");
    revalidatePath("/customers");
    revalidatePath("/settlement");
    revalidatePath("/day-close");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "تعذر حذف الحجز");
  }
}

export async function listSlots(expertId: string, date: string) {
  await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const { getAvailableSlots } = await import("@/lib/slots");
  return getAvailableSlots(expertId, date);
}

export async function listExpertsForService(serviceId: string, date: string) {
  await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const experts = await prisma.expert.findMany({
    where: { serviceId, active: true },
    include: { room: true, service: true },
    orderBy: { name: "asc" },
  });
  const { getAvailableSlots } = await import("@/lib/slots");
  const result = [];
  for (const expert of experts) {
    const slots = date ? await getAvailableSlots(expert.id, date) : [];
    result.push({
      id: expert.id,
      name: expert.name,
      price: expert.price,
      commissionPercent: expert.commissionPercent,
      roomName: expert.room.name,
      serviceName: expert.service.name,
      slots,
    });
  }
  return result.filter((e) => !date || e.slots.length > 0);
}
