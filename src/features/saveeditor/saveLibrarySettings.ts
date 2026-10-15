// SPDX-License-Identifier: GPL-3.0-or-later
import type { SaveFolderLocalFile } from "./saveFolderProtocol";
import {
  saveLibraryLocations,
  startupLibrarySource,
  type SaveLibraryLocations,
} from "./saveLibraryLocations";

export interface SaveLibrarySettings {
  backup: boolean;
  folder: string;
  recentMax: number;
  startup: 0 | 1 | 2;
}
export function saveLibrarySettings(json: string): SaveLibrarySettings {
  if (!json) return { backup: true, folder: "bak", recentMax: 10, startup: 1 };
  const root = JSON.parse(json);
  const backup = root.backup?.bakEnabled;
  const folder = root.localResources?.backupPath;
  const recentMax = root.startup?.recentlyLoadedMaxCount;
  const startup = root.startup?.autoLoadSaveOnStartup;
  if (
    typeof backup !== "boolean" ||
    typeof folder !== "string" ||
    folder.length > 4096 ||
    !Number.isInteger(recentMax) ||
    recentMax < 1 ||
    recentMax > 1000 ||
    ![0, 1, 2].includes(startup)
  )
    throw new Error("Invalid save library settings.");
  return { backup, folder: folder.trim() || "local", recentMax, startup };
}
// File order is the load history. Trimming the MRU flags never deletes bytes,
// including selected source files and backups kept outside the recent list.
export function limitRecentSaves(
  files: readonly SaveFolderLocalFile[],
  max: number,
) {
  if (!Number.isInteger(max) || max < 1 || max > 1000)
    throw new Error("Invalid recent save limit.");
  let count = 0;
  return files.map((file) => ({
    ...file,
    recent: file.recent && ++count <= max,
  }));
}
export function startupSaveCandidates(
  files: readonly SaveFolderLocalFile[],
  mode: 0 | 1 | 2,
  locations: SaveLibraryLocations = saveLibraryLocations(""),
) {
  if (mode === 0) return [];
  if (mode === 2) return files.filter((file) => file.recent && file.remembered);
  // Source SaveUtil.IsBackupFilePath excludes .bak and a base name of backup.
  // DetectSaveFiles sorts by write time, rather
  // than the order in which a file was opened. Search only explicitly stored files.
  return files
    .filter(
      (file) =>
        !isSaveBackupName(file.name) && startupLibrarySource(file, locations),
    )
    .sort((a, b) => b.modified - a.modified);
}
export function isSaveBackupName(name: string) {
  const leaf = name.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const dot = leaf.lastIndexOf(".");
  const base = dot < 0 ? leaf : leaf.slice(0, dot);
  return base === "backup" || leaf.endsWith(".bak");
}
export const saveLibraryWords = {
  zh: {
    failed:
      "存档已打开，但未能保存本机备份或最近记录。已有备份保持不变，请保留原文件。",
    restored: "已从本机存档库恢复原始文件。尚未导出的编辑不会自动恢复。",
    restoreFailed: "未能恢复本机存档，请手动打开文件。",
    scope:
      "备份保存在此浏览器的本机存档库。备份路径作为库内分类名称，不会访问电脑目录；清除网站数据会删除这些副本。",
  },
  en: {
    failed:
      "The save is open, but its local backup or recent entry could not be stored. Existing backups are unchanged. Keep the original file.",
    restored:
      "Restored the original file from the local save library. Unexported edits are not restored automatically.",
    restoreFailed:
      "The local save could not be restored. Open a file manually.",
    scope:
      "Backups stay in this browser's local save library. The backup path names a library folder and does not access a computer directory. Clearing site data deletes these copies.",
  },
  ja: {
    failed:
      "セーブは開きましたが、ローカルバックアップまたは履歴を保存できませんでした。既存のバックアップは変更されていません。元のファイルを保持してください。",
    restored:
      "ローカルライブラリから元のファイルを復元しました。未出力の編集内容は自動復元されません。",
    restoreFailed:
      "ローカルセーブを復元できませんでした。ファイルを手動で開いてください。",
    scope:
      "バックアップはこのブラウザのローカルライブラリに保存します。パスはライブラリ内の分類名で、PC のフォルダーにはアクセスしません。サイトデータを消去するとコピーも削除されます。",
  },
};
