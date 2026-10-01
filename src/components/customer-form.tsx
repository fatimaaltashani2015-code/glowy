import Link from "next/link";
import { updateCustomer } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Button, Field, Input } from "@/components/ui";

export function CustomerForm({
  customer,
}: {
  customer: { id: string; name: string; phone: string };
}) {
  return (
    <ActionForm
      key={customer.id}
      action={updateCustomer}
      successHref="/customers"
      className="space-y-3"
    >
      <input type="hidden" name="id" value={customer.id} />
      <Field label="الاسم">
        <Input name="name" required defaultValue={customer.name} />
      </Field>
      <Field label="رقم الهاتف">
        <Input name="phone" required defaultValue={customer.phone} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">حفظ التعديلات</Button>
        <Link
          href="/customers"
          className="text-sm font-medium text-muted hover:text-ink"
        >
          إلغاء
        </Link>
      </div>
    </ActionForm>
  );
}
