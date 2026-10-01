import { prisma } from "@/lib/prisma";

export async function writeAudit(input: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      details: JSON.stringify(input.details ?? {}),
    },
  });
}
