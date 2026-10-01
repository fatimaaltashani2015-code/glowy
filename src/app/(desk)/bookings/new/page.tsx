import { BookingForm } from "@/components/booking-form";
import { PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function NewBookingPage() {
  await requireSession([ROLES.MANAGER, ROLES.RECEPTION]);
  const [experts, services] = await Promise.all([
    prisma.expert.findMany({
      where: { active: true },
      include: { room: true, service: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="حجز جديد"
        subtitle="إذا طلبت العميلة خبيرة معيّنة اختاريها مباشرة. وإلا اختاري الخدمة ليظهر من هنّ متاحات."
      />
      <BookingForm
        experts={experts.map((expert) => ({
          id: expert.id,
          name: expert.name,
          price: expert.price,
          commissionPercent: expert.commissionPercent,
          roomName: expert.room.name,
          serviceId: expert.serviceId,
          serviceName: expert.service.name,
        }))}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
        }))}
      />
    </div>
  );
}
