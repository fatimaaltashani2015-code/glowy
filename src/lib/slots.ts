import {
  SLOT_STEP_MINUTES,
  WORK_END_HOUR,
  WORK_START_HOUR,
} from "@/lib/constants";
import { addMinutes, slotToDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

export async function getAvailableSlots(expertId: string, businessDate: string) {
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    include: { service: true },
  });
  if (!expert || !expert.active) return [];

  const duration = expert.service.durationMinutes;
  const bookings = await prisma.booking.findMany({
    where: {
      expertId,
      businessDate,
      status: { not: "CANCELLED" },
    },
    select: { startAt: true, endAt: true },
  });

  const slots: string[] = [];
  const dayStart = slotToDate(
    businessDate,
    `${String(WORK_START_HOUR).padStart(2, "0")}:00`,
  );
  const dayEnd = slotToDate(
    businessDate,
    `${String(WORK_END_HOUR).padStart(2, "0")}:00`,
  );

  for (
    let cursor = new Date(dayStart);
    addMinutes(cursor, duration) <= dayEnd;
    cursor = addMinutes(cursor, SLOT_STEP_MINUTES)
  ) {
    const end = addMinutes(cursor, duration);
    const taken = bookings.some((b) =>
      overlaps(cursor, end, b.startAt, b.endAt),
    );
    if (!taken) {
      const label = cursor.toLocaleTimeString("en-GB", {
        timeZone: "Africa/Tripoli",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      slots.push(label);
    }
  }

  return slots;
}

export async function hasExpertConflict(input: {
  expertId: string;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
}) {
  const existing = await prisma.booking.findMany({
    where: {
      expertId: input.expertId,
      status: { not: "CANCELLED" },
      ...(input.excludeBookingId
        ? { id: { not: input.excludeBookingId } }
        : {}),
    },
    select: { startAt: true, endAt: true },
  });
  return existing.some((b) =>
    overlaps(input.startAt, input.endAt, b.startAt, b.endAt),
  );
}
