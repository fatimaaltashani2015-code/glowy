import { deleteBlacklistEntry } from "@/actions/blacklist";
import { BlacklistForm } from "@/components/blacklist-form";
import { DeleteButton } from "@/components/delete-button";
import { Badge, Card, PageHeader, RowActions } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { BLACKLIST_SCOPE, labels, ROLES } from "@/lib/constants";
import { listBlacklistRows } from "@/lib/blacklist";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export default async function BlacklistPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const { customerId } = await searchParams;

  const [customers, experts, entries] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.expert.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    listBlacklistRows(),
  ]);

  return (
    <div>
      <PageHeader
        title="القائمة السوداء"
        subtitle="العميلات اللواتي لا يرغب المركز أو خبيرة معيّنة في التعامل معهن مرة أخرى. يمكن إضافة العميلة أكثر من مرة لخبيرات مختلفات وللمركز بالكامل."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <h2 className="mb-4 font-medium">إضافة عميلة للقائمة</h2>
          {customers.length === 0 ? (
            <p className="text-sm text-muted">
              لا توجد عميلات بعد. أضيفي حجزاً أولاً ليظهر ملف العميلة.
            </p>
          ) : (
            <BlacklistForm
              customers={customers}
              experts={experts}
              selectedCustomerId={customerId}
            />
          )}
        </Card>

        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cream text-muted">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium">الاسم بالكامل</th>
                <th className="px-4 py-3 font-medium">الهاتف</th>
                <th className="px-4 py-3 font-medium">المنع</th>
                <th className="px-4 py-3 font-medium">السبب</th>
                <th className="px-4 py-3 font-medium">أضيفت</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={6}>
                    القائمة فارغة.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-line align-top">
                    <td className="px-4 py-3 font-medium">
                      {entry.customerName}
                    </td>
                    <td className="px-4 py-3">{entry.customerPhone}</td>
                    <td className="px-4 py-3">
                      {entry.scope === BLACKLIST_SCOPE.CENTER ? (
                        <Badge tone="rose">
                          {labels.blacklistScope.CENTER}
                        </Badge>
                      ) : (
                        <Badge tone="warn">
                          الخبيرة {entry.expertName ?? "—"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {entry.reason || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">
                      {entry.createdByName}
                      <span className="mt-1 block">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RowActions>
                        <DeleteButton
                          action={deleteBlacklistEntry}
                          id={entry.id}
                          confirmMessage={`إزالة «${entry.customerName}» من القائمة السوداء؟`}
                        />
                      </RowActions>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
