// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  databaseLibraryPolicy,
  databaseLibrarySources,
  applyOwnedDatabaseDelta,
  type DatabaseLibraryPolicy,
} from "./databaseLibrarySources";
import type { SaveFolderLocalFile } from "./saveFolderProtocol";
import type { DatabaseLocalFile } from "./databaseRepository";
import { databasePacket } from "./databaseProtocol";
const save = (folder: string, name: string): SaveFolderLocalFile => ({
  id: folder + name,
  name,
  folder,
  data: new Uint8Array([1, 2, 3]).buffer,
  modified: 123,
  recent: false,
  backup: false,
  remembered: false,
});
const source = [
  save("bak", "root.sav"),
  save("bak", "main.bak"),
  save("bak", "backup"),
  save("bak/sub", "deep.sav"),
  save("extra", "root.sav"),
  save("extra", "main.bak"),
  save("extra", "backup.sav"),
  save("extra/sub", "deep.sav"),
  save("baks", "sibling.sav"),
];
const base: DatabaseLibraryPolicy = {
  backups: true,
  extra: true,
  deep: true,
  backupFolder: "bak",
  extraFolders: ["extra"],
};
const owned: DatabaseLocalFile = {
  id: "owned",
  name: "one.pk3",
  data: new Uint8Array([7]).buffer,
  entityFile: true,
  modified: 100,
};
describe("save library database sources", () => {
  for (let flags = 0; flags < 8; flags++)
    it(`applies source backup/extra/depth options ${flags}`, () => {
      const policy = {
        ...base,
        backups: Boolean(flags & 1),
        extra: Boolean(flags & 2),
        deep: Boolean(flags & 4),
      };
      const expected = [
        ...(policy.extra
          ? ["extra/root.sav", ...(policy.deep ? ["extra/sub/deep.sav"] : [])]
          : []),
        ...(policy.backups
          ? [
              "bak/root.sav",
              "bak/main.bak",
              "bak/backup",
              ...(policy.deep ? ["bak/sub/deep.sav"] : []),
            ]
          : []),
      ];
      expect(
        databaseLibrarySources(source, [owned], policy).map(
          (file) => file.name,
        ),
      ).toEqual(expected);
    });
  it("retains repeated and overlapping source scans with independent identities", () => {
    const files = databaseLibrarySources(source, [], {
      ...base,
      extraFolders: ["bak", "bak/sub", "bak"],
    });
    expect(files.filter((file) => file.name === "bak/root.sav")).toHaveLength(
      3,
    );
    expect(
      files.filter((file) => file.name === "bak/sub/deep.sav"),
    ).toHaveLength(4);
    expect(files.filter((file) => file.name === "bak/main.bak")).toHaveLength(
      1,
    );
    expect(new Set(files.map((file) => file.id)).size).toBe(files.length);
  });
  it("normalizes folder separators and boundaries without accessing an arbitrary path", () => {
    const files = databaseLibrarySources(
      [
        save("C:\\saves", "E.sav"),
        save("C:/saves/sub", "E.sav"),
        save("C:/saves2", "E.sav"),
      ],
      [],
      { ...base, extra: false, backupFolder: "C:/saves/" },
    );
    expect(files).toHaveLength(2);
    expect(
      databaseLibrarySources(source, [], {
        ...base,
        extra: false,
        backupFolder: "missing",
      }),
    ).toEqual([]);
  });
  it("copies library bytes, keeps owned sources separate, and produces a transferable packet", () => {
    const initial = structuredClone(source);
    const sources = databaseLibrarySources(
      source,
      [{ ...owned, id: "library:0" }],
      base,
    );
    expect(sources[0].id).not.toBe("library:0");
    expect(
      sources.every((file) => !file.entityFile && file.id.length <= 128),
    ).toBe(true);
    const packet = databasePacket([owned, ...sources]);
    packet.bytes.fill(0);
    new Uint8Array(sources[0].data)[0] = 9;
    expect(source).toEqual(initial);
    expect(new Uint8Array(owned.data)[0]).toBe(7);
    const next = applyOwnedDatabaseDelta([owned], sources, {
      removed: [owned.id],
      added: [],
      filesHash: "hash",
    });
    expect(next).toEqual([]);
    expect(sources.length).toBeGreaterThan(0);
  });
  it("refuses changes targeting library snapshots before any storage replacement", () => {
    const sources = databaseLibrarySources(source, [owned], base);
    const original = structuredClone(sources);
    expect(() =>
      applyOwnedDatabaseDelta([owned], sources, {
        removed: [sources[0].id],
        added: [],
        filesHash: "hash",
      }),
    ).toThrow("snapshots");
    expect(() =>
      applyOwnedDatabaseDelta([owned], sources, {
        removed: [],
        added: [{ ...owned, id: sources[0].id }],
        filesHash: "hash",
      }),
    ).toThrow("snapshots");
    expect(sources).toEqual(original);
  });
  it("rejects combined counts and bytes before truncating or deleting files", () => {
    const full = Array.from({ length: 1024 }, (_, i) => ({
      ...owned,
      id: String(i),
    }));
    expect(() => databaseLibrarySources(source, full, base)).toThrow("limit");
    const data = new ArrayBuffer(64 * 1024 * 1024);
    expect(() =>
      databaseLibrarySources(
        source,
        [
          { ...owned, data },
          { ...owned, id: "second", data },
        ],
        base,
      ),
    ).toThrow("limit");
    expect(
      databaseLibrarySources(source, full, {
        ...base,
        extra: false,
        backups: false,
      }),
    ).toEqual([]);
    expect(() =>
      databaseLibrarySources([source[0]], [], {
        ...base,
        backups: false,
        extraFolders: Array(1025).fill("bak"),
      }),
    ).toThrow("limit");
    expect(full).toHaveLength(1024);
  });
  it("reads complete setting keys with source defaults and existing codec limits", () => {
    expect(databaseLibraryPolicy("")).toEqual({ ...base, extraFolders: [] });
    const root = {
      entityDb: {
        searchBackups: false,
        searchExtraSaves: true,
        searchExtraSavesDeep: false,
      },
      localResources: { backupPath: "my backups" },
      backup: { otherBackupPaths: ["recent", "selected"] },
    };
    expect(databaseLibraryPolicy(JSON.stringify(root))).toEqual({
      backups: false,
      extra: true,
      deep: false,
      backupFolder: "my backups",
      extraFolders: ["recent", "selected"],
    });
    for (const paths of [null, [1], Array(8193).fill("a"), ["a".repeat(32768)]])
      expect(() =>
        databaseLibraryPolicy(
          JSON.stringify({ ...root, backup: { otherBackupPaths: paths } }),
        ),
      ).toThrow();
    expect(() => databaseLibraryPolicy("{}")).toThrow();
  });
});
