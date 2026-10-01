const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) return;

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn(
      "لا يوجد مستخدمون. ضعي ADMIN_PASSWORD في البيئة لإنشاء حساب المديرة تلقائياً.",
    );
    return;
  }

  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  await prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME || "المديرة",
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role: "MANAGER",
    },
  });
  console.log(`تم إنشاء حساب المديرة: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
