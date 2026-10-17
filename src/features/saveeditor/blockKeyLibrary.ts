// SPDX-License-Identifier: GPL-3.0-or-later
import { libraryFolderName } from "./saveLibraryLocations";
export interface BlockKeyFile {
  id: string;
  directory: string;
  name: string;
  data: Blob;
  modified: number;
}
export interface BlockKeyLibrary {
  revision: string;
  files: readonly Readonly<BlockKeyFile>[];
}
const database = "pokerngkit-block-key-library",
  store = "snapshots",
  key = "library",
  signal = "pokerngkit-block-key-revision";
const listeners = new Set<(origin?: object) => void>();
let cached: Promise<BlockKeyLibrary> | undefined;
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
export const MAX_BLOCK_KEY_FILES = 256,
  MAX_BLOCK_KEY_FILE = 4 * 1024 * 1024,
  MAX_BLOCK_KEY_LIBRARY = 32 * 1024 * 1024;
export function blockKeyDirectory(json: string) {
  if (!json) return "local";
  const path = JSON.parse(json).advanced?.pathBlockKeyList;
  if (typeof path !== "string" || path.length > 32767)
    throw new Error("Invalid blockKey directory.");
  return libraryFolderName(path);
}
export function blockKeyFileId(directory: string, name: string) {
  return JSON.stringify([libraryFolderName(directory), name.toLowerCase()]);
}
export function validateBlockKeyLibrary(value: BlockKeyLibrary) {
  if (
    !value ||
    typeof value.revision !== "string" ||
    value.revision.length > 128 ||
    !Array.isArray(value.files) ||
    value.files.length > MAX_BLOCK_KEY_FILES
  )
    throw new Error("Invalid blockKey library.");
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
      !/^[a-z0-9_-]+\.txt$/i.test(file.name) ||
      file.id !== blockKeyFileId(file.directory, file.name) ||
      ids.has(file.id) ||
      !(file.data instanceof Blob) ||
      file.data.size > MAX_BLOCK_KEY_FILE ||
      !Number.isFinite(file.modified)
    )
      throw new Error("Invalid blockKey file.");
    ids.add(file.id);
    size += file.data.size;
  }
  if (size > MAX_BLOCK_KEY_LIBRARY)
    throw new Error("BlockKey library exceeds the local size limit.");
}
function freeze(value: BlockKeyLibrary): BlockKeyLibrary {
  validateBlockKeyLibrary(value);
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
      reject(new Error("BlockKey library is busy."));
    };
    request.onerror = () =>
      reject(request.error ?? new Error("BlockKey library unavailable."));
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
async function read(): Promise<BlockKeyLibrary> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly"),
        request = tx.objectStore(store).get(key);
      let value: BlockKeyLibrary;
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
        reject(tx.error ?? new Error("Reading blockKey library failed."));
    });
  } finally {
    db.close();
  }
}
export function loadBlockKeyLibrary(refresh = false) {
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
export function subscribeBlockKeyLibrary(listener: (origin?: object) => void) {
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
export async function replaceBlockKeyLibrary(
  expected: BlockKeyLibrary,
  files: readonly BlockKeyFile[],
  origin?: object,
): Promise<BlockKeyLibrary> {
  validateBlockKeyLibrary(expected);
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
            throw new Error("BlockKey library changed in another tab.");
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
        reject(
          failure ?? tx.error ?? new Error("Saving blockKey library failed."),
        );
    });
  } finally {
    db.close();
  }
}
export async function readBlockKeyFiles(
  files: readonly File[],
  directory: string,
  folder = false,
): Promise<BlockKeyFile[]> {
  if (files.length > MAX_BLOCK_KEY_FILES)
    throw new Error("Too many blockKey files.");
  const result: BlockKeyFile[] = [];
  let total = 0;
  for (const file of files) {
    if (!/^[a-z0-9_-]+\.txt$/i.test(file.name)) continue;
    total += file.size;
    if (file.size > MAX_BLOCK_KEY_FILE || total > MAX_BLOCK_KEY_LIBRARY)
      throw new Error("BlockKey files exceed the local size limit.");
    let relative =
      folder && file.webkitRelativePath
        ? file.webkitRelativePath.split("/").slice(1, -1).join("/")
        : "";
    if (relative.split("/").some((part) => part === ".." || part === "."))
      throw new Error("Invalid blockKey folder.");
    relative = libraryFolderName(
      relative ? directory + "/" + relative : directory,
    );
    const name = file.name.toLowerCase();
    result.push({
      id: blockKeyFileId(relative, name),
      directory: relative,
      name,
      data: file.slice(0, file.size, "text/plain"),
      modified: file.lastModified,
    });
  }
  validateBlockKeyLibrary({ revision: "", files: result });
  return result;
}
export function findBlockKeyFile(
  library: BlockKeyLibrary,
  directory: string,
  names: readonly string[],
) {
  const root = libraryFolderName(directory);
  for (const name of names) {
    const id = blockKeyFileId(root, name);
    const match = library.files.find((file) => file.id === id);
    if (match) return match;
  }
}
export function mergeBlockKeyFiles(
  library: BlockKeyLibrary,
  added: readonly BlockKeyFile[],
) {
  const used = new Set(library.files.map((file) => file.id));
  if (added.some((file) => used.has(file.id)))
    throw new Error(
      "A blockKey file with this name already exists. Remove it explicitly before importing a replacement.",
    );
  return [...library.files, ...added];
}
