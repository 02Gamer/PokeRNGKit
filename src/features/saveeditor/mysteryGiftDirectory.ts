// SPDX-License-Identifier: GPL-3.0-or-later
import { libraryFolderName, libraryFolderWithin } from "./saveLibraryLocations";
import type { MysteryGiftLocalFile } from "./mysteryGiftLibrary";
export const LEGACY_GIFT_DIRECTORY = "mgdb";
export function mysteryGiftDirectory(json: string) {
  if (!json) return LEGACY_GIFT_DIRECTORY;
  const root = JSON.parse(json),
    path = root.localResources?.mgDatabasePath;
  if (typeof path !== "string" || path.length > 32767)
    throw new Error("Invalid mystery gift directory.");
  return libraryFolderName(path);
}
export function mysteryGiftDirectoryFiles(
  files: readonly MysteryGiftLocalFile[],
  directory: string,
) {
  return files.filter((file) =>
    libraryFolderWithin(file.directory ?? LEGACY_GIFT_DIRECTORY, directory),
  );
}
export function mysteryGiftSourceName(file: MysteryGiftLocalFile) {
  const name = `${libraryFolderName(file.directory ?? LEGACY_GIFT_DIRECTORY)}/${file.fileName}`;
  if (name.length > 4096)
    throw new Error("Mystery gift source name exceeds the local size limit.");
  return name;
}
export function mysteryGiftDirectorySources(
  files: readonly MysteryGiftLocalFile[],
  directory: string,
) {
  return mysteryGiftDirectoryFiles(files, directory).map((file) => ({
    fileName: mysteryGiftSourceName(file),
    data: file.data,
  }));
}
export function attachMysteryGiftDirectory(
  files: readonly MysteryGiftLocalFile[],
  directory: string,
) {
  return files.map((file) => ({
    ...file,
    directory: libraryFolderName(directory),
  }));
}
export function removeMysteryGiftDirectoryFile(
  files: readonly MysteryGiftLocalFile[],
  id: string,
  directory: string,
) {
  if (
    !mysteryGiftDirectoryFiles(files, directory).some((file) => file.id === id)
  )
    throw new Error("Mystery gift removal targets another directory.");
  return files.filter((file) => file.id !== id);
}
export const mysteryGiftDirectoryWords = {
  zh: {
    empty: "没有找到可导入的配信文件。",
    title: "配信资料目录",
    folder: "导入配信目录",
    note: "目录对应本机分类及子分类，不扫描电脑。旧资料归属 mgdb；切换后保留其他分类和内置配信。",
  },
  en: {
    empty: "No importable mystery gift files were found.",
    title: "Mystery gift database folder",
    folder: "Import gift folder",
    note: "The folder identifies a local category and its subcategories, without scanning computer directories. Existing records belong to mgdb; other categories and built-in gifts are retained when switching.",
  },
  ja: {
    empty: "取り込める配信ファイルが見つかりませんでした。",
    title: "配信資料フォルダー",
    folder: "配信フォルダーを取り込む",
    note: "ローカル分類とサブ分類を対象とし、PC は検索しません。既存の資料は mgdb に属します。切り替えても別の分類と内蔵配信は保持します。",
  },
};
