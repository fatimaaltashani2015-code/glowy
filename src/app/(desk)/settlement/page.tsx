import { Badge, Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { labels, ROLES } from "@/lib/constants";
import { businessDateFrom } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getDailySettlement } from "@/lib/settlement";
import { prisma } from "@/lib/prisma";
import { DateFilter } from "@/components/date-filter";

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireSession([ROLES.MANAGER]);
  const { date } = await searchParams;
  const businessDate = date || businessDateFrom();
  const report = await getDailySettlement(businessDate);
  const closed = await prisma.dayClose.findUnique({
    where: { businessDate },
  });

  return (
    <div>
      <PageHeader
        title="التسوية اليومية للخبيرات"
        subtitle="النسبة تُحسب من المبالغ المحصّلة فعليًا في هذا اليوم، بما فيها العربون والدفعات اللاحقة والاسترجاع والهدايا."
        actions={<DateFilter date={businessDate} path="/settlement" />}
      />

      {closed ? <Badge tone="warn">اليوم مغلق</Badge> : <Badge tone="ok">اليوم مفتوح</Badge>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="إجمالي المحصّل" value={formatMoney(report.totalCollected)} />
        <Mini label="العربونات" value={formatMoney(report.totalDeposits)} />
        <Mini label="المسترجع" value={formatMoney(report.totalRefunds)} />
        <Mini label="مستحق الخبيرات" value={formatMoney(report.totalExpertDues)} />
      </div>

      <div className="mt-6 space-y-4">
        {report.experts.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">لا توجد عمليات تحصيل في هذا اليوم.</p>
          </Card>
        ) : (
          report.experts.map((expert) => (
            <Card key={expert.expertId} className="overflow-x-auto">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">الخبيرة: {expert.expertName}</h2>
                <p className="text-sm text-muted">
                  المحصّل {formatMoney(expert.totalCollected)} · المستحق{" "}
                  {formatMoney(expert.totalDue)}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="text-muted">
                  <tr className="text-right">
                    <th className="py-2 font-medium">الخدمة</th>
                    <th className="py-2 font-medium">العميلة</th>
                    <th className="py-2 font-medium">المبلغ المحصّل</th>
                    <th className="py-2 font-medium">النسبة</th>
                    <th className="py-2 font-medium">مستحق الخبيرة</th>
                  </tr>
                </thead>
                <tbody>
                  {expert.lines.map((line) => (
                    <tr key={line.id} className="border-t border-line">
                      <td className="py-2">
                        {line.serviceName}
                        {line.kind === "gift" ? (
                          <Badge tone="gold">هدية</Badge>
                        ) : null}
                        {line.kind === "refund" ? (
                          <Badge tone="rose">استرجاع</Badge>
                        ) : null}
                      </td>
                      <td className="py-2">
                        {line.customerName}
                        <span className="block text-xs text-muted">
                          حجز {line.bookingNumber}
                          {line.note
                            ? ` · ${labels.refundReason[line.note as keyof typeof labels.refundReason] ?? line.note}`
                            : ""}
                        </span>
                      </td>
                      <td className="py-2">{formatMoney(line.collected)}</td>
                      <td className="py-2">{line.commissionPercent}%</td>
                      <td className="py-2">{formatMoney(line.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </Card>
  );
}
