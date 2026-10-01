"use client";

import { useEffect, useState } from "react";
import { searchBlacklist } from "@/actions/blacklist";
import { updateBooking } from "@/actions/bookings";
import { ActionForm } from "@/components/action-form";
import { BlacklistAlert } from "@/components/blacklist-alert";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { blacklistVerdict, type BlacklistLookup } from "@/lib/blacklist";
import { labels } from "@/lib/constants";
import { toDateInput, toTimeInput } from "@/lib/dates";

export function BookingEditForm({
  booking,
  experts,
}: {
  booking: {
    id: string;
    expertId: string;
    startAt: Date;
    notes: string | null;
    status: string;
    attendance: string;
    isGift: boolean;
    customer: { name: string; phone: string };
  };
  experts: { id: string; name: string; service: { name: string } }[];
}) {
  const [customerName, setCustomerName] = useState(booking.customer.name);
  const [customerPhone, setCustomerPhone] = useState(booking.customer.phone);
  const [expertId, setExpertId] = useState(booking.expertId);
  const [blacklist, setBlacklist] = useState<BlacklistLookup | null>(null);

  useEffect(() => {
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (name.length < 2 && phone.replace(/\D/g, "").length < 8) {
      setBlacklist(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchBlacklist(name, phone).then((next) => {
        if (!cancelled) setBlacklist(next);
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customerName, customerPhone]);

  const verdict = blacklist ? blacklistVerdict(blacklist, expertId) : null;
  const blocked = Boolean(verdict?.blocked);

  return (
    <ActionForm action={updateBooking} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={booking.id} />
      <Field label="اسم العميلة">
        <Input
          name="customerName"
          required
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
        />
      </Field>
      <Field label="رقم الهاتف">
        <Input
          name="customerPhone"
          required
          value={customerPhone}
          onChange={(event) => setCustomerPhone(event.target.value)}
        />
      </Field>
      <Field label="الخبيرة">
        <Select
          name="expertId"
          required
          value={expertId}
          onChange={(event) => setExpertId(event.target.value)}
        >
          {experts.map((expert) => {
            const listed = blacklist?.blockedExperts.some(
              (item) => item.id === expert.id,
            );
            return (
              <option key={expert.id} value={expert.id}>
                {expert.name} — {expert.service.name}
                {listed ? " — في قائمتها السوداء" : ""}
              </option>
            );
          })}
        </Select>
      </Field>
      <Field label="الحالة">
        <Select name="status" defaultValue={booking.status}>
          <option value="SCHEDULED">{labels.status.SCHEDULED}</option>
          <option value="COMPLETED">{labels.status.COMPLETED}</option>
          <option value="CANCELLED">{labels.status.CANCELLED}</option>
        </Select>
      </Field>
      <Field label="حضور الزبونة">
        <Select name="attendance" defaultValue={booking.attendance}>
          <option value="PENDING">{labels.attendance.PENDING}</option>
          <option value="ATTENDED">{labels.attendance.ATTENDED}</option>
          <option value="NO_SHOW">{labels.attendance.NO_SHOW}</option>
        </Select>
      </Field>
      <Field label="التاريخ">
        <Input
          name="date"
          type="date"
          required
          defaultValue={toDateInput(booking.startAt)}
        />
      </Field>
      <Field label="الوقت">
        <Input
          name="time"
          type="time"
          required
          defaultValue={toTimeInput(booking.startAt)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="ملاحظات">
          <Textarea name="notes" defaultValue={booking.notes ?? ""} />
        </Field>
      </div>
      {verdict ? (
        <div className="sm:col-span-2">
          <BlacklistAlert verdict={verdict} />
        </div>
      ) : null}
      <label className="flex items-start gap-3 rounded-xl bg-cream px-4 py-3 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="isGift"
          defaultChecked={booking.isGift}
          className="mt-1"
        />
        <span>هدية من الخبيرة</span>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={blocked}>
          {blocked ? "الحجز ممنوع لهذه العميلة" : "حفظ تعديلات الحجز"}
        </Button>
      </div>
    </ActionForm>
  );
}
