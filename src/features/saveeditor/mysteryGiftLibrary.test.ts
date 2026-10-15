import { afterEach, expect, it, vi } from "vitest";
import {
  loadMysteryGiftLibrary,
  replaceMysteryGiftLibrary,
  validateMysteryGiftLibrary,
  readMysteryGiftFiles,
  type MysteryGiftLibrary,
} from "./mysteryGiftLibrary";
const initial: MysteryGiftLibrary = {
  revision: "one",
  files: [{ id: "a", fileName: "gift.wc6", data: "AQID", modified: 123 }],
};
function storage(value: MysteryGiftLibrary, fail = false, upgrade = false) {
  let stored = structuredClone(value);
  const db = {} as IDBDatabase;
  Object.assign(db, {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => {
      throw new Error("Existing store must not be recreated.");
    },
    close: vi.fn(),
    transaction: () => {
      let next = structuredClone(stored),
        aborted = false;
      const tx = {} as IDBTransaction;
      const object = {
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
        put: (data: MysteryGiftLibrary) => {
          if (fail) throw Error("quota");
          next = structuredClone(data);
        },
      };
      Object.assign(tx, {
        objectStore: () => object,
        abort: () => {
          aborted = true;
          queueMicrotask(() => tx.onabort?.(new Event("abort")));
        },
      });
      return tx;
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
  return () => stored;
}
afterEach(() => vi.unstubAllGlobals());
it("upgrades storage without clearing or rewriting legacy records", async () => {
  const read = storage(initial, false, true);
  expect(await loadMysteryGiftLibrary()).toEqual(initial);
  expect(read()).toEqual(initial);
  expect(read().files[0].directory).toBeUndefined();
});
it("persists an independent complete snapshot and supports reversible replacement", async () => {
  const read = storage(initial),
    before = await loadMysteryGiftLibrary();
  const next = await replaceMysteryGiftLibrary(before, [
    { ...before.files[0], data: "BAUG" },
  ]);
  expect(next.revision).not.toBe(before.revision);
  expect(read().files[0].data).toBe("BAUG");
  next.files[0].data = "AQID";
  expect(read().files[0].data).toBe("BAUG");
  const current = await loadMysteryGiftLibrary();
  await replaceMysteryGiftLibrary(current, before.files);
  expect(read().files).toEqual(initial.files);
});
it("rejects another tab revision and full content changes with identical revision", async () => {
  let read = storage({ ...initial, revision: "other" });
  await expect(replaceMysteryGiftLibrary(initial, [])).rejects.toThrow(
    "another tab",
  );
  expect(read().revision).toBe("other");
  const changed = structuredClone(initial);
  changed.files[0].data = "BAUG";
  read = storage(changed);
  await expect(replaceMysteryGiftLibrary(initial, [])).rejects.toThrow(
    "another tab",
  );
  expect(read()).toEqual(changed);
});
it("keeps the entire old library when IndexedDB writes fail", async () => {
  const read = storage(initial, true);
  await expect(replaceMysteryGiftLibrary(initial, [])).rejects.toThrow("quota");
  expect(read()).toEqual(initial);
});
it("copies exact file bytes before base64 transport and keeps names/time", async () => {
  const bytes = new Uint8Array([0, 1, 255, 128]);
  const file = {
    name: "original.wa9",
    size: bytes.length,
    lastModified: 42,
    arrayBuffer: async () => bytes.buffer.slice(0),
  } as File;
  const [copy] = await readMysteryGiftFiles([file]);
  expect(copy.fileName).toBe(file.name);
  expect(copy.modified).toBe(42);
  bytes[0] = 100;
  expect(atob(copy.data).charCodeAt(0)).toBe(0);
  expect(Array.from(atob(copy.data), (char) => char.charCodeAt(0))).toEqual([
    0, 1, 255, 128,
  ]);
});
it("rejects corrupt storage, duplicate identities and oversized input atomically", async () => {
  expect(() =>
    validateMysteryGiftLibrary({
      ...initial,
      files: [...initial.files, ...initial.files],
    }),
  ).toThrow();
  expect(() =>
    validateMysteryGiftLibrary({
      ...initial,
      files: [{ ...initial.files[0], data: "invalid!" }],
    }),
  ).toThrow();
  expect(() =>
    validateMysteryGiftLibrary({
      ...initial,
      files: [{ ...initial.files[0], modified: NaN }],
    }),
  ).toThrow();
  await expect(
    readMysteryGiftFiles([{ size: 48 * 1024 + 1 } as File]),
  ).rejects.toThrow("limit");
});
