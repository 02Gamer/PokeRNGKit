import { afterEach, describe, expect, it, vi } from "vitest";
import {
  validateDatabaseFiles,
  loadDatabaseFiles,
  replaceDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
describe("local database inputs", () => {
  const file: DatabaseLocalFile = {
    id: "first",
    name: "folder/pokemon.pk3",
    data: new ArrayBuffer(80),
    entityFile: true,
    modified: 1,
  };
  it("retains duplicate relative names with independent identity", () => {
    expect(() =>
      validateDatabaseFiles([file, { ...file, id: "second" }]),
    ).not.toThrow();
    expect(() => validateDatabaseFiles([file, file])).toThrow();
  });
  it("rejects empty/oversized names, empty payload and invalid timestamps before writes", () => {
    for (const invalid of [
      { ...file, data: new ArrayBuffer(0) },
      { ...file, name: "" },
      { ...file, id: "" },
      { ...file, modified: NaN },
      { ...file, name: "x".repeat(4097) },
    ])
      expect(() => validateDatabaseFiles([invalid])).toThrow();
    expect(() => validateDatabaseFiles([])).not.toThrow();
  });
});

// Model transaction commit/abort events; real IndexedDB browser acceptance remains separate.
describe("database replacement transaction", () => {
  afterEach(() => vi.unstubAllGlobals());
  const file: DatabaseLocalFile = {
    id: "one",
    name: "one.pk3",
    data: Uint8Array.of(1, 2, 3).buffer,
    entityFile: true,
    modified: 1,
  };
  function storage(
    initial: DatabaseLocalFile[],
    failWrite = false,
    upgrade = false,
  ) {
    let files = structuredClone(initial);
    const db = {} as IDBDatabase;
    Object.assign(db, {
      objectStoreNames: { contains: () => true },
      createObjectStore: () => {
        throw new Error(
          "Existing records must not be recreated during upgrade.",
        );
      },
      close: vi.fn(),
      transaction: () => {
        let next = structuredClone(files),
          aborted = false;
        const transaction = {} as IDBTransaction;
        const store = {
          getAll: () => {
            const request = {} as IDBRequest<DatabaseLocalFile[]>;
            queueMicrotask(() => {
              Object.assign(request, { result: structuredClone(files) });
              request.onsuccess?.(new Event("success"));
              if (!aborted) {
                files = next;
                transaction.oncomplete?.(new Event("complete"));
              }
            });
            return request;
          },
          clear: () => {
            next = [];
          },
          put: (value: DatabaseLocalFile) => {
            if (failWrite) throw Error("Quota exceeded");
            next.push(structuredClone(value));
          },
        };
        Object.assign(transaction, {
          objectStore: () => store,
          abort: () => {
            aborted = true;
            queueMicrotask(() => transaction.onabort?.(new Event("abort")));
          },
        });
        return transaction;
      },
    });
    vi.stubGlobal("indexedDB", {
      open: (_name: string, version: number) => {
        expect(version).toBe(2);
        const request = {} as IDBOpenDBRequest;
        queueMicrotask(() => {
          Object.assign(request, { result: db });
          if (upgrade)
            request.onupgradeneeded?.(
              new Event("upgradeneeded") as IDBVersionChangeEvent,
            );
          request.onsuccess?.(new Event("success"));
        });
        return request;
      },
    });
    return () => files;
  }
  it("commits selected copies and keeps caller-owned buffers independent", async () => {
    const read = storage([file]);
    const added = { ...file, id: "two" };
    await replaceDatabaseFiles([file], [added]);
    new Uint8Array(added.data)[0] = 9;
    expect(read().map((f) => f.id)).toEqual(["two"]);
    expect(new Uint8Array(read()[0].data)[0]).toBe(1);
    new Uint8Array(added.data)[0] = 1;
  });
  it("upgrades to version two without clearing or rewriting legacy data", async () => {
    const original = structuredClone(file),
      read = storage([file], false, true);
    const loaded = await loadDatabaseFiles();
    expect(loaded).toEqual([original]);
    expect(read()).toEqual([original]);
    expect(loaded[0].directory).toBeUndefined();
  });
  it("aborts after a failed write and retains the old database", async () => {
    const read = storage([file], true);
    await expect(
      replaceDatabaseFiles([file], [{ ...file, id: "two" }]),
    ).rejects.toThrow("Quota");
    expect(read()).toEqual([file]);
  });
  it("refuses an intervening tab change without overwriting its bytes or metadata", async () => {
    for (const changed of [
      { ...file, name: "changed.pk3" },
      { ...file, modified: 2 },
      { ...file, useFileFormat: true },
      { ...file, directory: "another" },
      { ...file, data: Uint8Array.of(3, 2, 1).buffer },
    ]) {
      const read = storage([changed]);
      await expect(replaceDatabaseFiles([file], [])).rejects.toThrow(
        "another tab",
      );
      expect(read()).toEqual([changed]);
    }
  });
});
