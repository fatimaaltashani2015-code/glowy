import Link from "next/link";
import { deleteCustomer } from "@/actions/admin";
import { DeleteButton } from "@/components/delete-button";
import { CustomerForm } from "@/components/customer-form";
import { Badge, Card, EditLink, PageHeader, RowActions } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { listedCustomerIds } from "@/lib/blacklist";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const { edit } = await searchParams;
  const [customers, listed] = await Promise.all([
    prisma.customer.findMany({
      include: { _count: { select: { bookings: true } } },
      orderBy: { createdAt: "desc" },
    }),
    listedCustomerIds(),
  ]);
  const listedIds = new Set(listed);
  const editing = edit
    ? customers.find((customer) => customer.id === edit)
    : undefined;

  return (
    <div>
      <PageHeader
        title="العميلات"
        subtitle="يُنشأ ملف العميلة تلقائيًا عند أول حجز، ويمكن تعديل الاسم والهاتف هنا."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <h2 className="mb-4 font-medium">
            {editing ? `تعديل: ${editing.name}` : "تعديل بيانات عميلة"}
          </h2>
          {editing ? (
            <CustomerForm customer={editing} />
          ) : (
            <p className="text-sm text-muted">
              اضغطي تعديل بجانب العميلة لتصحيح الاسم أو رقم الهاتف.
            </p>
          )}
        </Card>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cream text-muted">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">الهاتف</th>
                <th className="px-4 py-3 font-medium">عدد الحجوزات</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={4}>
                    لا توجد عميلات بعد.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`border-t border-line ${editing?.id === customer.id ? "bg-rose/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {customer.name}
                        {listedIds.has(customer.id) ? (
                          <Badge tone="rose">قائمة سوداء</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{customer.phone}</td>
                    <td className="px-4 py-3">{customer._count.bookings}</td>
                    <td className="px-4 py-3">
                      <RowActions>
                        <EditLink href={`/customers?edit=${customer.id}`} />
                        <Link
                          href={`/blacklist?customerId=${customer.id}`}
                          className="font-medium text-rose hover:text-rose-dark"
                        >
                          قائمة سوداء
                        </Link>
                        <DeleteButton
                          action={deleteCustomer}
                          id={customer.id}
                          confirmMessage={`حذف العميلة «${customer.name}» مع كل حجوزاتها ودفعاتها وسجلات القائمة السوداء؟`}
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
