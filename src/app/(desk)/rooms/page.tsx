import { deleteRoom } from "@/actions/admin";
import { DeleteButton } from "@/components/delete-button";
import { RoomForm } from "@/components/room-form";
import { Card, EditLink, PageHeader, RowActions } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireSession([ROLES.MANAGER]);
  const { edit } = await searchParams;
  const rooms = await prisma.room.findMany({
    include: { experts: true },
    orderBy: { name: "asc" },
  });
  const editing = edit ? rooms.find((room) => room.id === edit) : undefined;

  return (
    <div>
      <PageHeader
        title="الغرف"
        subtitle="الغرفة كيان مستقل عن الخبيرة، ويمكن أن تضم أكثر من خبيرة في نفس الوقت."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <h2 className="mb-4 font-medium">
            {editing ? `تعديل: ${editing.name}` : "غرفة جديدة"}
          </h2>
          <RoomForm room={editing} />
        </Card>
        <div className="grid gap-3">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className={editing?.id === room.id ? "ring-1 ring-rose/30" : ""}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{room.name}</h3>
                  <p className="mt-2 text-sm text-muted">
                    {room.experts.length === 0
                      ? "لا توجد خبيرات بعد"
                      : room.experts.map((e) => e.name).join(" · ")}
                  </p>
                </div>
                <RowActions>
                  <EditLink href={`/rooms?edit=${room.id}`} />
                  <DeleteButton
                    action={deleteRoom}
                    id={room.id}
                    confirmMessage={`حذف الغرفة «${room.name}»؟`}
                  />
                </RowActions>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
