import { deleteService } from "@/actions/admin";
import { DeleteButton } from "@/components/delete-button";
import { ServiceForm } from "@/components/service-form";
import { Card, EditLink, PageHeader, RowActions } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireSession([ROLES.MANAGER]);
  const { edit } = await searchParams;
  const services = await prisma.service.findMany({
    include: { experts: true },
    orderBy: { name: "asc" },
  });
  const editing = edit
    ? services.find((service) => service.id === edit)
    : undefined;

  return (
    <div>
      <PageHeader
        title="الخدمات"
        subtitle="مدة الخدمة تُستخدم لحساب الأوقات المتاحة ومنع تعارض مواعيد الخبيرة."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="mb-4 font-medium">
            {editing ? `تعديل: ${editing.name}` : "خدمة جديدة"}
          </h2>
          <ServiceForm service={editing} />
        </Card>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cream text-muted">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium">الخدمة</th>
                <th className="px-4 py-3 font-medium">المدة</th>
                <th className="px-4 py-3 font-medium">الخبيرات</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service.id}
                  className={`border-t border-line ${editing?.id === service.id ? "bg-rose/5" : ""}`}
                >
                  <td className="px-4 py-3">{service.name}</td>
                  <td className="px-4 py-3">{service.durationMinutes} دقيقة</td>
                  <td className="px-4 py-3">
                    {service.experts.map((e) => e.name).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions>
                      <EditLink href={`/services?edit=${service.id}`} />
                      <DeleteButton
                        action={deleteService}
                        id={service.id}
                        confirmMessage={`حذف الخدمة «${service.name}»؟`}
                      />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
