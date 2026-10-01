import { notFound } from "next/navigation";
import { deleteBooking } from "@/actions/bookings";
import { AttendanceControl } from "@/components/attendance-control";
import { BookingEditForm } from "@/components/booking-edit-form";
import { DeleteButton } from "@/components/delete-button";
import { PaymentPanel } from "@/components/payment-panel";
import { PrintReceiptButton, PrintRefundReceiptButton } from "@/components/thermal-receipt";
import { Badge, Card, PageHeader, RowActions } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { labels, ROLES } from "@/lib/constants";
import { formatDate, formatDateTime, formatTime } from "@/lib/dates";
import { expertDue, formatMoney, roundMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { bookingBalance } from "@/lib/settlement";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      expert: true,
      service: true,
      room: true,
      createdBy: true,
      payments: { include: { createdBy: true }, orderBy: { paidAt: "asc" } },
      refunds: { include: { createdBy: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking) notFound();

  const appointment = `${formatDate(booking.startAt)} — ${formatTime(booking.startAt)}`;
  const receiptBase = {
    bookingNumber: booking.number,
    customerName: booking.customer.name,
    customerPhone: booking.customer.phone,
    expertName: booking.expert.name,
    serviceName: booking.service.name,
    roomName: booking.room.name,
    appointment,
    cashierName: user.name,
    chargedPrice: booking.chargedPrice,
  };

  const [balance, experts] = await Promise.all([
    bookingBalance(booking.id),
    prisma.expert.findMany({
      where: { OR: [{ active: true }, { id: booking.expertId }] },
      include: { service: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={`الحجز رقم ${booking.number}`}
        subtitle={`${booking.customer.name} · ${booking.customer.phone}`}
        actions={
          <RowActions>
            {booking.isGift ? <Badge tone="gold">هدية من الخبيرة</Badge> : null}
            <AttendanceControl
              bookingId={booking.id}
              value={booking.attendance}
            />
            <DeleteButton
              action={deleteBooking}
              id={booking.id}
              successHref="/bookings"
              confirmMessage={`حذف الحجز رقم ${booking.number} وكل دفعاته؟ لا يمكن التراجع.`}
            />
          </RowActions>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-medium">تفاصيل الموعد</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="الخبيرة" value={booking.expert.name} />
              <Item label="الخدمة" value={booking.service.name} />
              <Item label="الغرفة" value={booking.room.name} />
              <Item
                label="الوقت"
                value={`${formatDate(booking.startAt)} — ${formatTime(booking.startAt)}`}
              />
              <Item
                label="سعر الخبيرة"
                value={formatMoney(booking.catalogPrice)}
              />
              <Item
                label="المبلغ المطلوب"
                value={formatMoney(booking.chargedPrice)}
              />
              <Item
                label="نسبة الخبيرة"
                value={`${booking.commissionPercent}%`}
              />
              <Item label="أنشأه" value={booking.createdBy.name} />
              <Item
                label="الحالة"
                value={
                  labels.status[booking.status as keyof typeof labels.status] ??
                  booking.status
                }
              />
              <Item
                label="حضور الزبونة"
                value={
                  labels.attendance[
                    booking.attendance as keyof typeof labels.attendance
                  ] ?? booking.attendance
                }
              />
              {booking.notes ? (
                <Item label="ملاحظات" value={booking.notes} />
              ) : null}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-4 font-medium">تعديل بيانات الحجز</h2>
            <BookingEditForm booking={booking} experts={experts} />
          </Card>

          <Card>
            <h2 className="mb-4 font-medium">عمليات الدفع</h2>
            {booking.payments.length === 0 ? (
              <p className="text-sm text-muted">لا توجد دفعات بعد.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {booking.payments.map((payment, index) => {
                  const collectedAfter = roundMoney(
                    booking.payments
                      .slice(0, index + 1)
                      .reduce((sum, item) => sum + item.amount, 0),
                  );
                  const remainingAfter = roundMoney(
                    booking.chargedPrice - collectedAfter,
                  );
                  return (
                    <li
                      key={payment.id}
                      className="rounded-xl border border-line px-3 py-3"
                    >
                      <div className="flex justify-between">
                        <span>
                          {labels.paymentType[payment.type as keyof typeof labels.paymentType]}{" "}
                          · {labels.method[payment.method as keyof typeof labels.method]}
                        </span>
                        <span className="font-medium">
                          {formatMoney(payment.amount)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(payment.paidAt)} · {payment.createdBy.name} ·
                        مستحق الخبيرة {formatMoney(
                          expertDue(payment.amount, booking.commissionPercent),
                        )}
                      </p>
                      <div className="mt-3">
                        <PrintReceiptButton
                          receipt={{
                            ...receiptBase,
                            cashierName: payment.createdBy.name,
                            paidAt: payment.paidAt,
                            paymentType:
                              labels.paymentType[
                                payment.type as keyof typeof labels.paymentType
                              ],
                            paymentMethod:
                              labels.method[
                                payment.method as keyof typeof labels.method
                              ],
                            amount: payment.amount,
                            collected: collectedAfter,
                            remaining: remainingAfter < 0 ? 0 : remainingAfter,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 font-medium">عمليات الاسترجاع</h2>
            {booking.refunds.length === 0 ? (
              <p className="text-sm text-muted">لا يوجد استرجاع مسجّل.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {booking.refunds.map((refund, index) => {
                  const paidTotal = roundMoney(
                    booking.payments.reduce((sum, item) => sum + item.amount, 0),
                  );
                  const refundedThrough = roundMoney(
                    booking.refunds
                      .slice(0, index + 1)
                      .reduce((sum, item) => sum + item.amount, 0),
                  );
                  const collectedAfter = roundMoney(
                    Math.max(0, paidTotal - refundedThrough),
                  );
                  const remainingAfter = roundMoney(
                    booking.chargedPrice - collectedAfter,
                  );
                  return (
                    <li
                      key={refund.id}
                      className="rounded-xl border border-line px-3 py-3"
                    >
                      <div className="flex justify-between">
                        <span>
                          {
                            labels.refundReason[
                              refund.reason as keyof typeof labels.refundReason
                            ]
                          }{" "}
                          ·{" "}
                          {
                            labels.method[
                              refund.method as keyof typeof labels.method
                            ]
                          }
                        </span>
                        <span className="font-medium text-danger">
                          {formatMoney(refund.amount)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(refund.createdAt)} · {refund.createdBy.name}
                      </p>
                      <div className="mt-3">
                        <PrintRefundReceiptButton
                          receipt={{
                            ...receiptBase,
                            cashierName: refund.createdBy.name,
                            refundedAt: refund.createdAt,
                            refundReason:
                              labels.refundReason[
                                refund.reason as keyof typeof labels.refundReason
                              ],
                            refundMethod:
                              labels.method[
                                refund.method as keyof typeof labels.method
                              ],
                            amount: refund.amount,
                            collected: collectedAfter,
                            remaining:
                              remainingAfter < 0 ? 0 : remainingAfter,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-sm text-muted">المحصّل فعليًا</p>
            <p className="text-2xl font-semibold">
              {formatMoney(balance.collected)}
            </p>
            <p className="mt-2 text-sm text-muted">
              المتبقي {formatMoney(balance.remaining)}
            </p>
          </Card>
          <PaymentPanel
            bookingId={booking.id}
            remaining={balance.remaining}
            collected={balance.collected}
            isGift={booking.isGift}
            receipt={receiptBase}
          />
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
