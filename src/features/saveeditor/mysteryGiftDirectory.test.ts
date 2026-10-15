// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  mysteryGiftDirectory,
  mysteryGiftDirectoryFiles,
  mysteryGiftDirectorySources,
  attachMysteryGiftDirectory,
  removeMysteryGiftDirectoryFile,
} from "./mysteryGiftDirectory";
import type { MysteryGiftLocalFile } from "./mysteryGiftLibrary";
const file: MysteryGiftLocalFile = {
  id: "old",
  fileName: "one.wc6",
  data: "AQID",
  modified: 1,
};
describe("mystery gift directory ownership", () => {
  it("interprets legacy data as mgdb and keeps exact directory boundaries", () => {
    const files = [
        file,
        { ...file, id: "new", directory: "custom" },
        { ...file, id: "child", directory: "mgdb/team" },
      ],
      before = structuredClone(files);
    expect(mysteryGiftDirectory("")).toBe("mgdb");
    expect(mysteryGiftDirectoryFiles(files, "mgdb").map((f) => f.id)).toEqual([
      "old",
      "child",
    ]);
    expect(mysteryGiftDirectoryFiles(files, "custom").map((f) => f.id)).toEqual(
      ["new"],
    );
    expect(mysteryGiftDirectoryFiles(files, "mgdb2")).toEqual([]);
    expect(files).toEqual(before);
  });
  it("reads and validates the active localized resource setting", () => {
    expect(
      mysteryGiftDirectory(
        JSON.stringify({ localResources: { mgDatabasePath: "C:\\mgdb\\" } }),
      ),
    ).toBe("C:/mgdb");
    expect(
      mysteryGiftDirectory(
        JSON.stringify({ localResources: { mgDatabasePath: " " } }),
      ),
    ).toBe("local");
    expect(() => mysteryGiftDirectory("{}")).toThrow();
    expect(() =>
      mysteryGiftDirectory(
        JSON.stringify({
          localResources: { mgDatabasePath: "x".repeat(32768) },
        }),
      ),
    ).toThrow();
  });
  it("stamps only newly imported records and sends directory names without changing gift bytes", () => {
    const added = attachMysteryGiftDirectory([file], "custom/");
    expect(added[0]).toEqual({ ...file, directory: "custom" });
    expect(file.directory).toBeUndefined();
    expect(mysteryGiftDirectorySources([file, ...added], "custom")).toEqual([
      { fileName: "custom/one.wc6", data: "AQID" },
    ]);
    expect(() =>
      mysteryGiftDirectorySources(
        [{ ...file, directory: "x".repeat(4096) }],
        "x".repeat(4096),
      ),
    ).toThrow("limit");
  });
  it("removes only the selected directory's record and retains other categories for undo", () => {
    const files = [file, { ...file, id: "custom", directory: "custom" }],
      before = structuredClone(files);
    expect(removeMysteryGiftDirectoryFile(files, "custom", "custom")).toEqual([
      file,
    ]);
    expect(() =>
      removeMysteryGiftDirectoryFile(files, "old", "custom"),
    ).toThrow("directory");
    expect(files).toEqual(before);
  });
});
