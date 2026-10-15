// SPDX-License-Identifier: GPL-3.0-or-later
export interface DatabaseLocalFile {
  id: string;
  name: string;
  data: ArrayBuffer;
  entityFile: boolean;
  modified: number;
  useFileFormat?: boolean;
  directory?: string;
}
export const DATABASE_LIMITS = {
  files: 1024,
  fileBytes: 64 * 1024 * 1024,
  bytes: 128 * 1024 * 1024,
};
export function validateDatabaseFiles(files: readonly DatabaseLocalFile[]) {
  const ids = new Set<string>();
  if (
    files.length > DATABASE_LIMITS.files ||
    files.reduce((sum, f) => sum + f.data.byteLength, 0) > DATABASE_LIMITS.bytes
  )
    throw Error("Database exceeds the local size limit.");
  for (const file of files) {
    if (
      !file.id ||
      file.id.length > 128 ||
      ids.has(file.id) ||
      !file.name ||
      file.name.length > 4096 ||
      !file.data.byteLength ||
      file.data.byteLength > DATABASE_LIMITS.fileBytes ||
      !Number.isFinite(file.modified) ||
      (file.useFileFormat !== undefined &&
        typeof file.useFileFormat !== "boolean") ||
      (file.useFileFormat === true && !file.entityFile) ||
      (file.directory !== undefined &&
        (typeof file.directory !== "string" ||
          !file.directory ||
          file.directory.length > 32767 ||
          !file.entityFile))
    )
      throw Error("Invalid local database file.");
    ids.add(file.id);
  }
}
const DATABASE = "pokerngkit-pokemon-database",
  STORE = "files";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(request.error ?? Error("Local database unavailable."));
    request.onblocked = () => {
      blocked = true;
      reject(Error("Local database is busy in another tab."));
    };
  });
}
export async function loadDatabaseFiles(): Promise<DatabaseLocalFile[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly"),
        request = transaction.objectStore(STORE).getAll();
      let files: DatabaseLocalFile[] = [];
      request.onsuccess = () => {
        files = request.result as DatabaseLocalFile[];
      };
      transaction.oncomplete = () => {
        try {
          validateDatabaseFiles(files);
          resolve(files);
        } catch (error) {
          reject(error);
        }
      };
      transaction.onabort = () =>
        reject(transaction.error ?? Error("Reading local database failed."));
      transaction.onerror = () =>
        reject(transaction.error ?? Error("Reading local database failed."));
    });
  } finally {
    db.close();
  }
}
// One transaction makes replacement atomic; failed storage keeps the old database.
export async function saveDatabaseFiles(files: readonly DatabaseLocalFile[]) {
  validateDatabaseFiles(files);
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite"),
        store = transaction.objectStore(STORE);
      try {
        store.clear();
        for (const file of files)
          store.put({ ...file, data: file.data.slice(0) });
      } catch (error) {
        transaction.abort();
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(transaction.error ?? Error("Saving local database failed."));
      transaction.onerror = () =>
        reject(transaction.error ?? Error("Saving local database failed."));
    });
  } finally {
    db.close();
  }
}
export async function replaceDatabaseFiles(
  before: readonly DatabaseLocalFile[],
  after: readonly DatabaseLocalFile[],
) {
  validateDatabaseFiles(before);
  validateDatabaseFiles(after);
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite"),
        store = transaction.objectStore(STORE),
        request = store.getAll();
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const stored = request.result as DatabaseLocalFile[];
          const expected = new Map(before.map((f) => [f.id, f]));
          if (
            stored.length !== before.length ||
            stored.some((file) => {
              const old = expected.get(file.id);
              if (
                !old ||
                old.name !== file.name ||
                old.entityFile !== file.entityFile ||
                old.directory !== file.directory ||
                Boolean(old.useFileFormat) !== Boolean(file.useFileFormat) ||
                old.modified !== file.modified ||
                old.data.byteLength !== file.data.byteLength
              )
                return true;
              const a = new Uint8Array(old.data),
                b = new Uint8Array(file.data);
              for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
              return false;
            })
          )
            throw Error("Local database changed in another tab. Reload it.");
          store.clear();
          for (const file of after)
            store.put({ ...file, data: file.data.slice(0) });
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(
          failure ??
            transaction.error ??
            Error("Local database replacement failed."),
        );
      transaction.onerror = () =>
        reject(
          transaction.error ?? Error("Local database replacement failed."),
        );
    });
  } finally {
    db.close();
  }
}
export async function readDatabaseFiles(
  files: readonly File[],
  entityFile: boolean,
  current: () => boolean,
) {
  if (
    files.length > DATABASE_LIMITS.files ||
    files.some((f) => !f.size || f.size > DATABASE_LIMITS.fileBytes) ||
    files.reduce((sum, f) => sum + f.size, 0) > DATABASE_LIMITS.bytes
  )
    throw Error("Database selection exceeds the local size limit.");
  const result: DatabaseLocalFile[] = [];
  for (const file of files) {
    if (!current()) return;
    const data = await file.arrayBuffer();
    if (!current()) return;
    result.push({
      id: crypto.randomUUID(),
      name: file.webkitRelativePath || file.name,
      data,
      entityFile,
      modified: file.lastModified,
    });
  }
  validateDatabaseFiles(result);
  return result;
}
