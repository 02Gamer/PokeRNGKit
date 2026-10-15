// SPDX-License-Identifier: GPL-3.0-or-later
import {
  validateDatabaseFiles,
  DATABASE_LIMITS,
  type DatabaseLocalFile,
} from "./databaseRepository";
import { applyDatabaseDelta, type DatabaseDelta } from "./databaseProtocol";
import type { SaveFolderLocalFile } from "./saveFolderProtocol";
import { isSaveBackupName } from "./saveLibrarySettings";

export interface DatabaseLibraryPolicy {
  backups: boolean;
  extra: boolean;
  deep: boolean;
  backupFolder: string;
  extraFolders: string[];
}
export function databaseLibraryPolicy(json: string): DatabaseLibraryPolicy {
  if (!json)
    return {
      backups: true,
      extra: true,
      deep: true,
      backupFolder: "bak",
      extraFolders: [],
    };
  const root = JSON.parse(json);
  const {
    searchBackups: backups,
    searchExtraSaves: extra,
    searchExtraSavesDeep: deep,
  } = root.entityDb ?? {};
  const backupFolder = root.localResources?.backupPath;
  const extraFolders: unknown = root.backup?.otherBackupPaths;
  if (
    typeof backups !== "boolean" ||
    typeof extra !== "boolean" ||
    typeof deep !== "boolean" ||
    typeof backupFolder !== "string" ||
    backupFolder.length > 32767 ||
    !Array.isArray(extraFolders) ||
    extraFolders.length > 8192 ||
    !extraFolders.every(
      (path) => typeof path === "string" && path.length <= 32767,
    )
  )
    throw new Error("Invalid database library policy.");
  return {
    backups,
    extra,
    deep,
    backupFolder,
    extraFolders: [...extraFolders],
  };
}
function folderName(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/\/+$/, "") || "local";
}
function within(folder: string, root: string, deep: boolean) {
  return folder === root || (deep && folder.startsWith(root + "/"));
}
// These are read-only session snapshots. They are never persisted in the PKM
// database or sent to its replacement/undo transaction as owned files.
export function databaseLibrarySources(
  source: readonly SaveFolderLocalFile[],
  owned: readonly DatabaseLocalFile[],
  policy: DatabaseLibraryPolicy,
  reserved: readonly DatabaseLocalFile[] = owned,
): DatabaseLocalFile[] {
  validateDatabaseFiles(owned);
  // Source adds extra folders first, then the backup folder. Overlapping or
  // repeated roots are separate scans, including their repeated results.
  const roots = policy.extra
    ? policy.extraFolders
        .filter((path) => path.trim())
        .map((path) => ({ path: folderName(path), ignoreBackups: true }))
    : [];
  if (policy.backups)
    roots.push({ path: folderName(policy.backupFolder), ignoreBackups: false });
  const used = new Set(reserved.map((file) => file.id));
  let sequence = 0;
  const result: DatabaseLocalFile[] = [];
  let total = owned.reduce((sum, file) => sum + file.data.byteLength, 0);
  for (const root of roots)
    for (const file of source) {
      if (
        !within(folderName(file.folder), root.path, policy.deep) ||
        (root.ignoreBackups && isSaveBackupName(file.name))
      )
        continue;
      total += file.data.byteLength;
      if (
        owned.length + result.length >= DATABASE_LIMITS.files ||
        total > DATABASE_LIMITS.bytes
      )
        throw new Error("Database exceeds the local size limit.");
      let id: string;
      do {
        id = `library:${sequence++}`;
      } while (used.has(id));
      used.add(id);
      result.push({
        id,
        name: `${file.folder}/${file.name}`,
        data: file.data.slice(0),
        entityFile: false,
        modified: file.modified,
      });
    }
  // Fail before opening or changing a session if the combined packet exceeds
  // the existing product limits. Do not truncate or delete source files.
  validateDatabaseFiles([...owned, ...result]);
  return result;
}
export function applyOwnedDatabaseDelta(
  owned: readonly DatabaseLocalFile[],
  library: readonly DatabaseLocalFile[],
  delta: DatabaseDelta,
) {
  const protectedIds = new Set(library.map((file) => file.id));
  if (
    delta.removed.some((id) => protectedIds.has(id)) ||
    delta.added.some((file) => protectedIds.has(file.id))
  )
    throw new Error("Database changes cannot replace library snapshots.");
  const next = applyDatabaseDelta(owned, delta);
  validateDatabaseFiles([...next, ...library]);
  return next;
}
export const databaseLibraryWords = {
  zh: {
    title: "存档库来源",
    note: "按设置读取本机存档库的分类和子目录，不扫描电脑目录。这些来源是只读快照；点击“读取数据库”可更新。",
  },
  en: {
    title: "Save library sources",
    note: "Reads configured folders and subfolders in the local save library, without scanning computer directories. These sources are read-only snapshots; use Read database to refresh.",
  },
  ja: {
    title: "セーブライブラリの参照元",
    note: "設定したローカルライブラリの分類とサブフォルダーを読み込みます。PC のフォルダーは検索しません。参照元は読み取り専用のコピーです。「データベースを読み込む」で更新できます。",
  },
};
