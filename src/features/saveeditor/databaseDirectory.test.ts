// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  databaseDirectory,
  databaseDirectoryFiles,
  databaseSourceName,
  databaseDestinationName,
  attachDatabaseDirectory,
  directoryDatabaseDelta,
} from "./databaseDirectory";
import { databasePacket, applyDatabaseDelta } from "./databaseProtocol";
import {
  validateDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
const legacy: DatabaseLocalFile = {
  id: "old",
  name: "old.pk3",
  data: new Uint8Array([1, 2]).buffer,
  entityFile: true,
  modified: 1,
};
const custom = { ...legacy, id: "custom", directory: "custom" };
const child = { ...legacy, id: "child", directory: "pkmdb/team" };
const otherSave = { ...legacy, id: "save", name: "E.sav", entityFile: false };
describe("local database directories", () => {
  it("keeps legacy files in the default directory without changing records or buffers", () => {
    const files = [legacy, custom, child, otherSave],
      original = structuredClone(files);
    expect(databaseDirectory("")).toBe("pkmdb");
    expect(databaseDirectoryFiles(files, "pkmdb").map((f) => f.id)).toEqual([
      "old",
      "child",
      "save",
    ]);
    expect(databaseDirectoryFiles(files, "custom").map((f) => f.id)).toEqual([
      "custom",
      "save",
    ]);
    expect(databaseDirectoryFiles(files, "pkmdb2").map((f) => f.id)).toEqual([
      "save",
    ]);
    expect(files).toEqual(original);
    expect(legacy.directory).toBeUndefined();
  });
  it("reads the actual resource setting and normalizes the browser directory name", () => {
    expect(
      databaseDirectory(
        JSON.stringify({ localResources: { databasePath: "C:\\pkm\\" } }),
      ),
    ).toBe("C:/pkm");
    expect(
      databaseDirectory(
        JSON.stringify({ localResources: { databasePath: " " } }),
      ),
    ).toBe("local");
    expect(() => databaseDirectory("{}")).toThrow();
    expect(() =>
      databaseDirectory(
        JSON.stringify({ localResources: { databasePath: "x".repeat(32768) } }),
      ),
    ).toThrow();
  });
  it("binds imports to the active directory and includes it in native source identities", () => {
    const added = attachDatabaseDirectory([legacy, otherSave], "custom/");
    expect(added[0].directory).toBe("custom");
    expect(added[1].directory).toBeUndefined();
    expect(databaseSourceName(legacy)).toBe("pkmdb/old.pk3");
    expect(databaseSourceName(added[0])).toBe("custom/old.pk3");
    const packet = databasePacket(added);
    expect(packet.descriptors.map((f) => f.name)).toEqual([
      "custom/old.pk3",
      "E.sav",
    ]);
    expect(packet.bytes).toEqual(new Uint8Array([1, 2, 1, 2]));
    expect(() => databaseDestinationName("x".repeat(4096), "custom")).toThrow(
      "limit",
    );
    expect(() =>
      databasePacket([{ ...legacy, directory: "x".repeat(4096) }]),
    ).toThrow("limit");
  });
  it("applies native changes only to the selected directory and preserves inactive data", () => {
    const files = [legacy, custom, child, otherSave],
      original = structuredClone(files);
    const delta = directoryDatabaseDelta(
      files,
      [],
      {
        removed: ["custom"],
        added: [{ ...legacy, id: "new", name: "custom/sub/new.pk3" }],
        filesHash: "native",
      },
      "custom",
    );
    const next = applyDatabaseDelta(files, delta);
    expect(next.find((f) => f.id === "new")).toMatchObject({
      name: "sub/new.pk3",
      directory: "custom",
    });
    expect(next.filter((f) => f.id !== "new")).toEqual([
      legacy,
      child,
      otherSave,
    ]);
    expect(
      databasePacket(databaseDirectoryFiles(next, "custom")).descriptors.map(
        (f) => f.name,
      ),
    ).toEqual(["E.sav", "custom/sub/new.pk3"]);
    expect(files).toEqual(original);
  });
  it("refuses inactive or library removals and mismatched addition ownership", () => {
    for (const delta of [
      { removed: ["old"], added: [], filesHash: "x" },
      {
        removed: [],
        added: [{ ...legacy, id: "new", name: "pkmdb/new.pk3" }],
        filesHash: "x",
      },
      {
        removed: [],
        added: [
          { ...legacy, id: "new", name: "custom/new.pk3", directory: "custom" },
        ],
        filesHash: "x",
      },
      {
        removed: [],
        added: [{ ...legacy, id: "new", name: "custom/", entityFile: false }],
        filesHash: "x",
      },
    ])
      expect(() =>
        directoryDatabaseDelta([legacy, custom], [], delta, "custom"),
      ).toThrow();
    expect(() =>
      directoryDatabaseDelta(
        [custom],
        [{ ...otherSave, id: "library" }],
        { removed: ["library"], added: [], filesHash: "x" },
        "custom",
      ),
    ).toThrow();
  });
  it("validates persisted directory metadata independently of legacy records", () => {
    for (const directory of [null, 0, "", "x".repeat(32768)])
      expect(() =>
        validateDatabaseFiles([{ ...legacy, directory } as DatabaseLocalFile]),
      ).toThrow();
    expect(() =>
      validateDatabaseFiles([{ ...otherSave, directory: "custom" }]),
    ).toThrow();
    expect(() => validateDatabaseFiles([legacy, custom])).not.toThrow();
  });
});
