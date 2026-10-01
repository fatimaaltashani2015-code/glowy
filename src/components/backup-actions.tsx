"use client";

import { createBackup, restoreBackup, uploadBackup } from "@/actions/backup";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui";

export function CreateBackupForm() {
  return (
    <ActionForm action={createBackup}>
      <Button type="submit">إنشاء نسخة الآن</Button>
    </ActionForm>
  );
}

export function UploadBackupForm() {
  return (
    <ActionForm action={uploadBackup} className="space-y-3">
      <input
        name="file"
        type="file"
        accept=".db"
        required
        className="block w-full text-sm text-muted file:me-3 file:rounded-xl file:border-0 file:bg-rose file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
      />
      <Button type="submit" variant="secondary">
        حفظ الملف ضمن النسخ
      </Button>
    </ActionForm>
  );
}

export function RestoreBackupForm({ file }: { file: string }) {
  return (
    <ActionForm action={restoreBackup}>
      <input type="hidden" name="file" value={file} />
      <Button
        type="submit"
        variant="danger"
        className="px-3 py-1.5"
        onClick={(event) => {
          const ok = window.confirm(
            "سيتم استبدال كل بيانات النظام الحالية بهذه النسخة. هل أنت متأكدة؟",
          );
          if (!ok) event.preventDefault();
        }}
      >
        استعادة
      </Button>
    </ActionForm>
  );
}
