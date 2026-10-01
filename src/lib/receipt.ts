import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export type PaymentReceiptData = {
  bookingNumber: number;
  paidAt: Date | string;
  customerName: string;
  customerPhone: string;
  expertName: string;
  serviceName: string;
  roomName: string;
  appointment: string;
  cashierName: string;
  paymentType: string;
  paymentMethod: string;
  amount: number;
  chargedPrice: number;
  collected: number;
  remaining: number;
};

export type RefundReceiptData = {
  bookingNumber: number;
  refundedAt: Date | string;
  customerName: string;
  customerPhone: string;
  expertName: string;
  serviceName: string;
  roomName: string;
  appointment: string;
  cashierName: string;
  refundReason: string;
  refundMethod: string;
  amount: number;
  chargedPrice: number;
  collected: number;
  remaining: number;
};

/** Mini Pocket / 58mm thermal paper */
export const RECEIPT_PAPER_WIDTH_MM = 58;
export const RECEIPT_PRINTABLE_WIDTH_MM = 48;

export const RECEIPT_COPIES_KEY = "glowy-receipt-copies";
export const DEFAULT_RECEIPT_COPIES = 2;
export const MIN_RECEIPT_COPIES = 1;
export const MAX_RECEIPT_COPIES = 9;

export function clampReceiptCopies(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_RECEIPT_COPIES;
  return Math.min(
    MAX_RECEIPT_COPIES,
    Math.max(MIN_RECEIPT_COPIES, Math.round(value)),
  );
}

