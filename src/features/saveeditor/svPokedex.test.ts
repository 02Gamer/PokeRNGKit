import { describe, expect, it } from "vitest";
import { validateDex9, dex9Shiny, type Dex9Entry } from "./svPokedex";
function entry(modern = true): Dex9Entry {
  return {
    name: { zh: "测试", en: "Test", ja: "テスト" },
    formChoices: [{ zh: "一般", en: "Normal", ja: "通常" }],
    regions: [25, 0, 0],
    state: {
      species: 25,
      status: modern ? null : 3,
      isNew: modern ? null : false,
      different: modern ? null : false,
      genders: [true, false, false],
      shiny: false,
      languages: Array(9).fill(false),
      forms: Array.from({ length: modern ? 4 : 1 }, () =>
        Array(32).fill(false),
      ),
      displays: Array.from({ length: modern ? 3 : 1 }, () => ({
        form: 0,
        gender: 0,
        shiny: false,
      })),
    },
  };
}
describe("SV Pokédex editing", () => {
  it("keeps four form groups and bit 31 independent and copies all nested drafts", () => {
    const e = entry();
    e.state.forms[3][31] = true;
    const result = validateDex9(e.state, e, true);
    expect(result.action).toBe("entry");
    if (result.action !== "entry") throw new Error("wrong action");
    expect(result.entry.forms[3][31]).toBe(true);
    expect(result.entry.forms[0][31]).toBe(false);
    result.entry.forms[3][31] = false;
    result.entry.genders[0] = false;
    result.entry.languages[0] = true;
    result.entry.displays[0].shiny = true;
    expect(e.state.forms[3][31]).toBe(true);
    expect(e.state.genders[0]).toBe(true);
    expect(e.state.languages[0]).toBe(false);
    expect(e.state.displays[0].shiny).toBe(false);
  });
  it("retains original out-of-menu values while allowing independent sibling edits", () => {
    for (const modern of [false, true]) {
      const e = entry(modern);
      e.state.displays[0] = {
        form: modern ? 255 : 4294967295,
        gender: 255,
        shiny: false,
      };
      if (!modern) e.state.status = 4294967295;
      expect(() =>
        validateDex9(
          {
            ...e.state,
            displays: e.state.displays.map((d, i) =>
              i ? d : { ...d, shiny: true },
            ),
          },
          e,
          modern,
        ),
      ).not.toThrow();
      expect(() =>
        validateDex9(
          {
            ...e.state,
            displays: e.state.displays.map((d, i) =>
              i ? d : { ...d, form: 42 },
            ),
          },
          e,
          modern,
        ),
      ).toThrow();
    }
  });
  it("rejects changes to an unavailable regional display", () => {
    const e = entry(),
      displays = e.state.displays.map((d) => ({ ...d }));
    displays[1].shiny = true;
    expect(() => validateDex9({ ...e.state, displays }, e, true)).toThrow();
    expect(() => validateDex9(e.state, e, true)).not.toThrow();
  });
  it("validates old states, independent new flags and format-specific fields", () => {
    const e = entry(false);
    for (const status of [0, 1, 2, 3])
      expect(() =>
        validateDex9({ ...e.state, status }, e, false),
      ).not.toThrow();
    for (const status of [null, -1, 4, 1.5, NaN])
      expect(() => validateDex9({ ...e.state, status }, e, false)).toThrow();
    expect(() =>
      validateDex9({ ...e.state, isNew: true, different: true }, e, false),
    ).not.toThrow();
    const m = entry();
    expect(() => validateDex9({ ...m.state, status: 1 }, m, true)).toThrow();
    expect(() => validateDex9({ ...m.state, isNew: false }, m, true)).toThrow();
  });
  it("rejects wrong species, dimensions, gender choices and checkbox values", () => {
    const e = entry();
    for (const patch of [
      { species: 0 },
      { species: 1026 },
      { languages: [] },
      { genders: [true] },
      { forms: [Array(31).fill(false)] },
      { displays: [] },
      { shiny: 1 },
    ])
      expect(() =>
        validateDex9({ ...e.state, ...patch } as typeof e.state, e, true),
      ).toThrow();
    const displays = e.state.displays.map((d) => ({ ...d }));
    displays[0].gender = 3;
    expect(() => validateDex9({ ...e.state, displays }, e, true)).toThrow();
  });
  it("offers shiny only for registration actions", () => {
    for (const action of ["give", "seen", "caught", "complete"] as const)
      expect(dex9Shiny(action)).toBe(true);
    for (const action of ["clear", "uncaught"] as const)
      expect(dex9Shiny(action)).toBe(false);
  });
});
