import Link from "next/link";
import { deleteBooking } from "@/actions/bookings";
import { AttendanceControl } from "@/components/attendance-control";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Card, EditLink, RowActions } from "@/components/ui";
import { labels } from "@/lib/constants";
import { formatDayLabel, formatTime } from "@/lib/dates";

export type DeskAppointment = {
  id: string;
  number: number;
  businessDate: string;
  startAt: Date;
  status: string;
  attendance: string;
  isGift: boolean;
  customer: { name: string };
  expert: { name: string };
  service: { name: string };
};

export function AppointmentsTable({
  title,
  empty,
  bookings,
  showDate = false,
  today,
}: {
  title: string;
  empty: string;
  bookings: DeskAppointment[];
  showDate?: boolean;
  today?: string;
}) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted">{bookings.length} موعد</p>
      </div>
      {bookings.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line text-right">
                {showDate ? <th className="py-2 font-medium">التاريخ</th> : null}
                <th className="py-2 font-medium">الوقت</th>
                <th className="py-2 font-medium">العميلة</th>
                <th className="py-2 font-medium">الخبيرة</th>
                <th className="py-2 font-medium">الخدمة</th>
                <th className="py-2 font-medium">الحالة</th>
                <th className="py-2 font-medium">الحضور</th>
                <th className="py-2 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className={`border-b border-line/70 ${
                    showDate && booking.businessDate === today
                      ? "bg-rose/5"
                      : ""
                  }`}
                >
                  {showDate ? (
                    <td className="py-3 whitespace-nowrap">
                      {formatDayLabel(booking.startAt)}
                    </td>
                  ) : null}
                  <td className="py-3">{formatTime(booking.startAt)}</td>
                  <td>
                    <Link
                      className="hover:text-rose"
                      href={`/bookings/${booking.id}`}
                    >
                      {booking.customer.name}
                    </Link>
                  </td>
                  <td>{booking.expert.name}</td>
                  <td>{booking.service.name}</td>
                  <td>
                    {booking.isGift ? (
                      <Badge tone="gold">هدية</Badge>
                    ) : (
                      <Badge>
                        {labels.status[
                          booking.status as keyof typeof labels.status
                        ] ?? `حجز ${booking.number}`}
                      </Badge>
                    )}
                  </td>
                  <td>
                    <AttendanceControl
                      bookingId={booking.id}
                      value={booking.attendance}
                    />
                  </td>
                  <td>
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
        </div>
      )}
    </Card>
  );
}
