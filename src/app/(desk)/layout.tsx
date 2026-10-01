import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";

export default async function DeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  return <AppShell user={user}>{children}</AppShell>;
}
