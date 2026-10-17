// SPDX-License-Identifier: GPL-3.0-or-later
import { afterEach, expect, it, vi } from "vitest";
import {
  trainerDirectory,
  trainerLibraryFiles,
  trainerFilePayload,
  readTrainerFiles,
  mergeTrainerFiles,
  loadEncounterTrainerFiles,
} from "./trainerLibrary";
import {
  loadDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
import { readSaveSettings } from "./settingsRepository";
vi.mock("./databaseRepository", async (original) => ({
  ...(await original<typeof import("./databaseRepository")>()),
  loadDatabaseFiles: vi.fn(),
}));
vi.mock("./settingsRepository", async (original) => ({
  ...(await original<typeof import("./settingsRepository")>()),
  readSaveSettings: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());
const file = (
  directory = "trainers",
  name = "owner.pk3",
  id = "one",
): DatabaseLocalFile => ({
  id,
  directory,
  name,
  data: new Uint8Array([1, 2, 3]).buffer,
  entityFile: true,
  modified: 1,
});
it("matches configured trainer categories recursively without borrowing save files or similar prefixes", () => {
  expect(trainerDirectory("")).toBe("trainers");
  expect(
    trainerDirectory(
      JSON.stringify({ localResources: { trainerPath: " C:\\names\\ " } }),
    ),
  ).toBe("C:/names");
  expect(trainerDirectory('{"localResources":{"trainerPath":""}}')).toBe(
    "local",
  );
  for (const json of [
    "{}",
    "{",
    JSON.stringify({ localResources: { trainerPath: "x".repeat(32768) } }),
  ])
    expect(() => trainerDirectory(json)).toThrow();
  const files = [
    file(),
    file("trainers/sub", "owner.pk6", "two"),
    file("trainers2", "other.pk3", "three"),
    {
      ...file("trainers", "E.sav", "four"),
      entityFile: false,
      directory: undefined,
    },
  ];
  expect(trainerLibraryFiles(files, "trainers").map((f) => f.id)).toEqual([
    "one",
    "two",
  ]);
  expect(trainerFilePayload(files, "trainers")).toEqual([
    { fileName: "owner.pk3", data: "AQID" },
    { fileName: "owner.pk6", data: "AQID" },
  ]);
  expect(files[0].data.byteLength).toBe(3);
});
it("imports picked bytes into the configured root and preserves nested folders with explicit replacement", async () => {
  const picked = new File([new Uint8Array([5, 6])], "source.bin", {
    lastModified: 7,
  });
  Object.defineProperty(picked, "webkitRelativePath", {
    value: "picked/sub/source.bin",
  });
  const added = await readTrainerFiles([picked], "trainers", true, () => true);
  expect(added?.[0]).toMatchObject({
    name: "source.bin",
    directory: "trainers/sub",
    entityFile: true,
    useFileFormat: true,
    modified: 7,
  });
  expect(new Uint8Array(added![0].data)).toEqual(new Uint8Array([5, 6]));
  const before = [file("other")];
  expect(mergeTrainerFiles(before, added!)).toHaveLength(2);
  expect(before).toHaveLength(1);
  expect(() =>
    mergeTrainerFiles([file()], [file("trainers", "OWNER.PK3", "two")]),
  ).toThrow("Remove");
});
it("rejects traversal and over-limit selections while cancellation and irrelevant huge files preserve the library", async () => {
  const bad = new File(["x"], "source.pk3");
  Object.defineProperty(bad, "webkitRelativePath", {
    value: "picked/../source.pk3",
  });
  await expect(
    readTrainerFiles([bad], "trainers", true, () => true),
  ).rejects.toThrow("folder");
  expect(
    await readTrainerFiles(
      [new File(["x"], "p.pk3")],
      "trainers",
      false,
      () => false,
    ),
  ).toBeUndefined();
  const large = new File([new Uint8Array(1024 * 1024 + 1)], "unrelated.zip");
  expect(
    await readTrainerFiles(
      [large, new File([], "empty")],
      "trainers",
      false,
      () => true,
    ),
  ).toEqual([]);
  await expect(
    readTrainerFiles(
      Array.from({ length: 1025 }, () => new File(["x"], "p.pk3")),
      "trainers",
      false,
      () => true,
    ),
  ).rejects.toThrow("many");
  const huge = { ...file(), data: new ArrayBuffer(1024 * 1024) };
  expect(() =>
    trainerFilePayload(
      [huge, { ...huge, id: "two" }, { ...huge, id: "three" }],
      "trainers",
    ),
  ).toThrow("size limit");
});
it("loads the saved category, exposes storage failure and rejects a settings change during the read", async () => {
  vi.mocked(readSaveSettings).mockReturnValue(undefined);
  vi.mocked(loadDatabaseFiles).mockResolvedValue([file()]);
  expect(await loadEncounterTrainerFiles()).toEqual({
    files: [{ fileName: "owner.pk3", data: "AQID" }],
    failed: false,
  });
  vi.mocked(loadDatabaseFiles).mockRejectedValue(new Error("quota"));
  expect(await loadEncounterTrainerFiles()).toEqual({
    files: [],
    failed: true,
  });
  vi.mocked(loadDatabaseFiles).mockImplementation(async () => {
    vi.mocked(readSaveSettings).mockReturnValue({
      revision: "changed",
      version: 1,
      json: JSON.stringify({ localResources: { trainerPath: "other" } }),
    });
    return [file()];
  });
  await expect(loadEncounterTrainerFiles()).rejects.toThrow("settings changed");
});
