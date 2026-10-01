import { existsSync } from "node:fs";
import { mkdir, readdir, stat, copyFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const SQLITE_HEADER = "SQLite format 3";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function databaseFilePath() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const file = url.replace(/^file:/, "");
  if (path.isAbsolute(file)) return file;
  return path.resolve(process.cwd(), "prisma", file);
}

export function backupDir() {
  return path.join(process.cwd(), "data", "backups");
}

export function isSafeBackupName(name: string) {
  return /^glowy-[A-Za-z0-9._-]+\.db$/.test(name);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} م.ب`;
}

function stamp(date = new Date()) {
  return date
    .toLocaleString("sv-SE", { timeZone: TIMEZONE })
    .replace(" ", "-")
    .replaceAll(":", "-");
}

export function newBackupName(suffix = "") {
  const extra = suffix ? `-${suffix}` : "";
  return `glowy-${stamp()}${extra}.db`;
}

export type BackupFile = {
  name: string;
  size: number;
  sizeLabel: string;
  createdAt: Date;
};

export async function ensureBackupDir() {
  await mkdir(backupDir(), { recursive: true });
}

export async function listBackups(): Promise<BackupFile[]> {
  await ensureBackupDir();
  const dir = backupDir();
  const names = await readdir(dir);
  const rows: BackupFile[] = [];
  for (const name of names) {
    if (!isSafeBackupName(name)) continue;
    const info = await stat(path.join(dir, name));
    if (!info.isFile()) continue;
    rows.push({
      name,
      size: info.size,
      sizeLabel: formatBytes(info.size),
      createdAt: info.mtime,
    });
  }
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function liveDatabaseInfo() {
  const file = databaseFilePath();
  if (!existsSync(file)) {
    return { path: file, size: 0, sizeLabel: formatBytes(0), exists: false };
  }
  const info = await stat(file);
  return {
    path: file,
    size: info.size,
    sizeLabel: formatBytes(info.size),
    exists: true,
  };
}

function sqlitePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "''");
}

export async function createBackupFile(suffix = "") {
  await ensureBackupDir();
  const name = newBackupName(suffix);
  const dest = path.join(backupDir(), name);
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlitePath(dest)}'`);
  } catch {
    await copyFile(databaseFilePath(), dest);
  }
  const info = await stat(dest);
  return { name, size: info.size };
}

async function removeSidecars(dbPath: string) {
  for (const extra of ["-wal", "-shm", "-journal"]) {
    const sidecar = `${dbPath}${extra}`;
    if (existsSync(sidecar)) {
      await unlink(sidecar);
    }
  }
}

export async function restoreBackupFile(name: string) {
  if (!isSafeBackupName(name)) {
    throw new Error("اسم الملف غير صالح");
  }
  const src = path.join(backupDir(), name);
  if (!existsSync(src)) {
    throw new Error("النسخة غير موجودة");
  }
  await createBackupFile("before-restore");
  const live = databaseFilePath();
  await prisma.$disconnect();
  await copyFile(src, live);
  await removeSidecars(live);
  await prisma.$connect();
}

export async function saveUploadedBackup(buffer: Buffer, originalName: string) {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("الملف أكبر من 50 ميجا");
  }
  if (!buffer.subarray(0, 16).toString("utf8").startsWith(SQLITE_HEADER)) {
    throw new Error("الملف ليس قاعدة SQLite صالحة");
  }
  if (!originalName.toLowerCase().endsWith(".db")) {
    throw new Error("يُقبل ملف ‎.db فقط");
  }
  await ensureBackupDir();
  const name = newBackupName("upload");
  await writeFile(path.join(backupDir(), name), buffer);
  return name;
}

export function backupFilePath(name: string) {
  if (!isSafeBackupName(name)) return null;
  const full = path.join(backupDir(), name);
  if (!full.startsWith(backupDir())) return null;
  return full;
}

export async function deleteBackupFile(name: string) {
  const full = backupFilePath(name);
  if (!full) {
    throw new Error("اسم الملف غير صالح");
  }
  if (!existsSync(full)) {
    throw new Error("النسخة غير موجودة");
  }
  await unlink(full);
}
