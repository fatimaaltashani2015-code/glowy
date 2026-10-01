import Link from "next/link";
import { createStaffUser, updateStaffUser } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Button, Field, Input, Select } from "@/components/ui";

export function StaffUserForm({
  account,
}: {
  account?: {
    id: string;
    name: string;
    username: string;
    role: string;
    expert: { id: string } | null;
  };
}) {
  const editing = Boolean(account);
  const isExpert = Boolean(account?.expert);

  return (
    <ActionForm
      key={account?.id ?? "create"}
      action={editing ? updateStaffUser : createStaffUser}
      successHref={editing ? "/users" : undefined}
      className="space-y-3"
    >
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <Field label="الاسم">
        <Input name="name" required defaultValue={account?.name ?? ""} />
      </Field>
      <Field label="اسم الدخول">
        <Input name="username" required defaultValue={account?.username ?? ""} />
      </Field>
      <Field label={editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}>
        <Input name="password" type="password" required={!editing} />
      </Field>
      {isExpert ? (
        <p className="text-xs text-muted">
          حساب خبيرة. الدور يُدار من صفحة الخبيرات.
        </p>
      ) : (
        <Field label="الدور">
          <Select name="role" defaultValue={account?.role ?? "RECEPTION"}>
            <option value="RECEPTION">استقبال</option>
            <option value="MANAGER">مدير</option>
          </Select>
        </Field>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">
          {editing ? "حفظ التعديلات" : "إنشاء الحساب"}
        </Button>
        {editing ? (
          <Link href="/users" className="text-sm font-medium text-muted hover:text-ink">
            إلغاء
          </Link>
        ) : null}
      </div>
    </ActionForm>
  );
}
