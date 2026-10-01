"use client";

import { useEffect, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import {
  clampReceiptCopies,
  DEFAULT_RECEIPT_COPIES,
  MAX_RECEIPT_COPIES,
  MIN_RECEIPT_COPIES,
  RECEIPT_COPIES_KEY,
  receiptsPrintDocument,
  refundsPrintDocument,
  type PaymentReceiptData,
  type RefundReceiptData,
} from "@/lib/receipt";

export function useReceiptCopies() {
  const [copies, setCopies] = useState(DEFAULT_RECEIPT_COPIES);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(RECEIPT_COPIES_KEY));
    setCopies(clampReceiptCopies(saved || DEFAULT_RECEIPT_COPIES));
  }, []);

  function update(value: number) {
    const next = clampReceiptCopies(value);
    setCopies(next);
    window.localStorage.setItem(RECEIPT_COPIES_KEY, String(next));
  }

  return [copies, update] as const;
}

export function ReceiptCopiesField() {
  const [copies, setCopies] = useReceiptCopies();
  return (
    <Field label="عدد نسخ الإيصال">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="px-3"
          onClick={() => setCopies(copies - 1)}
          disabled={copies <= MIN_RECEIPT_COPIES}
        >
          −
        </Button>
        <Input
          type="number"
          min={MIN_RECEIPT_COPIES}
          max={MAX_RECEIPT_COPIES}
          value={copies}
          onChange={(event) => setCopies(Number(event.target.value))}
          className="text-center"
        />
        <Button
          type="button"
          variant="secondary"
          className="px-3"
          onClick={() => setCopies(copies + 1)}
          disabled={copies >= MAX_RECEIPT_COPIES}
        >
          +
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted">
        الافتراضي نسختان: للعميلة وللمركز. في نافذة الطباعة اختاري طابعة
        Mini Pocket Printer، عرض الورق 58مم، الهوامش 0، والطباعة أبيض وأسود.
      </p>
    </Field>
  );
}

export type PrintFrame = {
  win: Window;
  doc: Document;
  discard: () => void;
};

/**
 * Open a print target synchronously inside a click/submit handler.
 * A blank window is opened first so browsers keep the user-gesture permission
 * even after the payment server action finishes.
 */
export function openPrintFrame(): PrintFrame {
  const popup = window.open("about:blank", "glowy-receipt-print");
  if (popup) {
    try {
      popup.document.write(
        "<!DOCTYPE html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>إيصال دفع</title></head><body style='font-family:Tahoma,Arial,sans-serif;padding:16px;text-align:center'>جارٍ تجهيز الإيصال...</body></html>",
      );
      popup.document.close();
    } catch {
      /* some browsers lock document until later */
    }

    let discarded = false;
    return {
      win: popup,
      doc: popup.document,
      discard: () => {
        if (discarded) return;
        discarded = true;
        try {
          popup.close();
        } catch {
          /* ignore */
        }
      },
    };
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "طباعة الإيصال");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "58mm";
  iframe.style.height = "80vh";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-1";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!win || !doc) {
    iframe.remove();
    throw new Error(
      "تعذر فتح نافذة الطباعة. اسمحي بالنوافذ المنبثقة لهذا الموقع ثم أعيدي المحاولة.",
    );
  }

  let discarded = false;
  return {
    win,
    doc,
    discard: () => {
      if (discarded) return;
      discarded = true;
      iframe.remove();
    },
  };
}

function currentCopies(copies?: number) {
  return (
    copies ??
    clampReceiptCopies(
      Number(window.localStorage.getItem(RECEIPT_COPIES_KEY)) ||
        DEFAULT_RECEIPT_COPIES,
    )
  );
}

function printDocumentTo(frame: PrintFrame, documentHtml: string) {
  return new Promise<void>((resolve, reject) => {
    if (frame.win.closed) {
      reject(
        new Error(
          "أُغلقت نافذة الطباعة قبل اكتمالها. اسمحي بالنوافذ المنبثقة وأعيدي المحاولة.",
        ),
      );
      return;
    }

    try {
      frame.doc.open();
      frame.doc.write(documentHtml);
      frame.doc.close();
    } catch (error) {
      frame.discard();
      reject(
        error instanceof Error
          ? error
          : new Error("تعذر تجهيز الإيصال للطباعة"),
      );
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallback);
      try {
        frame.win.removeEventListener("afterprint", finish);
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        frame.discard();
        resolve();
      }, 400);
    };

    const fallback = window.setTimeout(finish, 12_000);

    window.setTimeout(() => {
      try {
        if (frame.win.closed) {
          window.clearTimeout(fallback);
          reject(new Error("أُغلقت نافذة الطباعة قبل الطباعة."));
          return;
        }
        frame.win.focus();
        frame.win.addEventListener("afterprint", finish);
        frame.win.print();
      } catch (error) {
        window.clearTimeout(fallback);
        frame.discard();
        reject(
          error instanceof Error
            ? error
            : new Error("تعذر تشغيل الطباعة. اسمحي بالنوافذ المنبثقة."),
        );
      }
    }, 200);
  });
}

export function printPaymentReceiptTo(
  frame: PrintFrame,
  data: PaymentReceiptData,
  copies?: number,
) {
  return printDocumentTo(
    frame,
    receiptsPrintDocument(data, currentCopies(copies)),
  );
}

export function printRefundReceiptTo(
  frame: PrintFrame,
  data: RefundReceiptData,
  copies?: number,
) {
  return printDocumentTo(
    frame,
    refundsPrintDocument(data, currentCopies(copies)),
  );
}

export function printPaymentReceipt(data: PaymentReceiptData, copies?: number) {
  const frame = openPrintFrame();
  return printPaymentReceiptTo(frame, data, copies);
}

export function printRefundReceipt(data: RefundReceiptData, copies?: number) {
  const frame = openPrintFrame();
  return printRefundReceiptTo(frame, data, copies);
}

export function PrintReceiptButton({
  receipt,
}: {
  receipt: PaymentReceiptData;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="px-3 py-1.5 text-xs"
      onClick={() => {
        void printPaymentReceipt(receipt).catch((error) => {
          window.alert(
            error instanceof Error ? error.message : "تعذر طباعة الإيصال",
          );
        });
      }}
    >
      طباعة إيصال الدفع
    </Button>
  );
}

export function PrintRefundReceiptButton({
  receipt,
}: {
  receipt: RefundReceiptData;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="px-3 py-1.5 text-xs"
      onClick={() => {
        void printRefundReceipt(receipt).catch((error) => {
          window.alert(
            error instanceof Error
              ? error.message
              : "تعذر طباعة إيصال الاسترجاع",
          );
        });
      }}
    >
      طباعة إيصال الاسترجاع
    </Button>
  );
}
