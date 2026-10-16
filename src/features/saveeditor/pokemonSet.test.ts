// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import {
  editorFile,
  editorSnapshot,
  parsePokemonSet,
  pokemonSetWords,
  type PokemonSetTicket,
} from "./pokemonSet";
import type { PokemonEntry } from "./domain";
const hash = "A".repeat(64),
  source = { box: 0, slot: 1 },
  target = { box: 0, slot: 2 };
function ticket(): PokemonSetTicket {
  return {
    token: "set:1",
    sourceHash: hash,
    targetHash: "B".repeat(64),
    source,
    target,
    pokemon: { box: 0, slot: 2, species: 25 } as PokemonEntry,
    editorFile: { fileName: "prepared.pk3", data: btoa("\x00\x7f\xff") },
    compatibility: [],
    overwrite: true,
    changedBytes: 42,
  };
}
it("requires an explicit clear operation before accepting an empty target result", () => {
  const empty = { ...ticket(), pokemon: { ...ticket().pokemon, species: 0 } };
  expect(() => parsePokemonSet(empty, hash, source, target)).toThrow();
  expect(
    parsePokemonSet({ ...empty, clear: true }, hash, source, target).clear,
  ).toBe(true);
  expect(() =>
    parsePokemonSet({ ...empty, clear: "true" }, hash, source, target),
  ).toThrow();
});
it("keeps the prepared editor file independent of the frozen imported slot", () => {
  const input = ticket(),
    view = parsePokemonSet(input, hash, source, target);
  expect(view).not.toBe(input);
  view.editorFile.fileName = "changed.pk3";
  expect(input.editorFile.fileName).toBe("prepared.pk3");
  const snapshot = editorSnapshot(input.editorFile);
  expect([...snapshot.bytes]).toEqual([0, 127, 255]);
  expect(editorFile(snapshot)).toEqual(input.editorFile);
  snapshot.bytes[0] = 100;
  expect(editorSnapshot(input.editorFile).bytes[0]).toBe(0);
});
it.each([
  { sourceHash: "C".repeat(64) },
  { targetHash: "bad" },
  { token: "copy:1" },
  { source: { box: 0, slot: 0 } },
  { target: { box: 1, slot: 2 } },
  { pokemon: { box: 0, slot: 2, species: 0 } },
  { compatibility: [{ zh: "ok", en: null, ja: "ok" }] },
  { changedBytes: -1 },
  { editorFile: { fileName: "empty.pk3", data: "" } },
])("rejects stale or malformed frozen placement metadata %j", (patch) => {
  expect(() =>
    parsePokemonSet({ ...ticket(), ...patch }, hash, source, target),
  ).toThrow();
});
it("accepts only Core-normalized party append positions within the clicked slot", () => {
  const value = {
    ...ticket(),
    target: { box: -1, slot: 2 },
    pokemon: { box: -1, slot: 2, species: 25 },
  };
  expect(
    parsePokemonSet(value, hash, source, { box: -1, slot: 5 }).target.slot,
  ).toBe(2);
  expect(() =>
    parsePokemonSet(value, hash, source, { box: -1, slot: 1 }),
  ).toThrow();
  expect(() =>
    parsePokemonSet({ ...value, target: { box: -1, slot: 6 } }, hash, source, {
      box: -1,
      slot: 6,
    }),
  ).toThrow();
});
it("rejects encrypted or empty buffer snapshots instead of silently changing their interpretation", () => {
  expect(() =>
    editorFile({
      ...editorSnapshot(ticket().editorFile),
      inputEncrypted: true,
    }),
  ).toThrow();
  expect(() =>
    editorSnapshot({ fileName: "x.pk3", data: "invalid%%%" }),
  ).toThrow();
  for (const words of Object.values(pokemonSetWords)) {
    expect(words.note.length).toBeGreaterThan(10);
    expect(words.set).toBeTruthy();
    expect(words.compatibility).toBeTruthy();
  }
});
