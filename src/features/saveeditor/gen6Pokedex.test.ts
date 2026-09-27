import { describe, it, expect } from "vitest";
import { parseDex6Count, validateDex6, dex6Labels } from "./gen6Pokedex";
import { validateDex5, type Dex5Entry } from "./gen5Pokedex";
const entry: Dex5Entry = {
  state: {
    species: 721,
    caught: true,
    seen: [true, false, false, false],
    displayed: [true, false, false, false],
    languages: Array(7).fill(true),
    forms: [[], [], [], []],
    foreign: null,
    countSeen: "0",
    countObtained: "65535",
  },
  name: { zh: "波尔凯尼恩", en: "Volcanion", ja: "ボルケニオン" },
  allowedRegions: [true, false, true, false],
  formChoices: [],
};
describe("Gen6 Pokédex extensions", () => {
  it("retains seven languages for all 721 species without widening Gen5", () => {
    expect(validateDex6(entry.state, entry, true).action).toBe("entry");
    expect(() => validateDex5(entry.state, entry)).toThrow();
  });
  it("matches five-position mask, empty zero and ushort clamping", () => {
    for (const [raw, value] of [
      ["", 0],
      ["0", 0],
      ["65535", 65535],
      ["65536", 65535],
      ["99999", 65535],
      ["12_ 3", 123],
    ] as const)
      expect(parseDex6Count(raw)).toBe(value);
    for (const raw of ["100000", "-1", "1.2", "１", "a"])
      expect(() => parseDex6Count(raw)).toThrow("Pokedex");
  });
  it("requires the matching version-specific fields and preserves original drafts", () => {
    expect(() =>
      validateDex6({ ...entry.state, foreign: true }, entry, true),
    ).toThrow();
    expect(() =>
      validateDex6({ ...entry.state, countSeen: undefined }, entry, true),
    ).toThrow();
    const xy = {
      ...entry,
      state: {
        ...entry.state,
        species: 25,
        foreign: false,
        countSeen: null,
        countObtained: null,
      },
    };
    expect(validateDex6(xy.state, xy, false).action).toBe("entry");
    expect(() =>
      validateDex6({ ...xy.state, foreign: null }, xy, false),
    ).toThrow();
    expect(() => validateDex6(entry.state, entry, false)).toThrow();
    const later = {
      ...xy,
      state: { ...xy.state, species: 721, foreign: null },
    };
    expect(validateDex6(later.state, later, false).action).toBe("entry");
    expect(entry.state.countSeen).toBe("0");
  });
  it("has complete translated count and batch labels", () => {
    for (const lang of ["zh", "ja"] as const)
      expect(Object.keys(dex6Labels[lang]).sort()).toEqual(
        Object.keys(dex6Labels.en).sort(),
      );
  });
});
