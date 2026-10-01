import { deleteBackup } from "@/actions/backup";
import {
  CreateBackupForm,
  RestoreBackupForm,
  UploadBackupForm,
} from "@/components/backup-actions";
import { DeleteButton } from "@/components/delete-button";
import { Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { listBackups, liveDatabaseInfo } from "@/lib/backup";
import { ROLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";

export default async function BackupPage() {
  await requireSession([ROLES.MANAGER]);
  const [live, backups] = await Promise.all([
    liveDatabaseInfo(),
    listBackups(),
  ]);

  return (
    <div>
      <PageHeader
        title="النسخ الاحتياطي"
        subtitle="احفظي نسخة من كل الحجوزات والمدفوعات والحسابات، أو استعيدي النظام من نسخة سابقة."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-medium">إنشاء نسخة</h2>
          <p className="mb-4 text-sm text-muted">
            حجم قاعدة البيانات الحالية: {live.exists ? live.sizeLabel : "غير موجودة"}
          </p>
          <CreateBackupForm />
        </Card>

        <Card>
          <h2 className="mb-2 font-medium">رفع نسخة من الجهاز</h2>
          <p className="mb-4 text-sm text-muted">
            ارفعي ملف ‎.db محفوظ سابقاً ليظهر في قائمة النسخ، ثم استعيديه عند الحاجة.
          </p>
          <UploadBackupForm />
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <div className="px-4 py-4">
          <h2 className="font-medium">النسخ المحفوظة</h2>
          <p className="mt-1 text-sm text-muted">
            الاستعادة تستبدل البيانات الحالية بالكامل. يُفضَّل حفظ نسخة قبل الاستعادة.
          </p>
        </div>
        {backups.length === 0 ? (
          <p className="px-4 pb-5 text-sm text-muted">لا توجد نسخ بعد. أنشئي النسخة الأولى.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream text-muted">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium">الملف</th>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">الحجم</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.name} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{backup.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDateTime(backup.createdAt)}
                  </td>
                  <td className="px-4 py-3">{backup.sizeLabel}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={`/api/backup/download?file=${encodeURIComponent(backup.name)}`}
                        className="font-medium text-rose hover:text-rose-dark"
                      >
                        تحميل
                      </a>
                      <RestoreBackupForm file={backup.name} />
                      <DeleteButton
                        action={deleteBackup}
                        id={backup.name}
                        confirmMessage={`حذف النسخة «${backup.name}» من الجهاز؟`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
