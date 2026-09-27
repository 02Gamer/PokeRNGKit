import { describe, it, expect } from "vitest";
import {
  moveDex4Item,
  toggleDex4Seen,
  validateDex4,
  type Dex4Entry,
} from "./gen4Pokedex";
import { dex4Labels } from "./gen4PokedexLabels";
const entry: Dex4Entry = {
  state: {
    species: 25,
    seen: true,
    caught: true,
    genders: [1, 0],
    forms: [1, 0],
    languages: [true, false, true, false, true, false],
  },
  name: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" },
  genderChoices: [0, 1],
  formChoices: [
    { zh: "甲", en: "A", ja: "A" },
    { zh: "乙", en: "B", ja: "B" },
  ],
  hasLanguage: true,
};
describe("Gen4 Pokédex", () => {
  it("clears associated fields and restores available genders/forms when first seen", () => {
    const cleared = toggleDex4Seen(entry.state, entry, false);
    expect(cleared).toEqual({
      ...entry.state,
      seen: false,
      caught: false,
      genders: [],
      forms: [],
      languages: Array(6).fill(false),
    });
    expect(toggleDex4Seen(cleared, entry, true)).toEqual({
      ...cleared,
      seen: true,
      genders: [0, 1],
      forms: [0, 1],
    });
    expect(toggleDex4Seen(entry.state, entry, true)).toEqual(entry.state);
    expect(entry.state.caught).toBe(true);
  });
  it("moves ordered entries without mutation and rejects moves outside the list", () => {
    const order = [3, 2, 1];
    expect(moveDex4Item(order, 1, -1)).toEqual([2, 3, 1]);
    expect(moveDex4Item(order, 1, 1)).toEqual([3, 1, 2]);
    expect(moveDex4Item(order, 0, -1)).toEqual(order);
    expect(order).toEqual([3, 2, 1]);
  });
  it("validates version-specific choices and creates independent payload arrays", () => {
    const result = validateDex4(entry.state, entry);
    expect(result.action).toBe("entry");
    if (result.action !== "entry") throw Error();
    result.entry.forms.reverse();
    expect(entry.state.forms).toEqual([1, 0]);
    for (const bad of [
      { ...entry.state, species: 0 },
      { ...entry.state, forms: [0, 0] },
      { ...entry.state, forms: [2] },
      { ...entry.state, genders: [2] },
      { ...entry.state, genders: [0, 0] },
      { ...entry.state, languages: [] },
    ])
      expect(() => validateDex4(bad, entry)).toThrow("Pokedex");
    expect(() =>
      validateDex4(entry.state, { ...entry, hasLanguage: false }),
    ).toThrow();
  });
  it("provides the same complete labels in all interface languages", () => {
    for (const language of ["zh", "ja"] as const) {
      expect(Object.keys(dex4Labels[language]).sort()).toEqual(
        Object.keys(dex4Labels.en).sort(),
      );
      expect(
        Object.values(dex4Labels[language]).every((v) => v.length > 0),
      ).toBe(true);
    }
  });
});
