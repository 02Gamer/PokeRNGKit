// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  saveLibraryLocations,
  saveLibraryShortcuts,
  consoleLibraryRoots,
  libraryFolderWithin,
} from "./saveLibraryLocations";
import { startupSaveCandidates } from "./saveLibrarySettings";
import type { SaveFolderLocalFile } from "./saveFolderProtocol";
const file = (
  folder: string,
  name = "E.sav",
  extra: Partial<SaveFolderLocalFile> = {},
): SaveFolderLocalFile => ({
  id: folder + name,
  name,
  folder,
  data: new Uint8Array([1]).buffer,
  modified: 1,
  recent: false,
  backup: false,
  remembered: false,
  ...extra,
});
describe("configured save library locations", () => {
  it("uses validated complete setting keys and normalizes only the virtual folder name", () => {
    expect(saveLibraryLocations("")).toEqual({ backup: "bak", extra: [] });
    const root = {
      localResources: { backupPath: "C:\\bak\\" },
      backup: { otherBackupPaths: ["extra/", " ", "SD\\JKSV"] },
    };
    expect(saveLibraryLocations(JSON.stringify(root))).toEqual({
      backup: "C:/bak",
      extra: ["extra", "SD/JKSV"],
    });
    for (const value of [null, [1], Array(8193).fill("x"), ["x".repeat(32768)]])
      expect(() =>
        saveLibraryLocations(
          JSON.stringify({ ...root, backup: { otherBackupPaths: value } }),
        ),
      ).toThrow();
    expect(() => saveLibraryLocations("{}")).toThrow();
  });
  it("keeps exact root boundaries and recognizes all selected console directory forms", () => {
    expect(libraryFolderWithin("bak/sub", "bak/")).toBe(true);
    expect(libraryFolderWithin("baks/sub", "bak")).toBe(false);
    expect(consoleLibraryRoots("SD/3ds/Checkpoint/saves/Game")).toContain(
      "SD/3ds/Checkpoint/saves",
    );
    expect(consoleLibraryRoots("SD/JKSV2/JKSV/Game")).toContain(
      "SD/JKSV2/JKSV",
    );
    expect(consoleLibraryRoots("SD/JKSV2/Game")).toEqual([]);
  });
  it("enables configured shortcuts only for imported content and preserves original bytes", () => {
    const files = [file("extra/sub"), file("SD/3ds/Checkpoint/saves/Game")],
      original = structuredClone(files);
    const paths = saveLibraryShortcuts(files, {
      backup: "bak",
      extra: ["extra", "extra/", "missing"],
    });
    expect(paths.filter((p) => p.path === "extra")).toHaveLength(1);
    expect(paths.find((p) => p.path === "extra")?.available).toBe(true);
    expect(paths.find((p) => p.path === "bak")?.available).toBe(false);
    expect(paths.find((p) => p.path === "missing")?.available).toBe(false);
    expect(
      paths.find((p) => p.path === "SD/3ds/Checkpoint/saves")?.available,
    ).toBe(true);
    expect(files).toEqual(original);
  });
  it("startup discovery uses extra/console paths and retains explicit recent or remembered files", () => {
    const files = [
      file("extra/sub"),
      file("archive"),
      file("SD/JKSV/Game"),
      file("recent", "old.sav", { remembered: true }),
      file("chosen", "new.sav", { recent: true, modified: 2 }),
      file("extra", "main.bak"),
      file("extra", "backup.sav"),
    ];
    const defaults = startupSaveCandidates(files, 1).map((f) => f.folder);
    expect(defaults).toEqual(["chosen", "SD/JKSV/Game", "recent"]);
    expect(
      startupSaveCandidates(files, 1, { backup: "bak", extra: ["extra"] }).map(
        (f) => f.folder,
      ),
    ).toEqual(["chosen", "extra/sub", "SD/JKSV/Game", "recent"]);
    expect(
      startupSaveCandidates(files, 2, { backup: "bak", extra: ["extra"] }),
    ).toEqual([]);
  });
});
