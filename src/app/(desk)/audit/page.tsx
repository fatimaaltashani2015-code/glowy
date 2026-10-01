import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  await requireSession([ROLES.MANAGER]);
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  return (
    <div>
      <PageHeader
        title="سجل العمليات"
        subtitle="كل إنشاء حجز أو دفعة أو استرجاع أو تعديل بعد إغلاق اليوم يُحفظ هنا."
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-cream text-muted">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">الوقت</th>
              <th className="px-4 py-3 font-medium">المستخدم</th>
              <th className="px-4 py-3 font-medium">الإجراء</th>
              <th className="px-4 py-3 font-medium">الكيان</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-line align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </td>
                <td className="px-4 py-3">{log.user.name}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">
                  {log.entity} · {log.entityId}
                  <pre className="mt-1 max-w-xl overflow-x-auto text-[11px] text-muted">
                    {log.details}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
