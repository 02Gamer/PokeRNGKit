import { describe, expect, it } from "vitest";
import {
  dexDraft,
  setAllDex,
  validateSimpleDex,
  type SimpleDexCatalog,
} from "./simplePokedex";
import { speciesImage } from "./art";

const catalog: SimpleDexCatalog = {
  generation: 3,
  virtualConsole: true,
  canEdit: true,
  entries: [
    {
      species: 1,
      name: { zh: "妙蛙种子", en: "Bulbasaur", ja: "フシギダネ" },
      seen: false,
      caught: true,
      canCatch: true,
    },
    {
      species: 152,
      name: { zh: "菊草叶", en: "Chikorita", ja: "チコリータ" },
      seen: true,
      caught: true,
      canCatch: false,
    },
  ],
};
describe("simple Pokédex", () => {
  it("keeps seen and caught independent and batch edits preserve the other column", () => {
    const draft = dexDraft(catalog);
    expect(setAllDex(draft, catalog, "seen", true)).toEqual([
      { species: 1, seen: true, caught: true },
      { species: 152, seen: true, caught: true },
    ]);
    expect(
      setAllDex(draft, catalog, "seen", false).every(
        (e) => !e.seen && e.caught,
      ),
    ).toBe(true);
    expect(setAllDex(draft, catalog, "caught", true)).toEqual([
      { species: 1, seen: false, caught: true },
      { species: 152, seen: true, caught: false },
    ]);
    expect(setAllDex(draft, catalog, "caught", false)).toEqual([
      { species: 1, seen: false, caught: false },
      { species: 152, seen: true, caught: false },
    ]);
    expect(draft).toEqual(dexDraft(catalog));
  });
  it("requires each species exactly once with two boolean flags", () => {
    const draft = dexDraft(catalog);
    expect(validateSimpleDex("FireRed_test.sav", draft, catalog)).toEqual({
      fileName: "FireRed_test.sav",
      entries: draft,
    });
    for (const invalid of [
      [],
      [draft[0]],
      [draft[0], draft[0]],
      [draft[0], { ...draft[1], species: 0 }],
      [draft[0], { ...draft[1], species: 152.5 }],
      [draft[0], { ...draft[1], seen: undefined as unknown as boolean }],
    ])
      expect(() => validateSimpleDex("test.sav", invalid, catalog)).toThrow(
        "Pokedex",
      );
    expect(() =>
      validateSimpleDex("test.sav", draft, { ...catalog, canEdit: false }),
    ).toThrow();
    expect(() =>
      validateSimpleDex("test.sav", [], { ...catalog, entries: [] }),
    ).toThrow();
    const request = validateSimpleDex("test.sav", draft, catalog);
    request.entries[0].caught = false;
    expect(draft[0].caught).toBe(true);
  });
  it("uses local species images and a local fallback", () => {
    expect(speciesImage(1)).toContain("save-art/26.08.26/");
    expect(speciesImage(1)).not.toBe(speciesImage(999999));
    expect(speciesImage(999999)).not.toContain("undefined");
  });
});
