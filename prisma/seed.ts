import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const makeup = await prisma.service.create({
    data: { name: "مكياج", durationMinutes: 60 },
  });
  const hair = await prisma.service.create({
    data: { name: "شعر", durationMinutes: 90 },
  });

  const room1 = await prisma.room.create({
    data: { name: "غرفة 1" },
  });
  const room2 = await prisma.room.create({
    data: { name: "غرفة 2" },
  });

  const admin = await prisma.user.create({
    data: {
      name: "المديرة",
      username: "admin",
      passwordHash,
      role: "MANAGER",
    },
  });
  await prisma.user.create({
    data: {
      name: "موظفة الاستقبال",
      username: "reception",
      passwordHash,
      role: "RECEPTION",
    },
  });

  const saraUser = await prisma.user.create({
    data: {
      name: "سارة",
      username: "sara",
      passwordHash,
      role: "EXPERT",
    },
  });
  const noorUser = await prisma.user.create({
    data: {
      name: "نور",
      username: "noor",
      passwordHash,
      role: "EXPERT",
    },
  });
  const reemUser = await prisma.user.create({
    data: {
      name: "ريم",
      username: "reem",
      passwordHash,
      role: "EXPERT",
    },
  });

  await prisma.expert.create({
    data: {
      name: "سارة",
      price: 150,
      commissionPercent: 40,
      roomId: room1.id,
      serviceId: makeup.id,
      userId: saraUser.id,
    },
  });
  await prisma.expert.create({
    data: {
      name: "نور",
      price: 180,
      commissionPercent: 45,
      roomId: room1.id,
      serviceId: makeup.id,
      userId: noorUser.id,
    },
  });
  await prisma.expert.create({
    data: {
      name: "ريم",
      price: 120,
      commissionPercent: 35,
      roomId: room2.id,
      serviceId: hair.id,
      userId: reemUser.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED",
      entity: "System",
      entityId: "init",
      details: JSON.stringify({ message: "تهيئة البيانات التجريبية" }),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
