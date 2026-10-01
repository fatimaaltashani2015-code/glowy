"use client";

import { useRouter } from "next/navigation";

export function DateFilter({
  date,
  path,
}: {
  date: string;
  path: "/settlement" | "/day-close";
}) {
  const router = useRouter();
  return (
    <input
      type="date"
      defaultValue={date}
      className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
      onChange={(event) => {
        router.push(`${path}?date=${event.target.value}`);
      }}
    />
  );
}
