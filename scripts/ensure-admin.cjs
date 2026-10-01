const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const name = process.env.ADMIN_NAME || "المديرة";

  if (!password) {
    const existing = await prisma.user.count();
    if (existing === 0) {
      console.warn(
        "[glowy] no users yet. Set ADMIN_PASSWORD to create the manager account.",
      );
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        name,
        role: "MANAGER",
      },
    });
    console.log(`[glowy] updated manager password for: ${username}`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      username,
      passwordHash,
      role: "MANAGER",
    },
  });
  console.log(`[glowy] created manager account: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
