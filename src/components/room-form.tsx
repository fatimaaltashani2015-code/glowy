import Link from "next/link";
import { createRoom, updateRoom } from "@/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Button, Field, Input } from "@/components/ui";

export function RoomForm({
  room,
}: {
  room?: { id: string; name: string };
}) {
  const editing = Boolean(room);
  return (
    <ActionForm
      key={room?.id ?? "create"}
      action={editing ? updateRoom : createRoom}
      successHref={editing ? "/rooms" : undefined}
      className="space-y-3"
    >
      {room ? <input type="hidden" name="id" value={room.id} /> : null}
      <Field label="اسم الغرفة">
        <Input
          name="name"
          required
          placeholder="غرفة المكياج 1"
          defaultValue={room?.name ?? ""}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{editing ? "حفظ التعديلات" : "إضافة"}</Button>
        {editing ? (
          <Link href="/rooms" className="text-sm font-medium text-muted hover:text-ink">
            إلغاء
          </Link>
        ) : null}
      </div>
    </ActionForm>
  );
}
