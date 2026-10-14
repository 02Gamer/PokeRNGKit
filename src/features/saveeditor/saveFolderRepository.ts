// SPDX-License-Identifier: GPL-3.0-or-later
import {
  saveFolderPacket,
  type SaveFolderLocalFile,
} from "./saveFolderProtocol";
export interface SaveFolderSnapshot {
  revision: string;
  files: SaveFolderLocalFile[];
}
const database = "pokerngkit-save-library",
  store = "snapshots",
  key = "library";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore(store);
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(request.error ?? Error("Local save library unavailable."));
    request.onblocked = () => {
      blocked = true;
      reject(Error("Local save library is busy in another tab."));
    };
  });
}
function copy(snapshot: SaveFolderSnapshot): SaveFolderSnapshot {
  return {
    revision: snapshot.revision,
    files: snapshot.files.map((file) => ({
      ...file,
      data: file.data.slice(0),
    })),
  };
}
function check(value: SaveFolderSnapshot) {
  if (
    !value ||
    typeof value.revision !== "string" ||
    !Array.isArray(value.files)
  )
    throw Error("Invalid save library snapshot.");
  saveFolderPacket(value.files);
}
function sameFiles(
  a: readonly SaveFolderLocalFile[],
  b: readonly SaveFolderLocalFile[],
) {
  return (
    a.length === b.length &&
    a.every((file, index) => {
      const next = b[index];
      const nextBytes = next ? new Uint8Array(next.data) : undefined;
      return (
        next &&
        file.id === next.id &&
        file.name === next.name &&
        file.folder === next.folder &&
        file.modified === next.modified &&
        file.recent === next.recent &&
        file.backup === next.backup &&
        file.remembered === next.remembered &&
        file.data.byteLength === next.data.byteLength &&
        new Uint8Array(file.data).every((byte, i) => byte === nextBytes?.[i])
      );
    })
  );
}
export async function loadSaveFolder(): Promise<SaveFolderSnapshot> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(store, "readonly"),
        request = transaction.objectStore(store).get(key);
      let result: SaveFolderSnapshot;
      request.onsuccess = () => {
        try {
          result = request.result ?? { revision: "", files: [] };
          check(result);
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      transaction.oncomplete = () => resolve(copy(result));
      transaction.onabort = () =>
        reject(transaction.error ?? Error("Reading save library failed."));
      transaction.onerror = () =>
        reject(transaction.error ?? Error("Reading save library failed."));
    });
  } finally {
    db.close();
  }
}
export async function replaceSaveFolder(
  expected: SaveFolderSnapshot,
  files: readonly SaveFolderLocalFile[],
): Promise<SaveFolderSnapshot> {
  check(expected);
  saveFolderPacket(files);
  const next: SaveFolderSnapshot = {
    revision: crypto.randomUUID(),
    files: files.map((file) => ({ ...file, data: file.data.slice(0) })),
  };
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(store, "readwrite"),
        objectStore = transaction.objectStore(store),
        request = objectStore.get(key);
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const current: SaveFolderSnapshot = request.result ?? {
            revision: "",
            files: [],
          };
          check(current);
          if (
            current.revision !== expected.revision ||
            !sameFiles(current.files, expected.files)
          )
            throw Error("Save library changed in another tab. Reload it.");
          objectStore.put(next, key);
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(copy(next));
      transaction.onabort = () =>
        reject(
          failure ?? transaction.error ?? Error("Saving save library failed."),
        );
      transaction.onerror = () =>
        reject(
          failure ?? transaction.error ?? Error("Saving save library failed."),
        );
    });
  } finally {
    db.close();
  }
}
export async function rememberSaveFolderFile(
  file: File,
  bytes: Uint8Array,
): Promise<void> {
  const before = await loadSaveFolder(),
    folder =
      (file.webkitRelativePath
        ? file.webkitRelativePath.split("/").slice(0, -1).join("/")
        : "") || "recent";
  const name = file.name;
  const old = before.files.find(
    (f) =>
      f.folder === folder &&
      f.name === name &&
      f.modified === file.lastModified &&
      f.data.byteLength === bytes.byteLength &&
      new Uint8Array(f.data).every((byte, index) => byte === bytes[index]),
  );
  const next: SaveFolderLocalFile = {
    id: old?.id ?? crypto.randomUUID(),
    folder,
    name,
    data: new Uint8Array(bytes).buffer,
    modified: file.lastModified,
    recent: true,
    backup: old?.backup ?? false,
    remembered: true,
  };
  await replaceSaveFolder(before, [
    next,
    ...before.files.filter((f) => f.id !== next.id),
  ]);
}
export async function readSaveFolderFiles(
  selected: readonly File[],
  backup: boolean,
): Promise<SaveFolderLocalFile[]> {
  if (selected.length > 1024) throw Error("Too many selected files.");
  let total = 0;
  const result: SaveFolderLocalFile[] = [];
  for (const file of selected) {
    total += file.size;
    if (
      file.size < 1 ||
      file.size > 32 * 1024 * 1024 ||
      total > 128 * 1024 * 1024
    )
      throw Error("Selected save files exceed the local size limit.");
    const relative = file.webkitRelativePath || file.name,
      parts = relative.replaceAll("\\", "/").split("/"),
      name = parts.pop() ?? file.name,
      folder = parts.join("/") || (backup ? "backups" : "selected");
    result.push({
      id: crypto.randomUUID(),
      name,
      folder,
      data: await file.arrayBuffer(),
      modified: file.lastModified,
      recent: !backup,
      backup,
      remembered: false,
    });
  }
  saveFolderPacket(result);
  return result;
}
