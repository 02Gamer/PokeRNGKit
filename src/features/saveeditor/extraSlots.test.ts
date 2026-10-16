// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { SAVE_EDITOR_API_VERSION, type PokemonEntry } from "./domain";
import {
  checkExtraCatalog,
  checkExtraPreview,
  extraSlotId,
  extraSlotWords,
  type ExtraSlotCatalog,
  type ExtraSlotPreview,
} from "./extraSlots";
const hash = "A".repeat(64),
  key = { type: 5, slot: 0, partyFormat: true };
const name = { zh: "剧情格位", en: "Scripted", ja: "イベント" };
function preview(): ExtraSlotPreview {
  return {
    token: "extra:1",
    sourceHash: hash,
    targetHash: "B".repeat(64),
    target: { ...key },
    name: { ...name },
    pokemon: { species: 25, speciesName: { ...name } } as PokemonEntry,
    editorFile: { fileName: "prepared.pk9", data: btoa("test") },
    compatibility: [],
    clear: false,
    overwrite: true,
    changedBytes: 10,
  };
}
function catalog(): ExtraSlotCatalog {
  return {
    apiVersion: SAVE_EDITOR_API_VERSION,
    sourceHash: hash,
    haX: false,
    slots: [
      {
        key: { ...key },
        name: { ...name },
        canWrite: false,
        canView: true,
        hideLegality: true,
        pokemon: preview().pokemon,
      },
    ],
  };
}
it("keeps actual type, slot and storage width distinct and clones response ownership", () => {
  expect(extraSlotId(key)).not.toBe(extraSlotId({ ...key, type: 6 }));
  expect(extraSlotId(key)).not.toBe(
    extraSlotId({ ...key, partyFormat: false }),
  );
  const input = catalog(),
    view = checkExtraCatalog(input, hash);
  view.slots[0].key.slot = 3;
  expect(input.slots[0].key.slot).toBe(0);
  expect(view.slots[0]).toMatchObject({ canWrite: false, hideLegality: true });
});
it.each([
  { apiVersion: SAVE_EDITOR_API_VERSION - 1 },
  { sourceHash: "stale" },
  { haX: "true" },
  { slots: [...catalog().slots, ...catalog().slots] },
  { slots: [{ ...catalog().slots[0], canWrite: undefined }] },
  { slots: [{ ...catalog().slots[0], key: { ...key, slot: 128 } }] },
])("rejects stale catalogs and incomplete permissions %j", (patch) => {
  expect(() =>
    checkExtraCatalog({ ...catalog(), ...patch } as ExtraSlotCatalog, hash),
  ).toThrow();
});
it.each([
  { token: "extra:old" },
  { sourceHash: "stale" },
  { targetHash: "bad" },
  { target: { ...key, type: 6 } },
  { target: { ...key, partyFormat: false } },
  { clear: true },
  { changedBytes: -1 },
  { editorFile: { fileName: "bad.pk9", data: "" } },
  { compatibility: [{ ...name, ja: null }] },
])("rejects stale or malformed frozen previews %j", (patch) => {
  expect(() =>
    checkExtraPreview(
      { ...preview(), ...patch } as ExtraSlotPreview,
      hash,
      key,
    ),
  ).toThrow();
});
it("requires an explicit clear result and owns the frozen editor snapshot", () => {
  const input = preview(),
    view = checkExtraPreview(input, hash, key);
  view.target.slot = 2;
  view.editorFile.fileName = "changed.pk9";
  expect(input.target.slot).toBe(0);
  expect(input.editorFile.fileName).toBe("prepared.pk9");
  expect(
    checkExtraPreview(
      { ...input, clear: true, pokemon: { ...input.pokemon, species: 0 } },
      hash,
      key,
    ).clear,
  ).toBe(true);
});
it("provides all operation labels in the three UI languages", () => {
  for (const words of Object.values(extraSlotWords)) {
    expect(Object.keys(words)).toEqual(Object.keys(extraSlotWords.zh));
    expect(Object.values(words).every((value) => value.length > 0)).toBe(true);
  }
});
