import { afterEach, expect, it, vi } from "vitest";
import {
  cryDirectory,
  cryFileId,
  findCryFile,
  loadCryLibrary,
  mergeCryFiles,
  readCryFiles,
  replaceCryLibrary,
  subscribeCryLibrary,
  validateCryLibrary,
  type CryLibrary,
} from "./cryLibrary";
afterEach(() => vi.unstubAllGlobals());
function wav() {
  const data = new Uint8Array(44);
  data.set([82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69]);
  return data;
}
function file(name = "25.wav", directory = "sounds") {
  return {
    id: cryFileId(directory, name),
    name,
    directory,
    data: new Blob([wav()], { type: "audio/wav" }),
    modified: 1,
  };
}
function database(initial: CryLibrary, quota = false) {
  let stored = structuredClone(initial);
  const db = {
    close: vi.fn(),
    objectStoreNames: { contains: () => true },
  } as unknown as IDBDatabase;
  Object.assign(db, {
    transaction: () => {
      const tx = {} as IDBTransaction;
      let next = structuredClone(stored),
        aborted = false;
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
        put: (value: CryLibrary) => {
          if (quota) throw new Error("quota");
          next = structuredClone(value);
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
it("imports a picked root and preserves subcategories without scanning other folders", async () => {
  const first = new File([wav()], "25.wav", { lastModified: 1 }),
    nested = new File([wav()], "892-1.wav", { lastModified: 2 });
  Object.defineProperty(first, "webkitRelativePath", { value: "owner/25.wav" });
  Object.defineProperty(nested, "webkitRelativePath", {
    value: "owner/forms/892-1.wav",
  });
  const files = await readCryFiles(
    [first, nested, new File(["notes"], "notes.txt")],
    "sounds",
    true,
  );
  expect(files.map((value) => value.directory)).toEqual([
    "sounds",
    "sounds/forms",
  ]);
  const snapshot = { revision: "a", files };
  expect(findCryFile(snapshot, "sounds", ["892-1.wav", "25.wav"])?.name).toBe(
    "25.wav",
  );
  expect(
    findCryFile(snapshot, "sounds/forms", ["892-1.wav", "892.wav"])?.name,
  ).toBe("892-1.wav");
  await expect(
    readCryFiles([new File(["invalid"], "1.wav")], "sounds"),
  ).rejects.toThrow("Invalid WAV");
});
it("keeps source folder defaults, form priority and explicit duplicate replacement", () => {
  expect(cryDirectory("")).toBe("sounds");
  expect(cryDirectory('{"localResources":{"soundPath":""}}')).toBe("local");
  const snapshot = {
    revision: "a",
    files: [file("892.wav"), file("892-1.wav")],
  };
  expect(findCryFile(snapshot, "sounds", ["892-1.wav", "892.wav"])?.name).toBe(
    "892-1.wav",
  );
  expect(findCryFile(snapshot, "sounds2", ["892.wav"])).toBeUndefined();
  expect(() => mergeCryFiles(snapshot, [file("892.wav")])).toThrow(
    "already exists",
  );
  expect(() =>
    validateCryLibrary({
      revision: "a",
      files: [{ ...file(), name: "../25.wav" }],
    }),
  ).toThrow();
});
it("persists immutable blobs, announces successful writes, and refuses stale snapshots", async () => {
  const stored = database({ revision: "", files: [] });
  const before = await loadCryLibrary(true);
  const changed = vi.fn(),
    unsubscribe = subscribeCryLibrary(changed);
  try {
    const owner = {},
      next = await replaceCryLibrary(before, [file()], owner);
    expect(changed).toHaveBeenCalledWith(owner);
    expect(stored().revision).toBe(next.revision);
    expect(Object.isFrozen(next.files[0])).toBe(true);
    expect(await next.files[0].data.arrayBuffer()).toEqual(wav().buffer);
    await expect(replaceCryLibrary(before, [])).rejects.toThrow(
      "changed in another tab",
    );
    expect(stored().files).toHaveLength(1);
  } finally {
    unsubscribe();
  }
});
it("preserves existing files when persistence fails", async () => {
  const initial = { revision: "one", files: [file()] };
  const stored = database(initial, true);
  const snapshot = await loadCryLibrary(true);
  await expect(replaceCryLibrary(snapshot, [])).rejects.toThrow("quota");
  expect(stored().revision).toBe("one");
  expect(stored().files).toHaveLength(1);
});
