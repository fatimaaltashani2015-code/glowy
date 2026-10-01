"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addPayment, addRefund } from "@/actions/bookings";
import {
  openPrintFrame,
  printPaymentReceiptTo,
  printRefundReceiptTo,
  ReceiptCopiesField,
  type PrintFrame,
} from "@/components/thermal-receipt";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { labels } from "@/lib/constants";
import type { PaymentReceiptData } from "@/lib/receipt";

export type BookingReceiptContext = Omit<
  PaymentReceiptData,
  | "paidAt"
  | "paymentType"
  | "paymentMethod"
  | "amount"
  | "collected"
  | "remaining"
  | "cashierName"
> & {
  cashierName?: string;
};

type PaymentResult = {
  error?: string;
  amount?: number;
  method?: string;
  type?: string;
  paidAt?: string;
  cashierName?: string;
  collected?: number;
  remaining?: number;
};

type RefundResult = {
  error?: string;
  amount?: number;
  method?: string;
  reason?: string;
  refundedAt?: string;
  cashierName?: string;
  collected?: number;
  remaining?: number;
};

export function PaymentPanel({
  bookingId,
  remaining,
  collected,
  isGift,
  receipt,
}: {
  bookingId: string;
  remaining: number;
  collected: number;
  isGift: boolean;
  receipt: BookingReceiptContext;
}) {
  const router = useRouter();
  const [payPending, startPay] = useTransition();
  const [refundPending, startRefund] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  if (isGift) {
    return (
      <Card>
        <h2 className="font-medium">المدفوعات</h2>
        <p className="mt-2 text-sm text-muted">
          هذه الخدمة هدية من الخبيرة. لا تُسجَّل عليها دفعات.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="mb-4 font-medium">تسجيل دفعة</h2>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setPayError(null);

            const form = event.currentTarget;
            const formData = new FormData(form);

            let frame: PrintFrame | null = null;
            try {
              frame = openPrintFrame();
            } catch (err) {
              setPayError(
                err instanceof Error
                  ? err.message
                  : "تعذر فتح نافذة الطباعة",
              );
              return;
            }

            startPay(async () => {
              try {
                const result = (await addPayment(formData)) as PaymentResult;
                if (result?.error) {
                  frame?.discard();
                  setPayError(result.error);
                  return;
                }

                if (typeof result?.amount !== "number") {
                  frame?.discard();
                  setPayError("تم حفظ الدفعة لكن لم تُرجع بيانات الطباعة");
                  router.refresh();
                  return;
                }

                await printPaymentReceiptTo(frame!, {
                  ...receipt,
                  cashierName:
                    result.cashierName ?? receipt.cashierName ?? "",
                  paidAt: result.paidAt ?? new Date().toISOString(),
                  paymentType:
                    labels.paymentType[
                      result.type as keyof typeof labels.paymentType
                    ] ??
                    result.type ??
                    "",
                  paymentMethod:
                    labels.method[
                      result.method as keyof typeof labels.method
                    ] ??
                    result.method ??
                    "",
                  amount: result.amount,
                  collected: result.collected ?? collected + result.amount,
                  remaining: result.remaining ?? remaining - result.amount,
                });

                form.reset();
                router.refresh();
              } catch (err) {
                frame?.discard();
                setPayError(
                  err instanceof Error ? err.message : "تعذر حفظ الدفعة",
                );
              }
            });
          }}
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <Field label="المبلغ">
            <Input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              max={remaining}
              required
              defaultValue={remaining > 0 ? remaining : undefined}
            />
          </Field>
          <Field label="نوع الدفعة">
            <Select
              name="type"
              defaultValue={collected > 0 ? "REMAINDER" : "DEPOSIT"}
            >
              <option value="DEPOSIT">{labels.paymentType.DEPOSIT}</option>
              <option value="FULL">{labels.paymentType.FULL}</option>
              <option value="REMAINDER">{labels.paymentType.REMAINDER}</option>
            </Select>
          </Field>
          <Field label="طريقة الدفع">
            <Select name="method" defaultValue="CASH">
              <option value="CASH">{labels.method.CASH}</option>
              <option value="CARD">{labels.method.CARD}</option>
              <option value="TRANSFER">{labels.method.TRANSFER}</option>
            </Select>
          </Field>
          <ReceiptCopiesField />
          {remaining <= 0 ? (
            <p className="text-sm text-ok">تم تحصيل المبلغ بالكامل.</p>
          ) : (
            <Button type="submit" disabled={payPending}>
              {payPending
                ? "جارٍ الحفظ والطباعة..."
                : "حفظ الدفعة وطباعة الإيصال"}
            </Button>
          )}
          {payError ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {payError}
            </p>
          ) : null}
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">استرجاع عربون / مبلغ</h2>
        <p className="mb-3 text-sm text-muted">
          الاسترجاع عملية مستقلة، وليس حذفًا للدفعة. يؤثر مباشرة على حسابات
          اليوم وتقرير الخبيرة.
        </p>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setRefundError(null);

            const form = event.currentTarget;
            const formData = new FormData(form);

            let frame: PrintFrame | null = null;
            try {
              frame = openPrintFrame();
            } catch (err) {
              setRefundError(
                err instanceof Error
                  ? err.message
                  : "تعذر فتح نافذة الطباعة",
              );
              return;
            }

            startRefund(async () => {
              try {
                const result = (await addRefund(formData)) as RefundResult;
                if (result?.error) {
                  frame?.discard();
                  setRefundError(result.error);
                  return;
                }

                if (typeof result?.amount !== "number") {
                  frame?.discard();
                  setRefundError(
                    "تم حفظ الاسترجاع لكن لم تُرجع بيانات الطباعة",
                  );
                  router.refresh();
                  return;
                }

                await printRefundReceiptTo(frame!, {
                  ...receipt,
                  cashierName:
                    result.cashierName ?? receipt.cashierName ?? "",
                  refundedAt:
                    result.refundedAt ?? new Date().toISOString(),
                  refundReason:
                    labels.refundReason[
                      result.reason as keyof typeof labels.refundReason
                    ] ??
                    result.reason ??
                    "",
                  refundMethod:
                    labels.method[
                      result.method as keyof typeof labels.method
                    ] ??
                    result.method ??
                    "",
                  amount: result.amount,
                  collected:
                    result.collected ??
                    Math.max(0, collected - result.amount),
                  remaining: result.remaining ?? remaining + result.amount,
                });

                form.reset();
                router.refresh();
              } catch (err) {
                frame?.discard();
                setRefundError(
                  err instanceof Error ? err.message : "تعذر حفظ الاسترجاع",
                );
              }
            });
          }}
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <Field label="المبلغ">
            <Input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              max={collected}
              required
            />
          </Field>
          <Field label="السبب">
            <Select name="reason" defaultValue="EXPERT_APOLOGY">
              <option value="EXPERT_APOLOGY">
                {labels.refundReason.EXPERT_APOLOGY}
              </option>
              <option value="FORCE_MAJEURE">
                {labels.refundReason.FORCE_MAJEURE}
              </option>
            </Select>
          </Field>
          <Field label="طريقة الإرجاع">
            <Select name="method" defaultValue="CASH">
              <option value="CASH">{labels.method.CASH}</option>
              <option value="CARD">{labels.method.CARD}</option>
              <option value="TRANSFER">{labels.method.TRANSFER}</option>
            </Select>
          </Field>
          <ReceiptCopiesField />
          {collected <= 0 ? (
            <p className="text-sm text-muted">لا يوجد مبلغ محصّل لاسترجاعه.</p>
          ) : (
            <Button type="submit" variant="danger" disabled={refundPending}>
              {refundPending
                ? "جارٍ الحفظ والطباعة..."
                : "تسجيل الاسترجاع وطباعة الإيصال"}
            </Button>
          )}
          {refundError ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {refundError}
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
