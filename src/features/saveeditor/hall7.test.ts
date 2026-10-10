import { describe, expect, it } from "vitest";
import {
  h7Ec,
  h7Frozen,
  h7Patch,
  h7Resave,
  supportsHall7,
  type Hall7Catalog,
} from "./hall7";
import { hall7Words } from "./hall7Words";
import { localizeSaveError, saveEditorResources } from "./locales";
import { pokemonImage } from "./art";
const name = { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" };
function catalog(usum = false): Hall7Catalog {
  return {
    canEdit: true,
    sourceHash: "A".repeat(64),
    members: Array.from({ length: 12 }, (_, index) => ({
      index,
      species: 25,
      known: true,
      name,
      sprite: "b_25",
    })),
    species: [0, 25, 807].map((id) => ({ id, name })),
    ec: usum ? "12345678" : null,
  };
}
describe("Generation VII source Hall of Fame", () => {
  it("routes only SM/USUM physical saves and keeps the EC capability in the catalog", () => {
    for (const format of ["SAV7SM", "SAV7USUM"])
      expect(supportsHall7(format)).toBe(true);
    for (const format of ["SAV7", "SAV7b", "SAV6AO", "SAV6AODemo"])
      expect(supportsHall7(format)).toBe(false);
    expect(() => h7Patch(catalog(), undefined, "")).toThrow("USUM");
    expect(h7Patch(catalog(true), undefined, "").ec).toBe("");
  });
  it("matches the eight-character source hex parser including skipped characters and empty zero", () => {
    for (const [text, expected] of [
      ["", "00000000"],
      ["FFFFFFFF", "FFFFFFFF"],
      ["aBcD0123", "ABCD0123"],
      ["0xFF", "000000FF"],
      ["g1-z2", "00000012"],
      ["--------", "00000000"],
    ])
      expect(h7Ec(text)).toBe(expected);
    expect(() => h7Ec("123456789")).toThrow();
    const c = catalog(true);
    expect(h7Patch(c, undefined, "g1-z2").ec).toBe("g1-z2");
  });
  it("edits all twelve real member indices while rejecting duplicates, unavailable species and malformed requests", () => {
    const c = catalog();
    for (let index = 0; index < 12; index++)
      expect(h7Patch(c, [{ index, species: 0 }]).members).toEqual([
        { index, species: 0 },
      ]);
    for (const members of [
      [],
      [{ index: -1, species: 25 }],
      [{ index: 12, species: 25 }],
      [{ index: 1.5, species: 25 }],
      [{ index: 0, species: 65535 }],
      [
        { index: 0, species: 25 },
        { index: 0, species: 0 },
      ],
    ])
      expect(() => h7Patch(c, members)).toThrow();
    expect(() => h7Patch(c, undefined)).toThrow();
    expect(() =>
      h7Patch({ ...c, canEdit: false }, [{ index: 0, species: 25 }]),
    ).toThrow();
  });
  it("keeps unknown stored members during ordinary edits and makes source resave an explicit frozen action", () => {
    const c = catalog();
    c.members[3] = {
      ...c.members[3],
      species: 65535,
      known: false,
      sprite: "",
    };
    expect(h7Patch(c, [{ index: 4, species: 25 }]).members).toEqual([
      { index: 4, species: 25 },
    ]);
    expect(h7Resave(c)).toEqual({ action: "resave", sourceHash: c.sourceHash });
    expect(c.members[3].species).toBe(65535);
    const request = { ...h7Resave(c), targetHash: "B".repeat(64) },
      p = {
        request,
        result: { ...c, sourceHash: request.targetHash },
        changedOffsets: [0x25ca],
      };
    expect(h7Frozen(c, p)).toBe(request);
    expect(() => h7Frozen(c, { ...p, result: c })).toThrow();
    expect(() =>
      h7Frozen(c, {
        ...p,
        request: { ...request, sourceHash: "C".repeat(64) },
      }),
    ).toThrow();
  });
  it("uses local base species art and active-language operation/errors without implying stored Pokémon details", () => {
    expect(pokemonImage({ species: 25, sprite: "b_25" })).toContain("b_25");
    for (const lang of ["zh", "en", "ja"] as const) {
      const w = hall7Words[lang];
      expect(w.first).not.toBe(w.current);
      expect(w.note.length).toBeGreaterThan(0);
      expect(
        localizeSaveError("Hall7: Invalid members.", {
          ...saveEditorResources[lang],
        }),
      ).toBe(w.invalid);
      expect(
        localizeSaveError(
          "Hall7 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(w.stale);
    }
  });
});
