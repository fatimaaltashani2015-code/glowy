import { deleteExpert } from "@/actions/admin";
import { DeleteButton } from "@/components/delete-button";
import { ExpertForm } from "@/components/expert-form";
import { Card, EditLink, PageHeader, RowActions } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireSession([ROLES.MANAGER]);
  const { edit } = await searchParams;
  const [experts, rooms, services] = await Promise.all([
    prisma.expert.findMany({
      include: { room: true, service: true, user: true },
      orderBy: { name: "asc" },
    }),
    prisma.room.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
  ]);
  const editing = edit ? experts.find((expert) => expert.id === edit) : undefined;

  return (
    <div>
      <PageHeader
        title="الخبيرات"
        subtitle="النسبة والسعر يُدخلان لكل خبيرة، ويُثبَّتان على الحجز لاحقًا."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <h2 className="mb-4 font-medium">
            {editing ? `تعديل: ${editing.name}` : "إضافة خبيرة"}
          </h2>
          <ExpertForm expert={editing} rooms={rooms} services={services} />
        </Card>

        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cream text-muted">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium">الخبيرة</th>
                <th className="px-4 py-3 font-medium">الغرفة</th>
                <th className="px-4 py-3 font-medium">التخصص</th>
                <th className="px-4 py-3 font-medium">السعر</th>
                <th className="px-4 py-3 font-medium">النسبة</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {experts.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={6}>
                    لا توجد خبيرات بعد.
                  </td>
                </tr>
              ) : (
                experts.map((expert) => (
                  <tr
                    key={expert.id}
                    className={`border-t border-line ${editing?.id === expert.id ? "bg-rose/5" : ""}`}
                  >
                    <td className="px-4 py-3">{expert.name}</td>
                    <td className="px-4 py-3">{expert.room.name}</td>
                    <td className="px-4 py-3">{expert.service.name}</td>
                    <td className="px-4 py-3">{formatMoney(expert.price)}</td>
                    <td className="px-4 py-3">{expert.commissionPercent}%</td>
                    <td className="px-4 py-3">
                      <RowActions>
                        <EditLink href={`/experts?edit=${expert.id}`} />
                        <DeleteButton
                          action={deleteExpert}
                          id={expert.id}
                          confirmMessage={`حذف الخبيرة «${expert.name}»؟`}
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
