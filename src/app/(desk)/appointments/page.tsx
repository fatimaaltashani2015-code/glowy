import Link from "next/link";
import { AttendanceBadge } from "@/components/attendance-control";
import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { businessDateFrom, formatDateShort, formatTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireSession([ROLES.EXPERT]);
  const { tab } = await searchParams;
  const current = tab === "upcoming" || tab === "past" ? tab : "today";
  const today = businessDateFrom();

  const expertId = user.expertId;

  if (!expertId) {
    return (
      <PageHeader
        title="مواعيدي"
        subtitle="حسابك غير مرتبط بملف خبيرة. راجعي المديرة."
      />
    );
  }

  const where = { expertId, status: { not: "CANCELLED" } };

  const bookings = await prisma.booking.findMany({
    where:
      current === "today"
        ? { ...where, businessDate: today }
        : current === "upcoming"
          ? { ...where, businessDate: { gt: today } }
          : { ...where, businessDate: { lt: today } },
    include: { customer: true, service: true, room: true },
    orderBy: { startAt: current === "past" ? "desc" : "asc" },
  });

  const tabs = [
    ["today", "اليوم"],
    ["upcoming", "القادمة"],
    ["past", "السابقة"],
  ] as const;

  return (
    <div>
      <PageHeader title="مواعيدي" subtitle="عرض مواعيدك فقط، بدون دخل المركز أو الخبيرات الأخريات." />
      <div className="mb-5 flex gap-2">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/appointments?tab=${key}`}
            className={`rounded-full px-4 py-1.5 text-sm transition ${current === key ? "bg-rose text-white shadow-sm shadow-rose/30" : "bg-paper text-muted border border-line"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <Card>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted">لا توجد مواعيد في هذا القسم.</p>
        ) : (
          <ul className="divide-y divide-line">
            {bookings.map((booking) => (
              <li key={booking.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{booking.customer.name}</p>
                  <p className="text-muted">
                    {booking.service.name} · {booking.room.name}
                    {booking.isGift ? " · هدية" : ""}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-muted">
                    {formatDateShort(booking.startAt)} {formatTime(booking.startAt)}
                  </p>
                  <div className="mt-1">
                    <AttendanceBadge value={booking.attendance} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
