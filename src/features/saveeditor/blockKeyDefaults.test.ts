import { expect, it, vi } from "vitest";
import { blockKeyDefaults } from "./blockKeyDefaults";
import { blockKeyFileId, loadBlockKeyLibrary } from "./blockKeyLibrary";
vi.mock("./blockKeyLibrary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./blockKeyLibrary")>()),
  loadBlockKeyLibrary: vi.fn(),
}));
it("loads exact format and configured category without leaking another category", async () => {
  const files = [
    ["names", "sav9sv.txt", "first"],
    ["other", "sav9sv.txt", "wrong"],
    ["names", "sav9za_flagwork.txt", "flags"],
  ].map(([directory, name, text]) => ({
    id: blockKeyFileId(directory, name),
    directory,
    name,
    data: new Blob([text]),
    modified: 0,
  }));
  vi.mocked(loadBlockKeyLibrary).mockResolvedValue({ revision: "r", files });
  const json = JSON.stringify({
    advanced: {
      saveExportCheckUnsavedEntity: true,
      pathBlockKeyList: "names",
      hideEvent8Contains: "skip, ",
    },
  });
  expect(await blockKeyDefaults("SAV9SV", false, json)).toEqual({
    names: "first",
    exclusions: ["skip", ""],
    failed: false,
  });
  expect((await blockKeyDefaults("SAV9ZA", true, json)).names).toBe("flags");
  expect((await blockKeyDefaults("SAV8SWSH", false, json)).names).toBe("");
  vi.mocked(loadBlockKeyLibrary).mockRejectedValue(new Error("unavailable"));
  expect(await blockKeyDefaults("SAV9SV", false, json)).toEqual({
    names: "",
    exclusions: ["skip", ""],
    failed: true,
  });
  await expect(blockKeyDefaults("../SAV9SV", false, json)).rejects.toThrow();
});
