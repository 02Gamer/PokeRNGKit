import { describe, it, expect } from "vitest";
import {
  toggleDex5Region,
  toggleDex5Form,
  validateDex5,
  dex5Shiny,
  dex5Languages,
  type Dex5Entry,
} from "./gen5Pokedex";
import { dex5Labels } from "./gen5PokedexLabels";
const entry: Dex5Entry = {
  state: {
    species: 25,
    caught: true,
    seen: [false, false, false, false],
    displayed: [false, false, false, false],
    languages: Array(7).fill(false),
    forms: Array.from({ length: 4 }, () => [false, false]),
  },
  name: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" },
  allowedRegions: [true, true, true, true],
  formChoices: [
    { zh: "甲", en: "A", ja: "A" },
    { zh: "乙", en: "B", ja: "B" },
  ],
};
describe("Gen5 Pokédex", () => {
  it("selects one displayed region and ensures it has been seen", () => {
    const a = toggleDex5Region(entry.state, 2, true, true);
    expect(a.displayed).toEqual([false, false, true, false]);
    expect(a.seen[2]).toBe(true);
    const b = toggleDex5Region(a, 1, true, true);
    expect(b.displayed).toEqual([false, true, false, false]);
    expect(b.seen).toEqual([false, true, true, false]);
    expect(entry.state.seen.some(Boolean)).toBe(false);
  });
  it("matches first-seen display and last-seen clearing without changing caught", () => {
    const a = toggleDex5Region(entry.state, 3, false, true);
    expect(a.displayed[3]).toBe(true);
    const b = toggleDex5Region(a, 3, false, false);
    expect(b.displayed.some(Boolean)).toBe(false);
    expect(b.caught).toBe(true);
    const c = toggleDex5Region(a, 0, false, true);
    const d = toggleDex5Region(c, 3, false, false);
    expect(d.displayed[3]).toBe(true);
  });
  it("selects one displayed form across regular/shiny and preserves other seen forms", () => {
    const a = toggleDex5Form(entry.state, 3, 1, true);
    expect(a.forms).toEqual([
      [false, false],
      [false, true],
      [false, false],
      [false, true],
    ]);
    const b = toggleDex5Form(a, 2, 0, true);
    expect(b.forms).toEqual([
      [true, false],
      [false, true],
      [true, false],
      [false, false],
    ]);
    expect(entry.state.forms.flat().some(Boolean)).toBe(false);
  });
  it("validates shape, language scope and disabled gender flags without mutating drafts", () => {
    const payload = validateDex5(entry.state, entry);
    if (payload.action !== "entry") throw Error();
    payload.entry.forms[0][0] = true;
    expect(entry.state.forms[0][0]).toBe(false);
    for (const bad of [
      { ...entry.state, species: 0 },
      { ...entry.state, seen: [] },
      { ...entry.state, languages: [] },
      { ...entry.state, forms: [] },
      { ...entry.state, forms: [[true], [], [], []] },
    ])
      expect(() => validateDex5(bad, entry)).toThrow("Pokedex");
    expect(() =>
      validateDex5(
        { ...entry.state, seen: [true, false, false, false] },
        { ...entry, allowedRegions: [false, true, false, true] },
      ),
    ).toThrow();
    expect(() =>
      validateDex5(
        { ...entry.state, species: 649, languages: Array(7).fill(true) },
        { ...entry, state: { ...entry.state, species: 649 } },
      ),
    ).toThrow();
  });
  it("only enables relevant modifier options and has complete language labels", () => {
    expect(dex5Shiny("giveNone")).toBe(false);
    expect(dex5Shiny("formsAll")).toBe(true);
    expect(dex5Languages("caught")).toBe(true);
    expect(dex5Languages("formsAll")).toBe(false);
    for (const lang of ["zh", "ja"] as const)
      expect(Object.keys(dex5Labels[lang]).sort()).toEqual(
        Object.keys(dex5Labels.en).sort(),
      );
  });
});
