import { expect, it } from "vitest";
import { validateDex9a, dex9aShiny, type Dex9aEntry } from "./zaPokedex";
const entry = (): Dex9aEntry => ({
  number: 25,
  name: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" },
  formChoices: [],
  megaChoices: [],
  state: {
    species: 25,
    forms: Array.from({ length: 3 }, () => Array(32).fill(false)),
    languages: Array(10).fill(false),
    genders: [false, false, false],
    mega: [false],
    isNew: false,
    alpha: false,
    displayForm: 0,
    displayGender: 0,
    displayShiny: false,
  },
});
it("copies independent form groups, tenth language and Mega drafts", () => {
  const e = entry();
  e.state.forms[2][31] = true;
  e.state.languages[9] = true;
  const r = validateDex9a(e.state, e);
  if (r.action !== "entry") throw new Error("entry required");
  expect(r.entry.forms[0][31]).toBe(false);
  expect(r.entry.forms[2][31]).toBe(true);
  r.entry.forms[2][31] = false;
  r.entry.languages[9] = false;
  r.entry.mega[0] = true;
  expect(e.state.forms[2][31]).toBe(true);
  expect(e.state.languages[9]).toBe(true);
  expect(e.state.mega[0]).toBe(false);
});
it("preserves raw display values and permits explicit repair to all four genders", () => {
  const e = entry();
  e.state.displayForm = 255;
  e.state.displayGender = 255;
  expect(() => validateDex9a({ ...e.state, alpha: true }, e)).not.toThrow();
  for (const displayGender of [0, 1, 2, 3])
    expect(() =>
      validateDex9a({ ...e.state, displayForm: 31, displayGender }, e),
    ).not.toThrow();
  for (const displayGender of [-1, 4, 256, 1.5, NaN])
    expect(() => validateDex9a({ ...e.state, displayGender }, e)).toThrow();
});
it("rejects invalid species, dimensions and boolean values", () => {
  const e = entry();
  for (const patch of [
    { species: 0 },
    { species: 1001 },
    { languages: [] },
    { genders: [] },
    { mega: [true, false] },
    { forms: [Array(32).fill(false)] },
    { displayForm: 32 },
    { alpha: 1 },
  ])
    expect(() =>
      validateDex9a({ ...e.state, ...patch } as typeof e.state, e),
    ).toThrow();
});
it("enables shiny only for registration operations", () => {
  for (const a of ["give", "seen", "caught", "complete"] as const)
    expect(dex9aShiny(a)).toBe(true);
  for (const a of ["clear", "uncaught"] as const)
    expect(dex9aShiny(a)).toBe(false);
});
