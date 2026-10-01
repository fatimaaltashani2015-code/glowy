import { BLACKLIST_SCOPE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export type BlacklistLookup = {
  hits: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    matchedBy: "phone" | "name" | "both";
    center: boolean;
    centerReason: string | null;
    experts: { id: string; name: string; reason: string | null }[];
  }[];
  blockedCenter: boolean;
  blockedExperts: { id: string; name: string }[];
};

export type BlacklistVerdict = {
  blocked: boolean;
  tone: "danger" | "warn";
  title: string;
  detail: string;
};

export type BlacklistRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  scope: string;
  expertId: string | null;
  expertName: string | null;
  reason: string | null;
  createdByName: string;
  createdAt: Date | string;
};

type EntryJoin = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  scope: string;
  expertId: string | null;
  expertName: string | null;
  reason: string | null;
};

async function loadEntries(): Promise<EntryJoin[]> {
  try {
    return await prisma.$queryRaw<EntryJoin[]>`
      SELECT
        e.id as id,
        e.customerId as customerId,
        c.name as customerName,
        c.phone as customerPhone,
        e.scope as scope,
        e.expertId as expertId,
        x.name as expertName,
        e.reason as reason
      FROM BlacklistEntry e
      INNER JOIN Customer c ON c.id = e.customerId
      LEFT JOIN Expert x ON x.id = e.expertId
    `;
  } catch {
    return [];
  }
}

export async function listedCustomerIds() {
  try {
    const rows = await prisma.$queryRaw<{ customerId: string }[]>`
      SELECT DISTINCT customerId FROM BlacklistEntry
    `;
    return rows.map((row) => row.customerId);
  } catch {
    return [];
  }
}

export async function listBlacklistRows(): Promise<BlacklistRow[]> {
  try {
    return await prisma.$queryRaw<BlacklistRow[]>`
      SELECT
        e.id as id,
        e.customerId as customerId,
        c.name as customerName,
        c.phone as customerPhone,
        e.scope as scope,
        e.expertId as expertId,
        x.name as expertName,
        e.reason as reason,
        u.name as createdByName,
        e.createdAt as createdAt
      FROM BlacklistEntry e
      INNER JOIN Customer c ON c.id = e.customerId
      LEFT JOIN Expert x ON x.id = e.expertId
      INNER JOIN User u ON u.id = e.createdById
      ORDER BY e.createdAt DESC
    `;
  } catch {
    return [];
  }
}

export async function findBlacklistRow(id: string) {
  const rows = await prisma.$queryRaw<BlacklistRow[]>`
    SELECT
      e.id as id,
      e.customerId as customerId,
      c.name as customerName,
      c.phone as customerPhone,
      e.scope as scope,
      e.expertId as expertId,
      x.name as expertName,
      e.reason as reason,
      u.name as createdByName,
      e.createdAt as createdAt
    FROM BlacklistEntry e
    INNER JOIN Customer c ON c.id = e.customerId
    LEFT JOIN Expert x ON x.id = e.expertId
    INNER JOIN User u ON u.id = e.createdById
    WHERE e.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function hasBlacklistEntry(input: {
  customerId: string;
  scope: string;
  expertId?: string | null;
}) {
  const rows =
    input.scope === BLACKLIST_SCOPE.CENTER
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM BlacklistEntry
          WHERE customerId = ${input.customerId} AND scope = ${BLACKLIST_SCOPE.CENTER}
          LIMIT 1
        `
      : await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM BlacklistEntry
          WHERE customerId = ${input.customerId}
            AND scope = ${BLACKLIST_SCOPE.EXPERT}
            AND expertId = ${input.expertId}
          LIMIT 1
        `;
  return rows.length > 0;
}

export async function insertBlacklistEntry(input: {
  customerId: string;
  scope: string;
  expertId: string | null;
  reason: string | null;
  createdById: string;
}) {
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO BlacklistEntry (id, customerId, scope, expertId, reason, createdById, createdAt)
    VALUES (
      ${id},
      ${input.customerId},
      ${input.scope},
      ${input.expertId},
      ${input.reason},
      ${input.createdById},
      ${new Date().toISOString()}
    )
  `;
  return id;
}

export async function removeBlacklistEntry(id: string) {
  await prisma.$executeRaw`DELETE FROM BlacklistEntry WHERE id = ${id}`;
}

