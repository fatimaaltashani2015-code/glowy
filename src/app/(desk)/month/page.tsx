import { AppointmentsTable } from "@/components/appointments-table";
import { MonthFilter } from "@/components/month-filter";
import { PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { businessDateFrom, formatMonth } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

function monthLabel(month: string) {
  return formatMonth(new Date(`${month}-01T12:00:00+02:00`));
}

export default async function MonthAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const today = businessDateFrom();
  const { month: monthParam } = await searchParams;
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : today.slice(0, 7);

  const bookings = await prisma.booking.findMany({
    where: {
      businessDate: { startsWith: month },
      status: { not: "CANCELLED" },
    },
    include: { customer: true, expert: true, service: true },
    orderBy: { startAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title={`مواعيد ${monthLabel(month)}`}
        subtitle="جدول مستقل عن مواعيد اليوم في اللوحة الرئيسية."
        actions={<MonthFilter month={month} path="/month" />}
      />
      <AppointmentsTable
        title="كل مواعيد الشهر"
        empty="لا توجد حجوزات في هذا الشهر."
        bookings={bookings}
        showDate
        today={today}
      />
    </div>
  );
}
