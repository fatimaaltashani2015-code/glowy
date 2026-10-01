"use client";

import { useRouter } from "next/navigation";

export function MonthFilter({ month, path }: { month: string; path: string }) {
  const router = useRouter();
  return (
    <input
      type="month"
      defaultValue={month}
      className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
      onChange={(event) => {
        router.push(`${path}?month=${event.target.value}`);
      }}
    />
  );
}
