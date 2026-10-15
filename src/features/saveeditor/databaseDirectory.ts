// SPDX-License-Identifier: GPL-3.0-or-later
import { libraryFolderName, libraryFolderWithin } from "./saveLibraryLocations";
import {
  validateDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
import type { DatabaseDelta } from "./databaseProtocol";
export const LEGACY_DATABASE_DIRECTORY = "pkmdb";
export function databaseDirectory(json: string) {
  if (!json) return LEGACY_DATABASE_DIRECTORY;
  const root = JSON.parse(json),
    value = root.localResources?.databasePath;
  if (typeof value !== "string" || value.length > 32767)
    throw new Error("Invalid database directory.");
  return libraryFolderName(value);
}
export function databaseDirectoryFiles(
  files: readonly DatabaseLocalFile[],
  directory: string,
) {
  return files.filter(
    (file) =>
      !file.entityFile ||
      libraryFolderWithin(
        file.directory ?? LEGACY_DATABASE_DIRECTORY,
        directory,
      ),
  );
}
export function databaseSourceName(file: DatabaseLocalFile) {
  return file.entityFile
    ? `${libraryFolderName(file.directory ?? LEGACY_DATABASE_DIRECTORY)}/${file.name}`
    : file.name;
}
export function databaseDestinationName(name: string, directory: string) {
  const result = `${libraryFolderName(directory)}/${name}`;
  if (result.length > 4096)
    throw new Error("Database source name exceeds the local size limit.");
  return result;
}
export function attachDatabaseDirectory(
  files: readonly DatabaseLocalFile[],
  directory: string,
) {
  return files.map((file) =>
    file.entityFile
      ? { ...file, directory: libraryFolderName(directory) }
      : file,
  );
}
export function directoryDatabaseDelta(
  all: readonly DatabaseLocalFile[],
  library: readonly DatabaseLocalFile[],
  delta: DatabaseDelta,
  directory: string,
): DatabaseDelta {
  const active = new Set(
    databaseDirectoryFiles(all, directory).map((file) => file.id),
  );
  const protectedIds = new Set(library.map((file) => file.id));
  if (
    delta.removed.some((id) => !active.has(id) || protectedIds.has(id)) ||
    delta.added.some((file) => protectedIds.has(file.id))
  )
    throw new Error(
      "Database changes target an inactive directory or library snapshot.",
    );
  const prefix = libraryFolderName(directory) + "/";
  const added = delta.added.map((file) => {
    if (
      !file.entityFile ||
      file.directory !== undefined ||
      !file.name.startsWith(prefix) ||
      file.name.length === prefix.length
    )
      throw new Error("Added database file belongs to another directory.");
    return {
      ...file,
      name: file.name.slice(prefix.length),
      directory: libraryFolderName(directory),
    };
  });
  validateDatabaseFiles(added);
  return { ...delta, added };
}
export const databaseDirectoryWords = {
  zh: {
    title: "宝可梦资料目录",
    note: "目录对应浏览器本机分类，包含其子目录，不扫描电脑。旧资料归属 pkmdb；切换目录不会移动或删除其他分类。",
  },
  en: {
    title: "Pokémon database folder",
    note: "The folder identifies a local browser category and its subfolders, without scanning computer directories. Existing records belong to pkmdb; switching folders does not move or delete other categories.",
  },
  ja: {
    title: "ポケモン資料フォルダー",
    note: "ブラウザ内の分類とサブフォルダーを対象とし、PC は検索しません。既存の資料は pkmdb に属します。切り替えても別の分類は移動・削除しません。",
  },
};
