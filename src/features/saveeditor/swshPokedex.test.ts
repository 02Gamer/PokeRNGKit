import { describe, expect, it } from "vitest";
import {
  dex8Number,
  dex8Shiny,
  validateDex8,
  type Dex8Entry,
} from "./swshPokedex";
const entry = (): Dex8Entry => ({
  species: 892,
  region: 2,
  number: 101,
  primary: true,
  name: { zh: "武道熊师", en: "Urshifu", ja: "ウーラオス" },
  formChoices: [],
  state: {
    index: 501,
    seen: Array.from({ length: 4 }, () => Array<boolean>(64).fill(false)),
    languages: Array<boolean>(9).fill(false),
    caught: false,
    gigantamaxed: false,
    form: 0,
    gender: 0,
    displayGigantamax: false,
    displayShiny: false,
    battled: 0,
    gigantamaxed1: false,
  },
});
describe("Sword and Shield Pokédex", () => {
  it("requires decimal digits and retains only unchanged out-of-range originals", () => {
    for (const value of [
      "",
      "1e2",
      "-1",
      "1.5",
      " 1",
      "1 ",
      "0x10",
      "12345678901",
    ])
      expect(() => dex8Number(value, 100)).toThrow();
    expect(dex8Number("00100", 100)).toBe(100);
    expect(dex8Number("4294967295", 2147483647, 4294967295)).toBe(4294967295);
    expect(() => dex8Number("4294967295", 2147483647)).toThrow();
  });
  it("retains physical addresses, all 64 form bits and independent flags", () => {
    const e = entry();
    e.state.seen[3][63] = true;
    e.state.seen[0][62] = true;
    e.state.gigantamaxed1 = true;
    const edit = validateDex8(e.state, e);
    expect(edit.action).toBe("entry");
    if (edit.action !== "entry") throw Error("entry");
    expect(edit.entry.index).toBe(501);
    expect(edit.entry.caught).toBe(false);
    expect(edit.entry.seen[3][63]).toBe(true);
    edit.entry.seen[3][63] = false;
    expect(e.state.seen[3][63]).toBe(true);
  });
  it("preserves original raw values but rejects introducing values beyond desktop picker limits", () => {
    const e = entry();
    for (const [key, value] of [
      ["form", 101],
      ["gender", 3],
      ["battled", 2147483648],
    ] as const) {
      expect(() => validateDex8({ ...e.state, [key]: value }, e)).toThrow();
      const unusual = { ...e, state: { ...e.state, [key]: value } };
      expect(() => validateDex8(unusual.state, unusual)).not.toThrow();
    }
    expect(() =>
      validateDex8(
        { ...e.state, form: 100, gender: 2, battled: 2147483647 },
        e,
      ),
    ).not.toThrow();
  });
  it("rejects cross-record drafts, incomplete arrays and Urshifu-only field misuse", () => {
    const e = entry();
    for (const state of [
      { ...e.state, index: 500 },
      { ...e.state, seen: [[]] },
      { ...e.state, languages: [] },
      { ...e.state, gigantamaxed1: null },
      { ...e.state, form: NaN },
      { ...e.state, battled: -1 },
      { ...e.state, gender: 1.5 },
    ])
      expect(() => validateDex8(state, e)).toThrow();
    const ordinary = { ...e, state: { ...e.state, gigantamaxed1: null } };
    expect(() =>
      validateDex8({ ...ordinary.state, gigantamaxed1: false }, ordinary),
    ).toThrow();
  });
  it("offers shiny only for the desktop Shift-modified actions", () => {
    for (const action of ["give", "seen", "caught", "complete"] as const)
      expect(dex8Shiny(action)).toBe(true);
    for (const action of ["clear", "uncaught", "counts"] as const)
      expect(dex8Shiny(action)).toBe(false);
  });
});
