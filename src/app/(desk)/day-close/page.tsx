import { closeDay } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Button, Card, PageHeader } from "@/components/ui";
import { DateFilter } from "@/components/date-filter";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { businessDateFrom, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getDailySettlement } from "@/lib/settlement";

export default async function DayClosePage({
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
    include: { closedBy: true },
  });
  const history = await prisma.dayClose.findMany({
    include: { closedBy: true },
    orderBy: { businessDate: "desc" },
    take: 14,
  });

  const rows = [
    ["إجمالي المقبوضات", formatMoney(report.totalCollected)],
    ["إجمالي العربونات", formatMoney(report.totalDeposits)],
    ["إجمالي المبالغ المسترجعة", formatMoney(report.totalRefunds)],
    ["إجمالي مستحقات الخبيرات", formatMoney(report.totalExpertDues)],
    ["صافي إيراد المركز", formatMoney(report.netRevenue)],
    ["النقد", formatMoney(report.cashTotal)],
    ["البطاقات", formatMoney(report.cardTotal)],
    ["التحويلات", formatMoney(report.transferTotal)],
  ];

  return (
    <div>
      <PageHeader
        title="إغلاق اليوم"
        subtitle="بعد الإغلاق لا يعدّل الاستقبال عمليات ذلك اليوم. المدير فقط يمكنه ذلك مع تسجيل العملية."
        actions={<DateFilter date={businessDate} path="/day-close" />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="mb-4 font-medium">مراجعة {businessDate}</h2>
          <dl className="space-y-3 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-line pb-2">
                <dt className="text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {closed ? (
            <p className="mt-4 rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-sm text-ink">
              أُغلق بواسطة {closed.closedBy.name} في {formatDateTime(closed.closedAt)}
            </p>
          ) : (
            <ActionForm action={closeDay} className="mt-5">
              <input type="hidden" name="businessDate" value={businessDate} />
              <Button type="submit">إغلاق اليوم</Button>
            </ActionForm>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">مستحقات الخبيرات</h2>
          {report.experts.length === 0 ? (
            <p className="text-sm text-muted">لا مستحقات في هذا اليوم.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.experts.map((expert) => (
                <li key={expert.expertId} className="flex justify-between">
                  <span>{expert.expertName}</span>
                  <span>{formatMoney(expert.totalDue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-cream text-muted">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">اليوم</th>
              <th className="px-4 py-3 font-medium">المحصّل</th>
              <th className="px-4 py-3 font-medium">صافي المركز</th>
              <th className="px-4 py-3 font-medium">أغلقه</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">{row.businessDate}</td>
                <td className="px-4 py-3">{formatMoney(row.totalCollected)}</td>
                <td className="px-4 py-3">{formatMoney(row.netRevenue)}</td>
                <td className="px-4 py-3">{row.closedBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
