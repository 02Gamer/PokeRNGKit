import { describe, expect, it } from "vitest";
import { validateFood, supportsFood, type SaveFoodCatalog } from "./saveFood";
const puffs: SaveFoodCatalog = {
  kind: "puffs",
  values: [255, 1, 26],
  count: -1,
  names: [],
};
const beans: SaveFoodCatalog = {
  kind: "beans",
  values: [0, 255],
  count: null,
  names: [],
};
describe("food editing", () => {
  it("preserves untouched abnormal puffs and rejects new ones", () => {
    expect(validateFood(puffs, ["255", "2", "26"], "-1")).toEqual({
      action: "edit",
      values: [255, 2, 26],
      count: -1,
    });
    expect(() => validateFood(puffs, ["255", "255", "26"], "5")).toThrow();
    expect(() => validateFood(puffs, ["255", "2", "26"], "101")).toThrow();
    expect(() => validateFood(puffs, ["255", "2", "26"], "-2")).toThrow();
    expect(validateFood(puffs, ["0", "1", "26"], "100").count).toBe(100);
  });
  it("validates integer bean counts without adding a puff count", () => {
    expect(validateFood(beans, ["255", "0"], "0")).toEqual({
      action: "edit",
      values: [255, 0],
    });
    for (const value of ["", "-1", "256", "1.5", " 1", "1e2", "NaN"])
      expect(() => validateFood(beans, [value, "0"], "0")).toThrow();
    expect(() => validateFood(beans, ["0"], "0")).toThrow();
  });
  it("only exposes games with the corresponding Core blocks", () => {
    for (const format of ["SAV6XY", "SAV6AO", "SAV7SM", "SAV7USUM"])
      expect(supportsFood(format)).toBe(true);
    for (const format of ["SAV6AODemo", "SAV7b", "SAV8BS", "SAV3E"])
      expect(supportsFood(format)).toBe(false);
  });
});
