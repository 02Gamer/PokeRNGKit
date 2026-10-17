import { expect, it } from "vitest";
import {
  blockKeyFileName,
  programAdvancedSettings,
} from "./programAdvancedSettings";
const json = (exclude = "", path = "", check = true) =>
  JSON.stringify({
    advanced: {
      saveExportCheckUnsavedEntity: check,
      pathBlockKeyList: path,
      hideEvent8Contains: exclude,
    },
  });
it("matches Core defaults and preserves split-before-trim semantics", () => {
  expect(programAdvancedSettings("")).toEqual({
    checkUnsavedEntity: true,
    directory: "local",
    exclusions: [],
  });
  expect(
    programAdvancedSettings(json(" a,, ,b,", " C:\\names\\ ", false)),
  ).toEqual({
    checkUnsavedEntity: false,
    directory: "C:/names",
    exclusions: ["a", "", "b"],
  });
  for (const input of [
    "{}",
    "{",
    json("x".repeat(32768)),
    json("", "x".repeat(32768)),
  ])
    expect(() => programAdvancedSettings(input)).toThrow();
});
it("uses the concrete save type filename and separate Z-A flag-work table", () => {
  expect(blockKeyFileName("SAV9SV", false)).toBe("SAV9SV.txt");
  expect(blockKeyFileName("SAV9ZA", true)).toBe("SAV9ZA_flagwork.txt");
  for (const format of ["../SAV9ZA", "SAV9ZA.txt", "", "SAV/9ZA"])
    expect(() => blockKeyFileName(format, false)).toThrow();
});