export async function lookupBlacklist(
  name: string,
  phone: string,
): Promise<BlacklistLookup> {
  const nameQ = normalizeName(name);
  const phoneQ = normalizePhone(phone);
  const empty: BlacklistLookup = {
    hits: [],
    blockedCenter: false,
    blockedExperts: [],
  };
  if (nameQ.length < 2 && phoneQ.length < 8) return empty;

  const entries = await loadEntries();
  const byCustomer = new Map<string, EntryJoin[]>();
  for (const entry of entries) {
    const list = byCustomer.get(entry.customerId) ?? [];
    list.push(entry);
    byCustomer.set(entry.customerId, list);
  }

  const hits: BlacklistLookup["hits"] = [];
  for (const [customerId, customerEntries] of byCustomer) {
    const first = customerEntries[0];
    const phoneMatch =
      phoneQ.length >= 8 &&
      (normalizePhone(first.customerPhone) === phoneQ ||
        normalizePhone(first.customerPhone).includes(phoneQ) ||
        phoneQ.includes(normalizePhone(first.customerPhone)));
    const nameMatch =
      nameQ.length >= 2 &&
      (first.customerName === nameQ ||
        first.customerName.includes(nameQ) ||
        nameQ.includes(first.customerName));
    if (!phoneMatch && !nameMatch) continue;

    const centerEntry = customerEntries.find(
      (entry) => entry.scope === BLACKLIST_SCOPE.CENTER,
    );
    const expertEntries = customerEntries.filter(
      (entry) => entry.scope === BLACKLIST_SCOPE.EXPERT && entry.expertId,
    );

    hits.push({
      customerId,
      customerName: first.customerName,
      customerPhone: first.customerPhone,
      matchedBy: phoneMatch && nameMatch ? "both" : phoneMatch ? "phone" : "name",
      center: Boolean(centerEntry),
      centerReason: centerEntry?.reason ?? null,
      experts: expertEntries.map((entry) => ({
        id: entry.expertId as string,
        name: entry.expertName ?? "",
        reason: entry.reason,
      })),
    });
  }

  const blockedExpertsMap = new Map<string, string>();
  for (const hit of hits) {
    for (const expert of hit.experts) {
      blockedExpertsMap.set(expert.id, expert.name);
    }
  }

  return {
    hits,
    blockedCenter: hits.some((hit) => hit.center),
    blockedExperts: [...blockedExpertsMap].map(([id, name]) => ({ id, name })),
  };
}

export function blacklistVerdict(
  lookup: BlacklistLookup,
  expertId: string,
): BlacklistVerdict | null {
  if (!lookup.hits.length) return null;

  const names = lookup.hits
    .map((hit) => `${hit.customerName} (${hit.customerPhone})`)
    .join(" · ");

  if (lookup.blockedCenter) {
    const reason = lookup.hits.find((hit) => hit.centerReason)?.centerReason;
    return {
      blocked: true,
      tone: "danger",
      title: "هذه العميلة في القائمة السوداء للمركز بالكامل",
      detail: `${names}. لا يُسمح بحجز أي موعد لها في المركز.${reason ? ` السبب: ${reason}` : ""}`,
    };
  }

  const against = lookup.blockedExperts.find((expert) => expert.id === expertId);
  if (against) {
    const reason = lookup.hits
      .flatMap((hit) => hit.experts)
      .find((expert) => expert.id === expertId)?.reason;
    return {
      blocked: true,
      tone: "danger",
      title: `هذه العميلة في القائمة السوداء للخبيرة ${against.name}`,
      detail: `${names}. لا يمكن حجز موعد مع هذه الخبيرة. يمكن الحجز مع خبيرة أخرى غير مذكورة في القائمة.${reason ? ` السبب: ${reason}` : ""}`,
    };
  }

  if (lookup.blockedExperts.length) {
    const expertNames = lookup.blockedExperts.map((expert) => expert.name).join("، ");
    return {
      blocked: false,
      tone: "warn",
      title: "تنبيه: العميلة مرفوضة من خبيرة أو أكثر",
      detail: `${names}. تجنّبي حجزها مع: ${expertNames}. يمكن الحجز مع خبيرة أخرى.`,
    };
  }

  return null;
}

export async function assertCanBookCustomer(
  name: string,
  phone: string,
  expertId: string,
) {
  const lookup = await lookupBlacklist(name, phone);
  const verdict = blacklistVerdict(lookup, expertId);
  if (verdict?.blocked) {
    throw new Error(verdict.detail);
  }
}
