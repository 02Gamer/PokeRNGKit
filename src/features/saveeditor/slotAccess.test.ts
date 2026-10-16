// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import type { PokemonEntry, SaveReport } from "./domain";
import { checkSlotAccess, slotCanWrite } from "./slotAccess";
import { storageActionAllowed } from "./storageAccess";
import { slotMenuActions } from "./slotMenu";
const source = { box: 0, slot: 0, species: 25, valid: true } as PokemonEntry;
const report = {
  boxCount: 2,
  boxSlotCount: 30,
  partyCount: 1,
  canEdit: true,
  checksumsValid: true,
  pokemon: [source],
  slotAccess: { hasBox: true, hasParty: true, blocked: [{ box: 0, slot: 0 }] },
} as SaveReport;
const keys = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false };
it("keeps protected slots readable and analyzable while hiding writes, including empty locks", () => {
  expect(
    slotMenuActions(report, source, keys, true, false, true, true),
  ).toEqual(["view", "legality"]);
  expect(
    slotMenuActions(
      { ...report, pokemon: [] },
      source,
      keys,
      true,
      false,
      true,
      true,
    ),
  ).toEqual([]);
  expect(
    slotMenuActions(report, { box: 1, slot: 0 }, keys, true, false, true, true),
  ).toEqual(["set"]);
  const flags = {
    ...report,
    slotAccess: { ...report.slotAccess!, blocked: [] },
    pokemon: [{ ...source, slotMarkers: ["locked"] }],
  };
  expect(slotCanWrite(flags, source)).toBe(true);
});
it("uses physical Core permissions rather than party count or artwork", () => {
  expect(slotCanWrite(report, { box: -1, slot: 5 })).toBe(true);
  expect(
    slotCanWrite(
      { ...report, slotAccess: { hasBox: true, hasParty: false, blocked: [] } },
      { box: -1, slot: 0 },
    ),
  ).toBe(false);
  for (const p of [
    { box: -2, slot: 0 },
    { box: 2, slot: 0 },
    { box: 0, slot: 30 },
    { box: 0, slot: -1 },
    { box: 0, slot: 0.5 },
    { box: -1, slot: 6 },
  ])
    expect(slotCanWrite(report, p)).toBe(false);
  expect(
    slotCanWrite({ ...report, slotAccess: undefined }, { box: 1, slot: 0 }),
  ).toBe(false);
});
it("allows copying from a locked source but blocks all source writes and locked targets", () => {
  const target = { box: 1, slot: 0 };
  expect(storageActionAllowed(report, source, target, "copy")).toBe(true);
  for (const action of ["move", "swap", "overwrite", "delete"] as const)
    expect(storageActionAllowed(report, source, target, action)).toBe(false);
  const open = {
    ...report,
    slotAccess: { ...report.slotAccess!, blocked: [target] },
  };
  for (const action of ["move", "swap", "copy", "overwrite"] as const)
    expect(storageActionAllowed(open, source, target, action)).toBe(false);
  expect(storageActionAllowed(open, source, target, "delete")).toBe(true);
  const occupied = {
    ...report,
    slotAccess: { ...report.slotAccess!, blocked: [] },
    pokemon: [source, { ...source, ...target }],
  };
  expect(storageActionAllowed(occupied, source, target, "move")).toBe(false);
  expect(storageActionAllowed(occupied, source, target, "swap")).toBe(true);
  expect(
    storageActionAllowed(
      { ...occupied, checksumsValid: false },
      source,
      target,
      "copy",
    ),
  ).toBe(false);
});
it("validates complete, bounded, unique metadata and rejects missing state", () => {
  expect(() => checkSlotAccess(report)).not.toThrow();
  for (const slotAccess of [
    undefined,
    null,
    {},
    { hasBox: true, hasParty: true, blocked: null },
    { hasBox: true, hasParty: true, blocked: [{ box: -1, slot: 0 }] },
    { hasBox: true, hasParty: true, blocked: [{ box: 2, slot: 0 }] },
    { hasBox: true, hasParty: true, blocked: [{ box: 0, slot: 30 }] },
    {
      hasBox: true,
      hasParty: true,
      blocked: [
        { box: 0, slot: 0 },
        { box: 0, slot: 0 },
      ],
    },
  ])
    expect(() =>
      checkSlotAccess({ ...report, slotAccess } as SaveReport),
    ).toThrow();
});
