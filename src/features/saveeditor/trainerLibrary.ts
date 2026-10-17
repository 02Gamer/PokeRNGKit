// SPDX-License-Identifier: GPL-3.0-or-later
import { libraryFolderName, libraryFolderWithin } from "./saveLibraryLocations";
import { LEGACY_DATABASE_DIRECTORY } from "./databaseDirectory";
import {
  loadDatabaseFiles,
  validateDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
import { readSaveSettings } from "./settingsRepository";
import { entityTemplateBase64 } from "./entityTemplate";
export function trainerDirectory(json: string) {
  if (!json) return "trainers";
  const path = JSON.parse(json).localResources?.trainerPath;
  if (typeof path !== "string" || path.length > 32767)
    throw Error("Invalid trainer directory.");
  return libraryFolderName(path);
}
export function trainerLibraryFiles(
  files: readonly DatabaseLocalFile[],
  directory: string,
) {
  return files.filter(
    (f) =>
      f.entityFile &&
      libraryFolderWithin(f.directory ?? LEGACY_DATABASE_DIRECTORY, directory),
  );
}
export function trainerFilePayload(
  files: readonly DatabaseLocalFile[],
  directory: string,
) {
  validateDatabaseFiles(files);
  const selected = trainerLibraryFiles(files, directory).filter(
    (f) => f.data.byteLength <= 1024 * 1024,
  );
  if (selected.reduce((n, f) => n + f.data.byteLength, 0) > 2 * 1024 * 1024)
    throw Error("Trainer files exceed the local size limit.");
  const payload = selected.map((f) => ({
    fileName: f.name,
    data: entityTemplateBase64(new Uint8Array(f.data)),
  }));
  if (JSON.stringify(payload).length > 3 * 1024 * 1024)
    throw Error("Trainer metadata exceeds the local size limit.");
  return payload;
}
export async function loadEncounterTrainerFiles() {
  const json = readSaveSettings()?.json ?? "";
  let files: ReturnType<typeof trainerFilePayload> = [],
    failed = false;
  try {
    files = trainerFilePayload(
      await loadDatabaseFiles(),
      trainerDirectory(json),
    );
  } catch {
    failed = true;
  }
  if ((readSaveSettings()?.json ?? "") !== json)
    throw Error("Trainer settings changed. Reload the source.");
  return { files, failed };
}
export async function readTrainerFiles(
  files: readonly File[],
  directory: string,
  folder: boolean,
  current: () => boolean,
) {
  if (files.length > 1024) throw Error("Too many trainer files.");
  const result: DatabaseLocalFile[] = [];
  let total = 0;
  for (const file of files) {
    if (!file.size || file.size > 1024 * 1024) continue;
    if ((total += file.size) > 2 * 1024 * 1024)
      throw Error("Trainer selection exceeds the local size limit.");
    const path =
      folder && file.webkitRelativePath
        ? file.webkitRelativePath.split("/").slice(1, -1)
        : [];
    if (path.some((p) => p === "." || p === ".."))
      throw Error("Invalid trainer folder.");
    if (!current()) return;
    const data = await file.arrayBuffer();
    if (!current()) return;
    result.push({
      id: crypto.randomUUID(),
      name: file.name,
      data,
      entityFile: true,
      modified: file.lastModified,
      useFileFormat: true,
      directory: libraryFolderName([directory, ...path].join("/")),
    });
  }
  validateDatabaseFiles(result);
  return result;
}
export function mergeTrainerFiles(
  before: readonly DatabaseLocalFile[],
  added: readonly DatabaseLocalFile[],
) {
  const keys = new Set(
    before.map((f) =>
      JSON.stringify([
        f.directory ?? LEGACY_DATABASE_DIRECTORY,
        f.name.toLowerCase(),
      ]),
    ),
  );
  for (const f of added) {
    const key = JSON.stringify([
      f.directory ?? LEGACY_DATABASE_DIRECTORY,
      f.name.toLowerCase(),
    ]);
    if (keys.has(key))
      throw Error("Remove the existing trainer file before replacing it.");
    keys.add(key);
  }
  const result = [...before, ...added];
  validateDatabaseFiles(result);
  return result;
}
