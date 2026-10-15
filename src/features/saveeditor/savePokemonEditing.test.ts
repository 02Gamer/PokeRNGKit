import { describe, expect, it } from "vitest";
import {
  pokemonAccess,
  checkPokemonAccess,
  type SavePokemonCapability,
} from "./savePokemonEditing";
import { boxDropEdit, adjacentBoxEdit } from "./boxGallery";
import type { SaveReport } from "./domain";
import { unsupportedSaveChoice } from "./saveDetection";

const standard: SavePokemonCapability = {
  canEdit: true,
  editor: "standard",
  canRaw: true,
  canImport: true,
  canStorage: true,
};
describe("save Pokemon capabilities", () => {
  it("uses native version/language exclusions without restricting other combinations", () => {
    const type = {
      id: 1,
      name: "GSC",
      versions: [],
      unsupported: [{ subVersion: 41, language: 8 }],
    };
    expect(unsupportedSaveChoice(type, 41, 8)).toBe(true);
    expect(unsupportedSaveChoice(type, 39, 8)).toBe(false);
    expect(unsupportedSaveChoice(type, 41, 1)).toBe(false);
    expect(unsupportedSaveChoice(undefined, 41, 8)).toBe(false);
  });
  it("enables independently supported Pokemon paths while the old global gate remains closed", () => {
    const report = {
      canEdit: false,
      checksumsValid: true,
      pokemonEditing: standard,
    };
    expect(pokemonAccess(report)).toBe(standard);
    const gb: SavePokemonCapability = {
      ...standard,
      editor: "gb",
      canRaw: false,
    };
    expect(pokemonAccess({ ...report, pokemonEditing: gb })).toEqual(gb);
    expect(() => checkPokemonAccess(gb)).not.toThrow();
  });
  it("invalid checksums close every write action while retaining the format-specific read view", () => {
    expect(
      pokemonAccess({
        canEdit: true,
        checksumsValid: false,
        pokemonEditing: { ...standard, editor: "gb", canRaw: false },
      }),
    ).toEqual({
      editor: "gb",
      canEdit: false,
      canRaw: false,
      canImport: false,
      canStorage: false,
    });
    expect(
      pokemonAccess({ canEdit: false, checksumsValid: true }).canEdit,
    ).toBe(false);
  });
  it.each([
    null,
    {},
    { ...standard, canRaw: 1 },
    { ...standard, editor: "unknown" },
    { ...standard, editor: "gb" },
    { ...standard, editor: "none" },
    { ...standard, canEdit: false },
  ])(
    "rejects missing, malformed and inconsistent native capabilities",
    (value) => {
      expect(() => checkPokemonAccess(value)).toThrow();
    },
  );
  it("permits physical slot drops without enabling the independent whole-box swap workflow", () => {
    const report = {
      canEdit: false,
      checksumsValid: true,
      pokemonEditing: standard,
      boxCount: 2,
      boxSlotCount: 30,
      boxOptions: { canSwap: true },
      pokemon: [{ box: 0, slot: 0, valid: true, species: 25 }],
    } as SaveReport;
    const keys = {
      altKey: false,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
    };
    expect(
      boxDropEdit(
        report,
        { box: 0, slot: 0 },
        { box: 1, slot: 1 },
        "copy",
        keys,
      ),
    ).toEqual({
      action: "copy",
      source: { box: 0, slot: 0 },
      target: { box: 1, slot: 1 },
    });
    expect(() => adjacentBoxEdit(report, 0, 1)).toThrow();
    expect(() =>
      boxDropEdit(
        { ...report, checksumsValid: false },
        { box: 0, slot: 0 },
        { box: 1, slot: 1 },
        "copy",
        keys,
      ),
    ).toThrow();
  });
});
