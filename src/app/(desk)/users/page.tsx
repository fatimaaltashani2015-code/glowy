import { deleteStaffUser } from "@/actions/admin";
import { DeleteButton } from "@/components/delete-button";
import { StaffUserForm } from "@/components/staff-user-form";
import { Card, EditLink, PageHeader, RowActions } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { labels, ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireSession([ROLES.MANAGER]);
  const { edit } = await searchParams;
  const users = await prisma.user.findMany({
    include: { expert: true },
    orderBy: { createdAt: "asc" },
  });
  const editing = edit ? users.find((account) => account.id === edit) : undefined;

  return (
    <div>
      <PageHeader
        title="المستخدمون"
        subtitle="حسابات المدير والاستقبال. حساب الخبيرة يُنشأ مع ملفها."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <h2 className="mb-4 font-medium">
            {editing ? `تعديل: ${editing.name}` : "مستخدم جديد"}
          </h2>
          <StaffUserForm account={editing} />
        </Card>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-cream text-muted">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">الدخول</th>
                <th className="px-4 py-3 font-medium">الدور</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr
                  key={account.id}
                  className={`border-t border-line ${editing?.id === account.id ? "bg-rose/5" : ""}`}
                >
                  <td className="px-4 py-3">{account.name}</td>
                  <td className="px-4 py-3">{account.username}</td>
                  <td className="px-4 py-3">
                    {labels.role[account.role as keyof typeof labels.role]}
                    {account.expert ? ` · ${account.expert.name}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions>
                      <EditLink href={`/users?edit=${account.id}`} />
                      <DeleteButton
                        action={deleteStaffUser}
                        id={account.id}
                        confirmMessage={`حذف المستخدم «${account.name}»؟`}
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
