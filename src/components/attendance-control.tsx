"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateAttendance } from "@/actions/bookings";
import { Badge } from "@/components/ui";
import { ATTENDANCE, labels } from "@/lib/constants";

const OPTIONS = [
  ATTENDANCE.PENDING,
  ATTENDANCE.ATTENDED,
  ATTENDANCE.NO_SHOW,
] as const;

export function AttendanceBadge({ value }: { value: string }) {
  const tone =
    value === ATTENDANCE.ATTENDED
      ? "ok"
      : value === ATTENDANCE.NO_SHOW
        ? "warn"
        : "neutral";
  return (
    <Badge tone={tone}>
      {labels.attendance[value as keyof typeof labels.attendance] ?? value}
    </Badge>
  );
}

export function AttendanceControl({
  bookingId,
  value,
}: {
  bookingId: string;
  value: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const current = OPTIONS.includes(value as (typeof OPTIONS)[number])
    ? value
    : ATTENDANCE.PENDING;

  return (
    <select
      value={current}
      disabled={pending}
      aria-label="حضور الزبونة"
      className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink outline-none disabled:opacity-50"
      onChange={async (event) => {
        const attendance = event.target.value;
        setPending(true);
        const formData = new FormData();
        formData.set("id", bookingId);
        formData.set("attendance", attendance);
        const result = await updateAttendance(formData);
        setPending(false);
        if (result && "error" in result && result.error) {
          window.alert(result.error);
          return;
        }
        router.refresh();
      }}
    >
      {OPTIONS.map((option) => (
        <option key={option} value={option}>
          {labels.attendance[option]}
        </option>
      ))}
    </select>
  );
}
