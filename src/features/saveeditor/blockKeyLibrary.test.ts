import { afterEach, expect, it, vi } from "vitest";
import {
  blockKeyDirectory,
  blockKeyFileId,
  findBlockKeyFile,
  loadBlockKeyLibrary,
  mergeBlockKeyFiles,
  readBlockKeyFiles,
  replaceBlockKeyLibrary,
  subscribeBlockKeyLibrary,
  validateBlockKeyLibrary,
  type BlockKeyLibrary,
} from "./blockKeyLibrary";
afterEach(() => vi.unstubAllGlobals());
function names() {
  return new TextEncoder().encode("00000001\tExample\n");
}
function file(name = "SAV9SV.txt", directory = "sounds") {
  return {
    id: blockKeyFileId(directory, name),
    name,
    directory,
    data: new Blob([names()], { type: "text/plain" }),
    modified: 1,
  };
}
function database(initial: BlockKeyLibrary, quota = false) {
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
        put: (value: BlockKeyLibrary) => {
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
  const first = new File([names()], "SAV9SV.txt", { lastModified: 1 }),
    nested = new File([names()], "SAV9ZA_flagwork.txt", { lastModified: 2 });
  Object.defineProperty(first, "webkitRelativePath", {
    value: "owner/SAV9SV.txt",
  });
  Object.defineProperty(nested, "webkitRelativePath", {
    value: "owner/forms/SAV9ZA_flagwork.txt",
  });
  const files = await readBlockKeyFiles(
    [first, nested, new File(["notes"], "notes.bin")],
    "sounds",
    true,
  );
  expect(files.map((value) => value.directory)).toEqual([
    "sounds",
    "sounds/forms",
  ]);
  const snapshot = { revision: "a", files };
  expect(
    findBlockKeyFile(snapshot, "sounds", ["SAV9ZA_flagwork.txt", "SAV9SV.txt"])
      ?.name,
  ).toBe("sav9sv.txt");
  expect(
    findBlockKeyFile(snapshot, "sounds/forms", [
      "SAV9ZA_flagwork.txt",
      "SAV9ZA.txt",
    ])?.name,
  ).toBe("sav9za_flagwork.txt");
});
it("keeps category defaults, filename priority and explicit duplicate replacement", () => {
  expect(blockKeyDirectory("")).toBe("local");
  expect(blockKeyDirectory('{"advanced":{"pathBlockKeyList":""}}')).toBe(
    "local",
  );
  const snapshot = {
    revision: "a",
    files: [file("SAV9ZA.txt"), file("SAV9ZA_flagwork.txt")],
  };
  expect(
    findBlockKeyFile(snapshot, "sounds", ["SAV9ZA_flagwork.txt", "SAV9ZA.txt"])
      ?.name,
  ).toBe("SAV9ZA_flagwork.txt");
  expect(findBlockKeyFile(snapshot, "sounds2", ["SAV9ZA.txt"])).toBeUndefined();
  expect(() => mergeBlockKeyFiles(snapshot, [file("SAV9ZA.txt")])).toThrow(
    "already exists",
  );
  expect(() =>
    validateBlockKeyLibrary({
      revision: "a",
      files: [{ ...file(), name: "../SAV9SV.txt" }],
    }),
  ).toThrow();
});
it("persists immutable blobs, announces successful writes, and refuses stale snapshots", async () => {
  const stored = database({ revision: "", files: [] });
  const before = await loadBlockKeyLibrary(true);
  const changed = vi.fn(),
    unsubscribe = subscribeBlockKeyLibrary(changed);
  try {
    const owner = {},
      next = await replaceBlockKeyLibrary(before, [file()], owner);
    expect(changed).toHaveBeenCalledWith(owner);
    expect(stored().revision).toBe(next.revision);
    expect(Object.isFrozen(next.files[0])).toBe(true);
    expect(await next.files[0].data.arrayBuffer()).toEqual(names().buffer);
    await expect(replaceBlockKeyLibrary(before, [])).rejects.toThrow(
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
  const snapshot = await loadBlockKeyLibrary(true);
  await expect(replaceBlockKeyLibrary(snapshot, [])).rejects.toThrow("quota");
  expect(stored().revision).toBe("one");
  expect(stored().files).toHaveLength(1);
});
it("accepts an empty name table and rejects traversal, oversized files and duplicate imports", async () => {
  const empty = await readBlockKeyFiles([new File([], "SAV9SV.txt")], "names");
  expect(empty).toHaveLength(1);
  expect(await empty[0].data.text()).toBe("");
  const traversal = new File([names()], "SAV9SV.txt");
  Object.defineProperty(traversal, "webkitRelativePath", {
    value: "picked/../SAV9SV.txt",
  });
  await expect(readBlockKeyFiles([traversal], "names", true)).rejects.toThrow(
    "folder",
  );
  await expect(
    readBlockKeyFiles(
      [new File([new Uint8Array(4 * 1024 * 1024 + 1)], "SAV9SV.txt")],
      "names",
    ),
  ).rejects.toThrow("size limit");
  await expect(
    readBlockKeyFiles(
      [new File([], "SAV9SV.txt"), new File([], "sav9sv.TXT")],
      "names",
    ),
  ).rejects.toThrow();
});
