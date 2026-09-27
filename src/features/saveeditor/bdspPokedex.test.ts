import { describe, it, expect } from "vitest";
import {
  validateDex8b,
  dex8bShiny,
  dex8bSingle,
  type Dex8bEntry,
} from "./bdspPokedex";
const name = { zh: "未知图腾", en: "Unown", ja: "アンノーン" };
const entry: Dex8bEntry = {
  state: {
    species: 201,
    state: 0,
    genders: [true, true, true, true],
    languages: Array(9).fill(false),
    forms: [Array(28).fill(false), Array(28).fill(false)],
  },
  name,
  formChoices: Array(28).fill(name),
};
describe("BDSP dex", () => {
  it("keeps state, gender, languages and forms independent", () => {
    const draft = { ...entry.state, languages: Array(9).fill(true) };
    const result = validateDex8b(draft, entry);
    expect(result.action).toBe("entry");
    if (result.action !== "entry") throw Error();
    expect(result.entry.state).toBe(0);
    expect(result.entry.genders).toEqual([true, true, true, true]);
    expect(result.entry.forms).toEqual(entry.state.forms);
    expect(result.entry.forms[0]).not.toBe(entry.state.forms[0]);
  });
  it("preserves unchanged unknown state but rejects newly invented states and incomplete records", () => {
    const old = { ...entry, state: { ...entry.state, state: -2147483648 } };
    expect(validateDex8b(old.state, old).action).toBe("entry");
    for (const state of [-1, 4, 2.5])
      expect(() => validateDex8b({ ...entry.state, state }, entry)).toThrow();
    for (const bad of [
      { genders: [] },
      { languages: Array(7).fill(false) },
      { forms: [[]] },
      { species: 494 },
    ])
      expect(() => validateDex8b({ ...entry.state, ...bad }, entry)).toThrow();
  });
  it("limits shiny modifiers and distinguishes current-species forms from whole-dex actions", () => {
    expect(dex8bShiny("seen")).toBe(true);
    expect(dex8bShiny("complete")).toBe(true);
    expect(dex8bShiny("caught")).toBe(false);
    expect(dex8bSingle("formsRegular")).toBe(true);
    expect(dex8bSingle("giveNone")).toBe(true);
    expect(dex8bSingle("clear")).toBe(false);
  });
});
