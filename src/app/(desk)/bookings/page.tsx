import Link from "next/link";
import { deleteBooking } from "@/actions/bookings";
import { AttendanceControl } from "@/components/attendance-control";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Card, EditLink, PageHeader, RowActions } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { labels, ROLES } from "@/lib/constants";
import { formatDateShort, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { bookingBalance } from "@/lib/settlement";

export default async function BookingsPage() {
  await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const bookings = await prisma.booking.findMany({
    include: { customer: true, expert: true, service: true, room: true },
    orderBy: { startAt: "desc" },
    take: 80,
  });

  const rows = await Promise.all(
    bookings.map(async (booking) => {
      const balance = await bookingBalance(booking.id);
      return { booking, remaining: balance.remaining, collected: balance.collected };
    }),
  );

  return (
    <div>
      <PageHeader
        title="الحجوزات"
        subtitle="آخر الحجوزات المسجّلة"
        actions={
          <Link
            href="/bookings/new"
            className="rounded-xl bg-rose px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-rose/25"
          >
            حجز جديد
          </Link>
        }
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-cream text-muted">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">رقم</th>
              <th className="px-4 py-3 font-medium">التاريخ</th>
              <th className="px-4 py-3 font-medium">العميلة</th>
              <th className="px-4 py-3 font-medium">الخبيرة</th>
              <th className="px-4 py-3 font-medium">المطلوب</th>
              <th className="px-4 py-3 font-medium">المحصّل</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 font-medium">الحضور</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ booking, remaining, collected }) => (
              <tr key={booking.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link className="text-rose hover:underline" href={`/bookings/${booking.id}`}>
                    {booking.number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {formatDateShort(booking.startAt)} {formatTime(booking.startAt)}
                </td>
                <td className="px-4 py-3">{booking.customer.name}</td>
                <td className="px-4 py-3">
                  {booking.expert.name}
                  <span className="block text-xs text-muted">
                    {booking.service.name} · {booking.room.name}
                  </span>
                </td>
                <td className="px-4 py-3">{formatMoney(booking.chargedPrice)}</td>
                <td className="px-4 py-3">{formatMoney(collected)}</td>
                <td className="px-4 py-3">
                  {booking.isGift ? (
                    <Badge tone="gold">هدية</Badge>
                  ) : remaining <= 0 ? (
                    <Badge tone="ok">مدفوع</Badge>
                  ) : collected > 0 ? (
                    <Badge tone="warn">عربون / جزئي</Badge>
                  ) : (
                    <Badge>{labels.status[booking.status as keyof typeof labels.status] ?? booking.status}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AttendanceControl
                    bookingId={booking.id}
                    value={booking.attendance}
                  />
                </td>
                <td className="px-4 py-3">
                  <RowActions>
                    <EditLink href={`/bookings/${booking.id}`} />
                    <DeleteButton
                      action={deleteBooking}
                      id={booking.id}
                      confirmMessage={`حذف الحجز رقم ${booking.number} وكل دفعاته؟`}
                    />
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
