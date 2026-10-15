import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadSaveFolder,
  rememberSaveFolderFile,
  replaceSaveFolder,
  type SaveFolderSnapshot,
} from "./saveFolderRepository";
const initial: SaveFolderSnapshot = {
  revision: "one",
  files: [
    {
      id: "file",
      name: "main",
      folder: "local",
      data: new Uint8Array([1, 2, 3]).buffer,
      modified: 123,
      recent: true,
      backup: false,
      remembered: true,
    },
  ],
};
function storage(value: SaveFolderSnapshot, fail = false) {
  let stored = structuredClone(value);
  const db = {} as IDBDatabase;
  Object.assign(db, {
    close: vi.fn(),
    transaction: () => {
      let next = structuredClone(stored),
        aborted = false;
      const tx = {} as IDBTransaction;
      const objectStore = {
        get: () => {
          const request = {} as IDBRequest;
          queueMicrotask(() => {
            Object.assign(request, { result: structuredClone(stored) });
            request.onsuccess?.(new Event("success"));
            if (!aborted) {
              stored = next;
              tx.oncomplete?.(new Event("complete"));
            }
          });
          return request;
        },
        put: (data: SaveFolderSnapshot) => {
          if (fail) throw Error("quota");
          next = structuredClone(data);
        },
      };
      Object.assign(tx, {
        objectStore: () => objectStore,
        abort: () => {
          aborted = true;
          queueMicrotask(() => tx.onabort?.(new Event("abort")));
        },
      });
      return tx;
    },
  });
  vi.stubGlobal("indexedDB", {
    open: () => {
      const request = {} as IDBOpenDBRequest;
      queueMicrotask(() => {
        Object.assign(request, { result: db });
        request.onsuccess?.(new Event("success"));
      });
      return request;
    },
  });
  return () => stored;
}
afterEach(() => vi.unstubAllGlobals());
describe("local save library transaction", () => {
  it("atomically stores original bytes and deduplicates backups without overwriting", async () => {
    const read = storage(initial);
    const options = {
      backupName: "main [trainer].bak",
      backupFolder: "bak",
      recentMax: 1,
    };
    await rememberSaveFolderFile(
      new File([new Uint8Array([4, 5])], "E.sav", { lastModified: 321 }),
      new Uint8Array([4, 5]),
      options,
    );
    expect(read().files.filter((f) => f.recent)).toHaveLength(1);
    const backup = read().files.find((f) => f.backup)!;
    expect(new Uint8Array(backup.data)).toEqual(new Uint8Array([4, 5]));
    await rememberSaveFolderFile(
      new File([new Uint8Array([9])], "E.sav", { lastModified: 322 }),
      new Uint8Array([9]),
      options,
    );
    expect(read().files.filter((f) => f.backup)).toHaveLength(1);
    expect(read().files.find((f) => f.backup)).toEqual(backup);
    expect(read().files.filter((f) => f.recent)).toHaveLength(1);
    expect(read().files.some((f) => f.id === "file")).toBe(true);
  });
  it("preserves both old entries and backups on quota failure", async () => {
    const read = storage(initial, true);
    await expect(
      rememberSaveFolderFile(
        new File([new Uint8Array([4])], "E.sav"),
        new Uint8Array([4]),
        { backupName: "E.bak", backupFolder: "bak", recentMax: 1 },
      ),
    ).rejects.toThrow("quota");
    expect(read()).toEqual(initial);
  });
  it("restores a selected source without creating a second recent copy", async () => {
    const read = storage(initial);
    await rememberSaveFolderFile(
      new File([initial.files[0].data], "main", { lastModified: 123 }),
      new Uint8Array(initial.files[0].data),
      { backupName: "", backupFolder: "bak", recentMax: 10, sourceId: "file" },
    );
    expect(read().files).toHaveLength(1);
    expect(read().files[0].folder).toBe("local");
    await expect(
      rememberSaveFolderFile(
        new File([new Uint8Array([9])], "main"),
        new Uint8Array([9]),
        {
          backupName: "",
          backupFolder: "bak",
          recentMax: 10,
          sourceId: "file",
        },
      ),
    ).rejects.toThrow("changed");
    expect(read().files).toHaveLength(1);
  });
  it("reads independent snapshots and commits copied bytes with a new revision", async () => {
    const read = storage(initial),
      before = await loadSaveFolder(),
      files = before.files.map((file) => ({
        ...file,
        name: "renamed",
        data: file.data.slice(0),
      }));
    new Uint8Array(files[0].data)[0] = 9;
    expect(new Uint8Array(read().files[0].data)[0]).toBe(1);
    const next = await replaceSaveFolder(before, files);
    expect(next.revision).not.toBe("one");
    expect(read().files[0].name).toBe("renamed");
    new Uint8Array(next.files[0].data)[0] = 7;
    expect(new Uint8Array(read().files[0].data)[0]).toBe(9);
  });
  it("refuses stale tab revisions without overwriting the other tab", async () => {
    const read = storage({ ...initial, revision: "other" });
    await expect(replaceSaveFolder(initial, [])).rejects.toThrow("another tab");
    expect(read().revision).toBe("other");
    expect(read().files).toEqual(initial.files);
  });
  it("rejects changed content with the same revision instead of trusting caller metadata", async () => {
    const changed = structuredClone(initial);
    new Uint8Array(changed.files[0].data)[0] = 8;
    const read = storage(changed);
    await expect(replaceSaveFolder(initial, [])).rejects.toThrow("another tab");
    expect(read()).toEqual(changed);
  });
  it("keeps the complete old snapshot after write failure", async () => {
    const read = storage(initial, true);
    await expect(replaceSaveFolder(initial, [])).rejects.toThrow("quota");
    expect(read()).toEqual(initial);
  });
});
