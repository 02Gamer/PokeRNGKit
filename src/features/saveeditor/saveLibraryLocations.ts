// SPDX-License-Identifier: GPL-3.0-or-later
import consolePaths from "./save-library-console-paths.json";
import type { SaveFolderLocalFile } from "./saveFolderProtocol";
export interface SaveLibraryLocations {
  backup: string;
  extra: string[];
}
export function saveLibraryLocations(json: string): SaveLibraryLocations {
  if (!json) return { backup: "bak", extra: [] };
  const root = JSON.parse(json),
    backup = root.localResources?.backupPath;
  const extra: unknown = root.backup?.otherBackupPaths;
  if (
    typeof backup !== "string" ||
    backup.length > 32767 ||
    !Array.isArray(extra) ||
    extra.length > 8192 ||
    !extra.every((path) => typeof path === "string" && path.length <= 32767)
  )
    throw new Error("Invalid save library locations.");
  return {
    backup: libraryFolderName(backup),
    extra: extra.filter((path) => path.trim()).map(libraryFolderName),
  };
}
export function libraryFolderName(path: string) {
  return path.trim().replaceAll("\\", "/").replace(/\/+$/, "") || "local";
}
export function libraryFolderWithin(folder: string, root: string) {
  const a = libraryFolderName(folder),
    b = libraryFolderName(root);
  return a === b || a.startsWith(b + "/");
}
export function consoleLibraryRoots(folder: string): string[] {
  const normalized = libraryFolderName(folder),
    result: string[] = [];
  for (const path of consolePaths) {
    if (normalized === path || normalized.startsWith(path + "/"))
      result.push(path);
    const marker = "/" + path;
    let at = 0;
    while ((at = normalized.indexOf(marker, at)) >= 0) {
      if (
        at + marker.length === normalized.length ||
        normalized[at + marker.length] === "/"
      )
        result.push(normalized.slice(0, at + marker.length));
      at++;
    }
  }
  return result;
}
export function startupLibrarySource(
  file: SaveFolderLocalFile,
  locations: SaveLibraryLocations,
) {
  return (
    file.recent ||
    file.remembered ||
    locations.extra.some((root) => libraryFolderWithin(file.folder, root)) ||
    consoleLibraryRoots(file.folder).length > 0
  );
}
export function saveLibraryShortcuts(
  files: readonly SaveFolderLocalFile[],
  locations: SaveLibraryLocations,
) {
  const paths = [
    locations.backup,
    ...locations.extra,
    ...files.flatMap((file) => consoleLibraryRoots(file.folder)),
  ];
  return [...new Set(paths.map(libraryFolderName))].map((path) => ({
    path,
    backup: path === libraryFolderName(locations.backup),
    available: files.some((file) => libraryFolderWithin(file.folder, path)),
  }));
}
export const saveLocationWords = {
  zh: {
    title: "配置目录",
    scope: "目录范围",
    all: "当前列表的全部目录",
    note: "快捷入口筛选已导入的本机分类，包含子目录，不会打开或扫描电脑文件夹。",
  },
  en: {
    title: "Configured folders",
    scope: "Folder scope",
    all: "All folders in this list",
    note: "Shortcuts filter imported local folders, including subfolders. They do not open or scan computer directories.",
  },
  ja: {
    title: "設定したフォルダー",
    scope: "フォルダー範囲",
    all: "この一覧の全フォルダー",
    note: "ショートカットは読み込み済みのローカル分類とサブフォルダーを絞り込みます。PC のフォルダーは開いたり検索したりしません。",
  },
};
