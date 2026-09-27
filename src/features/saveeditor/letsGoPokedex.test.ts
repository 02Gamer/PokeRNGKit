import { describe, expect, it } from "vitest";
import {
  toggleSizeUsed,
  validateCapture7,
  type Capture7Catalog,
  type Capture7Edit,
} from "./letsGoPokedex";
import { validateDex7, type Dex7Entry } from "./gen7Pokedex";
const name = { zh: "妙蛙种子", en: "Bulbasaur", ja: "フシギダネ" };
const catalog: Capture7Catalog = {
  entries: [{ species: 1, name, captured: "0", transferred: "0" }],
  totalCaptured: "0",
  totalTransferred: "0",
};
const edit: Capture7Edit = {
  kind: "entry",
  species: 1,
  captured: "9999",
  transferred: "999999999",
  totalCaptured: "999999999",
  totalTransferred: "999999999",
};
describe("LGPE capture counts", () => {
  it("accepts exact decimal limits and rejects empty, signed, fractional, excessive and missing species input", () => {
    expect(validateCapture7(edit, catalog)).toEqual(edit);
    for (const bad of ["", "-1", "1.5", "1e3", "10000", " 2", "4294967296"])
      expect(() =>
        validateCapture7({ ...edit, captured: bad }, catalog),
      ).toThrow();
    expect(() =>
      validateCapture7({ ...edit, species: 152 }, catalog),
    ).toThrow();
    expect(() =>
      validateCapture7({ ...edit, totalTransferred: "1000000000" }, catalog),
    ).toThrow();
  });
  it("preserves an unchanged raw count, but rejects using it as a bulk template", () => {
    const raw = {
      ...catalog,
      entries: [{ ...catalog.entries[0], captured: "4294967295" }],
    };
    expect(
      validateCapture7({ ...edit, captured: "4294967295" }, raw).captured,
    ).toBe("4294967295");
    expect(() =>
      validateCapture7({ ...edit, kind: "all", captured: "4294967295" }, raw),
    ).toThrow();
  });
});
describe("LGPE size records", () => {
  const size = { used: true, height: 255, weight: 0, flagged: true };
  const entry: Dex7Entry = {
    species: 3,
    form: 1,
    name,
    formName: name,
    allowedRegions: [true, true, true, true],
    state: {
      index: 809,
      caught: null,
      seen: [false, false, false, false],
      displayed: [false, false, false, false],
      languages: [],
      sizes: Array.from({ length: 4 }, () => ({ ...size })),
    },
  };
  it("uses the upstream unset marker and clears the flag when disabling", () => {
    expect(toggleSizeUsed(size, false)).toEqual({
      used: false,
      height: 254,
      weight: 127,
      flagged: false,
    });
    expect(size.used).toBe(true);
  });
  it("validates all four byte-sized records including form entries and rejects absent/foreign records", () => {
    expect(validateDex7(entry.state, entry).action).toBe("entry");
    for (const height of [-1, 256, 0.5, NaN])
      expect(() =>
        validateDex7(
          { ...entry.state, sizes: [{ ...size, height }, size, size, size] },
          entry,
        ),
      ).toThrow();
    expect(() =>
      validateDex7({ ...entry.state, sizes: null }, entry),
    ).toThrow();
    expect(() =>
      validateDex7(entry.state, {
        ...entry,
        state: { ...entry.state, sizes: null },
      }),
    ).toThrow();
  });
});
