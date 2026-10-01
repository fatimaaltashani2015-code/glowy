"use client";

import type { BlacklistLookup, BlacklistVerdict } from "@/lib/blacklist";

export function BlacklistAlert({ verdict }: { verdict: BlacklistVerdict }) {
  const styles =
    verdict.tone === "danger"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-warn/30 bg-warn/10 text-ink";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <p className="font-medium">{verdict.title}</p>
      <p className="mt-1 leading-6 opacity-90">{verdict.detail}</p>
    </div>
  );
}

export function BlacklistMatches({ lookup }: { lookup: BlacklistLookup }) {
  if (!lookup.hits.length) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs opacity-80">
      {lookup.hits.map((hit) => (
        <li key={hit.customerId}>
          تطابق بال
          {hit.matchedBy === "both"
            ? "الاسم والهاتف"
            : hit.matchedBy === "phone"
              ? "رقم الهاتف"
              : "الاسم"}
        </li>
      ))}
    </ul>
  );
}
