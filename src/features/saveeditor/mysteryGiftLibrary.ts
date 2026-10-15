// SPDX-License-Identifier: GPL-3.0-or-later
import { publishMysteryGiftChange } from "./mysteryGiftChanges";
export interface MysteryGiftLocalFile {
  id: string;
  fileName: string;
  data: string;
  modified: number;
  directory?: string;
}
export interface MysteryGiftLibrary {
  revision: string;
  files: MysteryGiftLocalFile[];
}
const database = "pokerngkit-mystery-gift-library",
  store = "snapshots",
  key = "library";
export function validateMysteryGiftLibrary(value: MysteryGiftLibrary) {
  if (
    !value ||
    typeof value.revision !== "string" ||
    !Array.isArray(value.files) ||
    value.files.length > 1024
  )
    throw Error("Invalid mystery gift library.");
  const ids = new Set<string>();
  let total = 0;
  for (const file of value.files) {
    if (
      !file ||
      typeof file.id !== "string" ||
      !file.id ||
      file.id.length > 128 ||
      ids.has(file.id) ||
      typeof file.fileName !== "string" ||
      !file.fileName ||
      file.fileName.length > 4096 ||
      typeof file.data !== "string" ||
      !file.data ||
      file.data.length > 64 * 1024 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        file.data,
      ) ||
      !Number.isFinite(file.modified) ||
      (file.directory !== undefined &&
        (typeof file.directory !== "string" ||
          !file.directory ||
          file.directory.length > 32767))
    )
      throw Error("Invalid mystery gift file.");
    total += atob(file.data).length;
    ids.add(file.id);
  }
  if (total > 16 * 1024 * 1024)
    throw Error("Mystery gift library exceeds 16 MiB.");
}
function copy(value: MysteryGiftLibrary): MysteryGiftLibrary {
  return {
    revision: value.revision,
    files: value.files.map((file) => ({ ...file })),
  };
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(store))
        request.result.createObjectStore(store);
    };
    request.onblocked = () => {
      blocked = true;
      reject(Error("Mystery gift library is busy."));
    };
    request.onerror = () =>
      reject(request.error ?? Error("Mystery gift library is unavailable."));
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
export async function loadMysteryGiftLibrary(): Promise<MysteryGiftLibrary> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly"),
        request = tx.objectStore(store).get(key);
      let value: MysteryGiftLibrary;
      request.onsuccess = () => {
        try {
          value = request.result ?? { revision: "", files: [] };
          validateMysteryGiftLibrary(value);
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      tx.oncomplete = () => resolve(copy(value));
      tx.onerror = tx.onabort = () =>
        reject(tx.error ?? Error("Reading mystery gift library failed."));
    });
  } finally {
    db.close();
  }
}
export async function replaceMysteryGiftLibrary(
  expected: MysteryGiftLibrary,
  files: readonly MysteryGiftLocalFile[],
  origin?: object,
): Promise<MysteryGiftLibrary> {
  validateMysteryGiftLibrary(expected);
  const next = {
    revision: crypto.randomUUID(),
    files: files.map((file) => ({ ...file })),
  };
  validateMysteryGiftLibrary(next);
  const before = JSON.stringify(copy(expected));
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite"),
        object = tx.objectStore(store),
        request = object.get(key);
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const current = request.result ?? { revision: "", files: [] };
          validateMysteryGiftLibrary(current);
          if (JSON.stringify(copy(current)) !== before)
            throw Error(
              "Mystery gift library changed in another tab. Reload it.",
            );
          object.put(next, key);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => {
        publishMysteryGiftChange(next.revision, origin);
        resolve(copy(next));
      };
      tx.onerror = tx.onabort = () =>
        reject(
          failure ?? tx.error ?? Error("Saving mystery gift library failed."),
        );
    });
  } finally {
    db.close();
  }
}
export async function readMysteryGiftFiles(
  files: readonly File[],
): Promise<MysteryGiftLocalFile[]> {
  if (files.length > 1024) throw Error("Too many mystery gift files.");
  let total = 0;
  const result: MysteryGiftLocalFile[] = [];
  for (const file of files) {
    total += file.size;
    if (!file.size || file.size > 48 * 1024 || total > 16 * 1024 * 1024)
      throw Error("Mystery gift file exceeds the local size limit.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    result.push({
      id: crypto.randomUUID(),
      fileName: file.webkitRelativePath || file.name,
      data: btoa(binary),
      modified: file.lastModified,
    });
  }
  validateMysteryGiftLibrary({ revision: "", files: result });
  return result;
}
