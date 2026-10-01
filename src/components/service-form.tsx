import Link from "next/link";
import { createService, updateService } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Button, Field, Input } from "@/components/ui";

export function ServiceForm({
  service,
}: {
  service?: { id: string; name: string; durationMinutes: number };
}) {
  const editing = Boolean(service);
  return (
    <ActionForm
      key={service?.id ?? "create"}
      action={editing ? updateService : createService}
      successHref={editing ? "/services" : undefined}
      className="space-y-3"
    >
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <Field label="اسم الخدمة">
        <Input
          name="name"
          required
          placeholder="مكياج"
          defaultValue={service?.name ?? ""}
        />
      </Field>
      <Field label="المدة بالدقائق">
        <Input
          name="durationMinutes"
          type="number"
          min="15"
          step="15"
          required
          defaultValue={service?.durationMinutes ?? 60}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{editing ? "حفظ التعديلات" : "إضافة"}</Button>
        {editing ? (
          <Link
            href="/services"
            className="text-sm font-medium text-muted hover:text-ink"
          >
            إلغاء
          </Link>
        ) : null}
      </div>
    </ActionForm>
  );
}
