import { describe, it, expect } from "vitest";
import { toggleDex7, validateDex7, type Dex7Entry } from "./gen7Pokedex";
const entry: Dex7Entry = {
  species: 25,
  form: 0,
  name: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" },
  formName: { zh: "", en: "", ja: "" },
  allowedRegions: [true, true, true, true],
  state: {
    index: 24,
    caught: false,
    seen: [false, false, false, false],
    displayed: [false, false, false, false],
    languages: Array(9).fill(false),
  },
};
describe("Gen7 dex entries", () => {
  it("auto-selects the first seen display, switches display uniquely and clears the final seen display", () => {
    let state = toggleDex7(entry.state, 1, false, true);
    expect(state.displayed).toEqual([false, true, false, false]);
    state = toggleDex7(state, 3, true, true);
    expect(state.displayed).toEqual([false, false, false, true]);
    expect(state.seen[3]).toBe(true);
    state = toggleDex7(state, 1, false, false);
    state = toggleDex7(state, 3, false, false);
    expect(state.displayed.some(Boolean)).toBe(false);
    expect(entry.state.seen.some(Boolean)).toBe(false);
  });
  it("distinguishes base ownership/languages from independent form flags", () => {
    expect(validateDex7(entry.state, entry).action).toBe("entry");
    const form = {
      ...entry,
      form: 1,
      state: { ...entry.state, index: 803, caught: null, languages: [] },
    };
    expect(validateDex7(form.state, form).action).toBe("entry");
    expect(() => validateDex7({ ...form.state, caught: true }, form)).toThrow();
    expect(() =>
      validateDex7({ ...form.state, languages: Array(9).fill(false) }, form),
    ).toThrow();
    expect(() =>
      validateDex7({ ...entry.state, languages: Array(7).fill(false) }, entry),
    ).toThrow();
  });
  it("preserves existing unusual flags, but rejects new incompatible gender/display selections", () => {
    const female = { ...entry, allowedRegions: [false, true, false, true] };
    expect(() =>
      validateDex7(
        { ...entry.state, seen: [true, false, false, false] },
        female,
      ),
    ).toThrow();
    expect(() =>
      validateDex7(
        { ...entry.state, displayed: [false, true, false, false] },
        entry,
      ),
    ).toThrow();
    const old = {
      ...entry,
      state: { ...entry.state, displayed: [true, true, false, false] },
    };
    expect(validateDex7(old.state, old).action).toBe("entry");
    expect(() =>
      validateDex7(
        { ...old.state, displayed: [false, true, true, false] },
        old,
      ),
    ).toThrow();
  });
});