export function copyLabel(index: number) {
  if (index === 0) return "نسخة العميلة";
  if (index === 1) return "نسخة المركز";
  return `نسخة إضافية ${index + 1}`;
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function line(char = "-") {
  return `<p class="line">${esc(char.repeat(24))}</p>`;
}

/** Table rows print more reliably on Mini Pocket thermal drivers than flex. */
function row(label: string, value: string, strong = false) {
  return `<tr class="${strong ? "strong" : ""}">
    <td class="k">${esc(label)}</td>
    <td class="v">${esc(value)}</td>
  </tr>`;
}

export function receiptTicketHtml(data: PaymentReceiptData, label: string) {
  const bookingNo = String(data.bookingNumber).padStart(5, "0");
  const paidOff = data.remaining <= 0.001;

  return `
    <article class="ticket">
      ${line("*")}
      <p class="name">GLOWY</p>
      <p class="sub">CLINIC &amp; BEAUTY</p>
      ${line("*")}
      <p class="title">إيصال دفع</p>
      <p class="copy">${esc(label)}</p>
      <p class="center">حجز رقم ${esc(bookingNo)}</p>
      ${line("-")}
      <table class="rows" dir="rtl">
        ${row("التاريخ", formatDateTime(data.paidAt))}
        ${row("العميلة", data.customerName)}
        ${row("الهاتف", data.customerPhone)}
        ${row("الخبيرة", data.expertName)}
        ${row("الخدمة", data.serviceName)}
        ${row("الغرفة", data.roomName)}
        ${row("الموعد", data.appointment)}
      </table>
      ${line("-")}
      <table class="rows" dir="rtl">
        ${row("قيمة الخدمة", formatMoney(data.chargedPrice))}
        ${row("نوع الدفعة", data.paymentType)}
        ${row("طريقة الدفع", data.paymentMethod)}
        ${row("هذه الدفعة", formatMoney(data.amount), true)}
        ${row("المحصّل", formatMoney(data.collected))}
        ${row("المتبقي", formatMoney(paidOff ? 0 : data.remaining), paidOff)}
      </table>
      ${paidOff ? `<p class="center strong-text">مسدد بالكامل</p>` : ""}
      ${line("-")}
      <table class="rows" dir="rtl">
        ${row("الموظفة", data.cashierName)}
      </table>
      <p class="thanks">شكراً لزيارتكم</p>
      ${line("*")}
      <p class="cut">--- قص / قطع ---</p>
    </article>
  `;
}

export function receiptsPrintHtml(data: PaymentReceiptData, copies: number) {
  const count = clampReceiptCopies(copies);
  const tickets = Array.from({ length: count }, (_, i) =>
    receiptTicketHtml(data, copyLabel(i)),
  ).join("");
  return `<div class="stack" dir="rtl">${tickets}</div>`;
}

/**
 * CSS tuned for Mini Pocket Printer (58mm Bluetooth/USB thermal).
 * Avoids flex/gradients/opacity which many pocket drivers render poorly.
 */
export const RECEIPT_PRINT_CSS = `
  @page {
    size: ${RECEIPT_PAPER_WIDTH_MM}mm auto;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    color: #000 !important;
    background: #fff !important;
    box-shadow: none !important;
    text-shadow: none !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: ${RECEIPT_PAPER_WIDTH_MM}mm;
    background: #fff;
    color: #000;
    font-family: Tahoma, "Segoe UI", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.35;
  }
  .stack {
    width: ${RECEIPT_PRINTABLE_WIDTH_MM}mm;
    margin: 0 auto;
    direction: rtl;
  }
  .ticket {
    width: ${RECEIPT_PRINTABLE_WIDTH_MM}mm;
    padding: 2mm 0 6mm;
    page-break-after: always;
    break-after: page;
  }
  .ticket:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .name, .sub, .title, .copy, .center, .thanks, .cut, .line {
    display: block;
    width: 100%;
    text-align: center;
    margin: 2px 0;
  }
  .line {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
    white-space: nowrap;
    overflow: hidden;
  }
  .name {
    margin-top: 2px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }
  .sub {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
  }
  .title {
    margin-top: 4px;
    font-size: 14px;
    font-weight: 800;
  }
  .copy, .center, .thanks, .cut {
    font-size: 11px;
  }
  .thanks {
    margin-top: 6px;
    font-weight: 700;
  }
  .cut {
    margin-top: 8px;
    font-weight: 700;
  }
  .strong-text {
    font-weight: 800;
  }
  table.rows {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin: 2px 0;
  }
  table.rows td {
    padding: 2px 0;
    vertical-align: top;
    font-size: 12px;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  table.rows td.k {
    width: 38%;
    text-align: right;
    font-weight: 400;
  }
  table.rows td.v {
    width: 62%;
    text-align: left;
    font-weight: 700;
  }
  table.rows tr.strong td {
    font-size: 13px;
    font-weight: 800;
    padding-top: 4px;
    padding-bottom: 4px;
  }
`;

export function receiptsPrintDocument(data: PaymentReceiptData, copies: number) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>إيصال دفع — Mini Pocket 58mm</title>
  <style>${RECEIPT_PRINT_CSS}</style>
</head>
<body>
  ${receiptsPrintHtml(data, copies)}
</body>
</html>`;
}

export function refundTicketHtml(data: RefundReceiptData, label: string) {
  const bookingNo = String(data.bookingNumber).padStart(5, "0");

  return `
    <article class="ticket">
      ${line("*")}
      <p class="name">GLOWY</p>
      <p class="sub">CLINIC &amp; BEAUTY</p>
      ${line("*")}
      <p class="title">إيصال استرجاع</p>
      <p class="copy">${esc(label)}</p>
      <p class="center">حجز رقم ${esc(bookingNo)}</p>
      ${line("-")}
      <table class="rows" dir="rtl">
        ${row("التاريخ", formatDateTime(data.refundedAt))}
        ${row("العميلة", data.customerName)}
        ${row("الهاتف", data.customerPhone)}
        ${row("الخبيرة", data.expertName)}
        ${row("الخدمة", data.serviceName)}
        ${row("الغرفة", data.roomName)}
        ${row("الموعد", data.appointment)}
      </table>
      ${line("-")}
      <table class="rows" dir="rtl">
        ${row("قيمة الخدمة", formatMoney(data.chargedPrice))}
        ${row("سبب الاسترجاع", data.refundReason)}
        ${row("طريقة الإرجاع", data.refundMethod)}
        ${row("مبلغ الاسترجاع", formatMoney(data.amount), true)}
        ${row("المحصّل بعد الاسترجاع", formatMoney(data.collected))}
        ${row("المتبقي", formatMoney(data.remaining < 0.001 ? 0 : data.remaining))}
      </table>
      ${line("-")}
      <table class="rows" dir="rtl">
        ${row("الموظفة", data.cashierName)}
      </table>
      <p class="thanks">تم تسجيل الاسترجاع</p>
      ${line("*")}
      <p class="cut">--- قص / قطع ---</p>
    </article>
  `;
}

export function refundsPrintHtml(data: RefundReceiptData, copies: number) {
  const count = clampReceiptCopies(copies);
  const tickets = Array.from({ length: count }, (_, i) =>
    refundTicketHtml(data, copyLabel(i)),
  ).join("");
  return `<div class="stack" dir="rtl">${tickets}</div>`;
}

export function refundsPrintDocument(data: RefundReceiptData, copies: number) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>إيصال استرجاع — Mini Pocket 58mm</title>
  <style>${RECEIPT_PRINT_CSS}</style>
</head>
<body>
  ${refundsPrintHtml(data, copies)}
</body>
</html>`;
}
