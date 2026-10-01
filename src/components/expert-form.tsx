import Link from "next/link";
import { createExpert, updateExpert } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Button, Field, Input, Select } from "@/components/ui";

type ExpertFormProps = {
  expert?: {
    id: string;
    name: string;
    price: number;
    commissionPercent: number;
    roomId: string;
    serviceId: string;
    user: { username: string } | null;
  };
  rooms: { id: string; name: string }[];
  services: { id: string; name: string }[];
};

export function ExpertForm({ expert, rooms, services }: ExpertFormProps) {
  const editing = Boolean(expert);

  return (
    <ActionForm
      key={expert?.id ?? "create"}
      action={editing ? updateExpert : createExpert}
      successHref={editing ? "/experts" : undefined}
      className="space-y-3"
    >
      {expert ? <input type="hidden" name="id" value={expert.id} /> : null}
      <Field label="الاسم">
        <Input name="name" required defaultValue={expert?.name ?? ""} />
      </Field>
      <Field label="الغرفة">
        <Select name="roomId" required defaultValue={expert?.roomId ?? rooms[0]?.id}>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="التخصص">
        <Select
          name="serviceId"
          required
          defaultValue={expert?.serviceId ?? services[0]?.id}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="سعر الخدمة (د.ل)">
        <Input
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={expert ? String(expert.price) : ""}
        />
      </Field>
      <Field label="نسبة الخبيرة %">
        <Input
          name="commissionPercent"
          type="number"
          min="0"
          max="100"
          step="0.5"
          required
          defaultValue={expert ? String(expert.commissionPercent) : ""}
        />
      </Field>
      <Field label={expert?.user ? "اسم الدخول" : "اسم الدخول (اختياري)"}>
        <Input
          name="username"
          placeholder="sara"
          required={Boolean(expert?.user)}
          defaultValue={expert?.user?.username ?? ""}
        />
      </Field>
      <Field
        label={
          expert?.user
            ? "كلمة مرور جديدة (اختياري)"
            : "كلمة المرور لحسابها"
        }
      >
        <Input name="password" type="password" />
      </Field>
      {editing ? (
        <p className="text-xs text-muted">
          تعديل السعر والنسبة يسري على الحجوزات الجديدة فقط.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{editing ? "حفظ التعديلات" : "حفظ الخبيرة"}</Button>
        {editing ? (
          <Link href="/experts" className="text-sm font-medium text-muted hover:text-ink">
            إلغاء
          </Link>
        ) : null}
      </div>
    </ActionForm>
  );
}
