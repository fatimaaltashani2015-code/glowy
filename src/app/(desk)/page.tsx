import Link from "next/link";
import { redirect } from "next/navigation";
import { AppointmentsTable } from "@/components/appointments-table";
import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { businessDateFrom, formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getDailySettlement } from "@/lib/settlement";

export default async function HomePage() {
  const user = await requireSession();
  if (user.role === ROLES.EXPERT) redirect("/appointments");

  const today = businessDateFrom();
  const [todayBookings, settlement, closed] = await Promise.all([
    prisma.booking.findMany({
      where: { businessDate: today, status: { not: "CANCELLED" } },
      include: { customer: true, expert: true, service: true },
      orderBy: { startAt: "asc" },
    }),
    user.role === ROLES.MANAGER ? getDailySettlement(today) : null,
    prisma.dayClose.findUnique({ where: { businessDate: today } }),
  ]);

  return (
    <div>
      <PageHeader
        title="لوحة اليوم"
        subtitle={formatDate(new Date())}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/month"
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-cream"
            >
              مواعيد الشهر
            </Link>
            <Link
              href="/bookings/new"
              className="rounded-xl bg-rose px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-rose/25 transition hover:bg-rose-dark"
            >
              حجز جديد
            </Link>
          </div>
        }
      />

      {closed ? (
        <p className="mb-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-ink">
          تم إغلاق هذا اليوم. أي تعديل يتطلب صلاحية المدير ويُسجَّل في سجل
          العمليات.
        </p>
      ) : null}

      {settlement ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="المحصّل اليوم" value={formatMoney(settlement.totalCollected)} />
          <Stat label="مستحقات الخبيرات" value={formatMoney(settlement.totalExpertDues)} />
          <Stat label="صافي المركز" value={formatMoney(settlement.netRevenue)} />
          <Stat label="المسترجع" value={formatMoney(settlement.totalRefunds)} />
        </div>
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Stat label="حجوزات اليوم" value={String(todayBookings.length)} />
          <Stat
            label="هدايا اليوم"
            value={String(todayBookings.filter((b) => b.isGift).length)}
          />
        </div>
      )}

      <AppointmentsTable
        title="مواعيد اليوم"
        empty="لا توجد حجوزات لهذا اليوم."
        bookings={todayBookings}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </Card>
  );
}
