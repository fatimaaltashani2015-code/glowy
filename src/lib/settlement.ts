import { prisma } from "@/lib/prisma";
import { expertDue, roundMoney } from "@/lib/money";

export type SettlementLine = {
  kind: "payment" | "refund" | "gift";
  id: string;
  serviceName: string;
  customerName: string;
  bookingNumber: number;
  collected: number;
  commissionPercent: number;
  due: number;
  note?: string;
};

export type ExpertSettlement = {
  expertId: string;
  expertName: string;
  lines: SettlementLine[];
  totalCollected: number;
  totalDue: number;
};

export type DailySettlement = {
  businessDate: string;
  experts: ExpertSettlement[];
  totalCollected: number;
  totalDeposits: number;
  totalRefunds: number;
  totalExpertDues: number;
  netRevenue: number;
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  giftCount: number;
};

function emptyTotals() {
  return { CASH: 0, CARD: 0, TRANSFER: 0 };
}

export async function getDailySettlement(
  businessDate: string,
): Promise<DailySettlement> {
  const [payments, refunds, gifts] = await Promise.all([
    prisma.payment.findMany({
      where: { businessDate },
      include: {
        booking: {
          include: { expert: true, service: true, customer: true },
        },
      },
      orderBy: { paidAt: "asc" },
    }),
    prisma.refund.findMany({
      where: { businessDate },
      include: {
        booking: {
          include: { expert: true, service: true, customer: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { businessDate, isGift: true, status: { not: "CANCELLED" } },
      include: { expert: true, service: true, customer: true },
    }),
  ]);

  const byExpert = new Map<string, ExpertSettlement>();

  function bucket(expertId: string, expertName: string) {
    let row = byExpert.get(expertId);
    if (!row) {
      row = {
        expertId,
        expertName,
        lines: [],
        totalCollected: 0,
        totalDue: 0,
      };
      byExpert.set(expertId, row);
    }
    return row;
  }

  const methodNet = emptyTotals();
  let totalDeposits = 0;

  for (const payment of payments) {
    const due = expertDue(
      payment.amount,
      payment.booking.commissionPercent,
    );
    const row = bucket(payment.booking.expertId, payment.booking.expert.name);
    row.lines.push({
      kind: "payment",
      id: payment.id,
      serviceName: payment.booking.service.name,
      customerName: payment.booking.customer.name,
      bookingNumber: payment.booking.number,
      collected: payment.amount,
      commissionPercent: payment.booking.commissionPercent,
      due,
    });
    row.totalCollected = roundMoney(row.totalCollected + payment.amount);
    row.totalDue = roundMoney(row.totalDue + due);
    methodNet[payment.method as keyof typeof methodNet] = roundMoney(
      methodNet[payment.method as keyof typeof methodNet] + payment.amount,
    );
    if (payment.type === "DEPOSIT") {
      totalDeposits = roundMoney(totalDeposits + payment.amount);
    }
  }

  for (const refund of refunds) {
    const due = -expertDue(
      refund.amount,
      refund.booking.commissionPercent,
    );
    const row = bucket(refund.booking.expertId, refund.booking.expert.name);
    row.lines.push({
      kind: "refund",
      id: refund.id,
      serviceName: refund.booking.service.name,
      customerName: refund.booking.customer.name,
      bookingNumber: refund.booking.number,
      collected: -refund.amount,
      commissionPercent: refund.booking.commissionPercent,
      due,
      note: refund.reason,
    });
    row.totalCollected = roundMoney(row.totalCollected - refund.amount);
    row.totalDue = roundMoney(row.totalDue + due);
    methodNet[refund.method as keyof typeof methodNet] = roundMoney(
      methodNet[refund.method as keyof typeof methodNet] - refund.amount,
    );
  }

  for (const gift of gifts) {
    const row = bucket(gift.expertId, gift.expert.name);
    row.lines.push({
      kind: "gift",
      id: gift.id,
      serviceName: gift.service.name,
      customerName: gift.customer.name,
      bookingNumber: gift.number,
      collected: 0,
      commissionPercent: gift.commissionPercent,
      due: 0,
      note: gift.giftReason ?? "هدية من الخبيرة",
    });
  }

  const experts = [...byExpert.values()].sort((a, b) =>
    a.expertName.localeCompare(b.expertName, "ar"),
  );
  const totalCollected = roundMoney(
    experts.reduce((sum, e) => sum + e.totalCollected, 0),
  );
  const totalRefunds = roundMoney(
    refunds.reduce((sum, r) => sum + r.amount, 0),
  );
  const totalExpertDues = roundMoney(
    experts.reduce((sum, e) => sum + e.totalDue, 0),
  );

  return {
    businessDate,
    experts,
    totalCollected,
    totalDeposits,
    totalRefunds,
    totalExpertDues,
    netRevenue: roundMoney(totalCollected - totalExpertDues),
    cashTotal: methodNet.CASH,
    cardTotal: methodNet.CARD,
    transferTotal: methodNet.TRANSFER,
    giftCount: gifts.length,
  };
}

export async function bookingBalance(bookingId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { payments: true, refunds: true },
  });
  const paid = roundMoney(
    booking.payments.reduce((sum, p) => sum + p.amount, 0),
  );
  const refunded = roundMoney(
    booking.refunds.reduce((sum, r) => sum + r.amount, 0),
  );
  const collected = roundMoney(paid - refunded);
  const remaining = roundMoney(booking.chargedPrice - collected);
  return { booking, paid, refunded, collected, remaining };
}
