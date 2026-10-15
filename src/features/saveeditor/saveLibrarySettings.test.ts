// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  limitRecentSaves,
  saveLibrarySettings,
  startupSaveCandidates,
} from "./saveLibrarySettings";
import type { SaveFolderLocalFile } from "./saveFolderProtocol";
const file = (
  id: string,
  modified: number,
  extra: Partial<SaveFolderLocalFile> = {},
): SaveFolderLocalFile => ({
  id,
  name: `${id}.sav`,
  folder: "selected",
  data: new Uint8Array([1]).buffer,
  modified,
  recent: true,
  backup: false,
  remembered: true,
  ...extra,
});
describe("browser save library settings", () => {
  it("uses source defaults and validates the effective policy", () => {
    expect(saveLibrarySettings("")).toEqual({
      backup: true,
      folder: "bak",
      recentMax: 10,
      startup: 1,
    });
    const root = {
      backup: { bakEnabled: false },
      localResources: { backupPath: "C:\\bak" },
      startup: { recentlyLoadedMaxCount: 1000, autoLoadSaveOnStartup: 2 },
    };
    expect(saveLibrarySettings(JSON.stringify(root))).toEqual({
      backup: false,
      folder: "C:\\bak",
      recentMax: 1000,
      startup: 2,
    });
    for (const value of [0, 1001, 1.5, "10", null]) {
      expect(() =>
        saveLibrarySettings(
          JSON.stringify({
            ...root,
            startup: { ...root.startup, recentlyLoadedMaxCount: value },
          }),
        ),
      ).toThrow();
    }
    expect(() => saveLibrarySettings("{}")).toThrow();
  });
  it("trims only recent flags, preserving all original and backup bytes", () => {
    const files = [
      file("a", 1),
      file("bak", 2, { recent: false, backup: true }),
      file("b", 3),
      file("c", 4),
    ];
    const next = limitRecentSaves(files, 2);
    expect(next.map((f) => f.recent)).toEqual([true, false, true, false]);
    expect(next.map((f) => f.data)).toEqual(files.map((f) => f.data));
    expect(files[3].recent).toBe(true);
    expect(() => limitRecentSaves(files, 0)).toThrow();
  });
  it("keeps MRU separate from newest-write startup detection and ignores .bak", () => {
    const files = [
      file("first", 10),
      file("new", 30, { remembered: false }),
      file("old", 20),
      file("backup", 40, { name: "main.bak", backup: true }),
    ];
    expect(startupSaveCandidates(files, 0)).toEqual([]);
    expect(startupSaveCandidates(files, 1).map((f) => f.id)).toEqual([
      "new",
      "old",
      "first",
    ]);
    expect(startupSaveCandidates(files, 2).map((f) => f.id)).toEqual([
      "first",
      "old",
      "backup",
    ]);
    expect(files.map((f) => f.id)).toEqual(["first", "new", "old", "backup"]);
  });
  it("matches the source ordinal backup base-name and extension exclusions", () => {
    const names = [
      "backup",
      "backup.sav",
      "backup.",
      "main.bak",
      "main.BAK",
      "Backup",
      "backup.extra.sav",
      ".backup",
    ];
    expect(
      startupSaveCandidates(
        names.map((name, i) => file(String(i), i, { name })),
        1,
      ).map((f) => f.name),
    ).toEqual([".backup", "backup.extra.sav", "Backup", "main.BAK"]);
  });
});
