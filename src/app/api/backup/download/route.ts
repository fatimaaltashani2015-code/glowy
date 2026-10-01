import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { readSession } from "@/lib/auth";
import { backupFilePath } from "@/lib/backup";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await readSession();
  if (!user || user.role !== ROLES.MANAGER) {
    return new Response("غير مصرح", { status: 403 });
  }

  const file = new URL(request.url).searchParams.get("file") ?? "";
  const full = backupFilePath(file);
  if (!full || !existsSync(full)) {
    return new Response("الملف غير موجود", { status: 404 });
  }

  const data = await readFile(full);
  return new Response(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
