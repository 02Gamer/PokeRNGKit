// SPDX-License-Identifier: GPL-3.0-or-later
import { libraryFolderName } from "./saveLibraryLocations";
export interface CryFile {
  id: string;
  directory: string;
  name: string;
  data: Blob;
  modified: number;
}
export interface CryLibrary {
  revision: string;
  files: readonly Readonly<CryFile>[];
}
const database = "pokerngkit-cry-library",
  store = "snapshots",
  key = "library",
  signal = "pokerngkit-cry-revision";
const listeners = new Set<(origin?: object) => void>();
let cached: Promise<CryLibrary> | undefined;
let channel: BroadcastChannel | undefined;
function changesChannel() {
  if (
    !channel &&
    typeof window !== "undefined" &&
    typeof BroadcastChannel !== "undefined"
  ) {
    channel = new BroadcastChannel(signal);
    channel.onmessage = (event) => {
      if (typeof event.data !== "string" || event.data.length > 128) return;
      cached = undefined;
      for (const listener of listeners) listener();
    };
  }
  return channel;
}
export const MAX_CRY_FILES = 4096,
  MAX_CRY_FILE = 16 * 1024 * 1024,
  MAX_CRY_LIBRARY = 256 * 1024 * 1024;
export function cryDirectory(json: string) {
  if (!json) return "sounds";
  const path = JSON.parse(json).localResources?.soundPath;
  if (typeof path !== "string" || path.length > 32767)
    throw new Error("Invalid cry directory.");
  return libraryFolderName(path);
}
export function cryFileId(directory: string, name: string) {
  return JSON.stringify([libraryFolderName(directory), name.toLowerCase()]);
}
export function validateCryLibrary(value: CryLibrary) {
  if (
    !value ||
    typeof value.revision !== "string" ||
    value.revision.length > 128 ||
    !Array.isArray(value.files) ||
    value.files.length > MAX_CRY_FILES
  )
    throw new Error("Invalid cry library.");
  const ids = new Set<string>();
  let size = 0;
  for (const file of value.files) {
    if (
      !file ||
      typeof file.directory !== "string" ||
      file.directory.length > 32767 ||
      !file.directory ||
      typeof file.name !== "string" ||
      file.name.length > 255 ||
      !/^\d+(?:-[a-z0-9]+)*\.wav$/i.test(file.name) ||
      file.id !== cryFileId(file.directory, file.name) ||
      ids.has(file.id) ||
      !(file.data instanceof Blob) ||
      !file.data.size ||
      file.data.size > MAX_CRY_FILE ||
      !Number.isFinite(file.modified)
    )
      throw new Error("Invalid cry file.");
    ids.add(file.id);
    size += file.data.size;
  }
  if (size > MAX_CRY_LIBRARY)
    throw new Error("Cry library exceeds the local size limit.");
}
function freeze(value: CryLibrary): CryLibrary {
  validateCryLibrary(value);
  return Object.freeze({
    revision: value.revision,
    files: Object.freeze(value.files.map((file) => Object.freeze({ ...file }))),
  });
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(store))
        request.result.createObjectStore(store);
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Cry library is busy."));
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Cry library unavailable."));
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
async function read(): Promise<CryLibrary> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly"),
        request = tx.objectStore(store).get(key);
      let value: CryLibrary;
      request.onsuccess = () => {
        try {
          value = freeze(request.result ?? { revision: "", files: [] });
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () =>
        reject(tx.error ?? new Error("Reading cry library failed."));
    });
  } finally {
    db.close();
  }
}
export function loadCryLibrary(refresh = false) {
  if (refresh) cached = undefined;
  return (cached ??= read().catch((error) => {
    cached = undefined;
    throw error;
  }));
}
function publish(revision: string, origin?: object) {
  cached = undefined;
  try {
    localStorage.setItem(signal, revision);
  } catch {
    /* IndexedDB remains authoritative. */
  }
  try {
    changesChannel()?.postMessage(revision);
  } catch {
    /* Same-page observers remain available. */
  }
  for (const listener of listeners) listener(origin);
}
export function subscribeCryLibrary(listener: (origin?: object) => void) {
  listeners.add(listener);
  try {
    changesChannel();
  } catch {
    /* Storage events and local observers still work. */
  }
  const changed = (event: StorageEvent) => {
    if (
      (event.key === signal || event.key === null) &&
      event.storageArea === localStorage
    ) {
      cached = undefined;
      listener();
    }
  };
  if (typeof window !== "undefined")
    window.addEventListener("storage", changed);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined")
      window.removeEventListener("storage", changed);
  };
}
export async function replaceCryLibrary(
  expected: CryLibrary,
  files: readonly CryFile[],
  origin?: object,
): Promise<CryLibrary> {
  validateCryLibrary(expected);
  const next = freeze({ revision: crypto.randomUUID(), files });
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite"),
        object = tx.objectStore(store),
        request = object.get(key);
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const current = freeze(request.result ?? { revision: "", files: [] });
          if (current.revision !== expected.revision)
            throw new Error("Cry library changed in another tab.");
          object.put(next, key);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => {
        publish(next.revision, origin);
        cached = Promise.resolve(next);
        resolve(next);
      };
      tx.onerror = tx.onabort = () =>
        reject(failure ?? tx.error ?? new Error("Saving cry library failed."));
    });
  } finally {
    db.close();
  }
}
export async function readCryFiles(
  files: readonly File[],
  directory: string,
  folder = false,
): Promise<CryFile[]> {
  if (files.length > MAX_CRY_FILES) throw new Error("Too many cry files.");
  const result: CryFile[] = [];
  let total = 0;
  for (const file of files) {
    if (!/^\d+(?:-[a-z0-9]+)*\.wav$/i.test(file.name)) continue;
    total += file.size;
    if (!file.size || file.size > MAX_CRY_FILE || total > MAX_CRY_LIBRARY)
      throw new Error("Cry files exceed the local size limit.");
    const header = new DataView(await file.slice(0, 12).arrayBuffer());
    if (
      header.byteLength < 12 ||
      header.getUint32(0, false) !== 0x52494646 ||
      header.getUint32(8, false) !== 0x57415645
    )
      throw new Error("Invalid WAV cry file.");
    let relative =
      folder && file.webkitRelativePath
        ? file.webkitRelativePath.split("/").slice(1, -1).join("/")
        : "";
    if (relative.split("/").some((part) => part === ".." || part === "."))
      throw new Error("Invalid cry folder.");
    relative = libraryFolderName(
      relative ? directory + "/" + relative : directory,
    );
    const name = file.name.toLowerCase();
    result.push({
      id: cryFileId(relative, name),
      directory: relative,
      name,
      data: file.slice(0, file.size, "audio/wav"),
      modified: file.lastModified,
    });
  }
  validateCryLibrary({ revision: "", files: result });
  return result;
}
export function findCryFile(
  library: CryLibrary,
  directory: string,
  names: readonly string[],
) {
  const root = libraryFolderName(directory);
  for (const name of names) {
    const id = cryFileId(root, name);
    const match = library.files.find((file) => file.id === id);
    if (match) return match;
  }
}
export function mergeCryFiles(library: CryLibrary, added: readonly CryFile[]) {
  const used = new Set(library.files.map((file) => file.id));
  if (added.some((file) => used.has(file.id)))
    throw new Error(
      "A cry file with this name already exists. Remove it explicitly before importing a replacement.",
    );
  return [...library.files, ...added];
}
