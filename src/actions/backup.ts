"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  createBackupFile,
  deleteBackupFile,
  restoreBackupFile,
  saveUploadedBackup,
} from "@/lib/backup";
import { ROLES } from "@/lib/constants";

export async function createBackup(_formData?: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  try {
    const backup = await createBackupFile();
    await writeAudit({
      userId: user.id,
      action: "CREATE_BACKUP",
      entity: "Backup",
      entityId: backup.name,
      details: { size: backup.size },
    });
    revalidatePath("/backup");
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "تعذر إنشاء النسخة الاحتياطية",
    };
  }
}

export async function restoreBackup(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const file = String(formData.get("file") ?? "");
  try {
    await restoreBackupFile(file);
    await writeAudit({
      userId: user.id,
      action: "RESTORE_BACKUP",
      entity: "Backup",
      entityId: file,
    });
    revalidatePath("/backup");
    revalidatePath("/");
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "تعذر استعادة النسخة الاحتياطية",
    };
  }
}

export async function uploadBackup(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const uploaded = formData.get("file");
  if (!(uploaded instanceof File) || uploaded.size === 0) {
    return { error: "اختاري ملف النسخة أولاً" };
  }
  try {
    const buffer = Buffer.from(await uploaded.arrayBuffer());
    const name = await saveUploadedBackup(buffer, uploaded.name);
    await writeAudit({
      userId: user.id,
      action: "UPLOAD_BACKUP",
      entity: "Backup",
      entityId: name,
      details: { originalName: uploaded.name, size: uploaded.size },
    });
    revalidatePath("/backup");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "تعذر رفع الملف",
    };
  }
}

export async function deleteBackup(formData: FormData) {
  const user = await requireSession([ROLES.MANAGER]);
  const file = String(formData.get("id") ?? "");
  try {
    await deleteBackupFile(file);
    await writeAudit({
      userId: user.id,
      action: "DELETE_BACKUP",
      entity: "Backup",
      entityId: file,
    });
    revalidatePath("/backup");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "تعذر حذف النسخة",
    };
  }
}
