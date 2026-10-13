// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import {
  plusRecordEdit,
  plusRecordConfirmation,
  validatePlusRecordCatalog,
  type PlusRecordCatalog,
  type PlusRecordTarget,
  type PlusRecordTicket,
} from "./plusRecord";
const catalog = (): PlusRecordCatalog => ({
  sourceHash: "A".repeat(64),
  format: "PA9",
  species: 25,
  form: 0,
  level: 25,
  countUsed: 340,
  countTotal: 360,
  raw: "00".repeat(45),
  hasImpossibleFlags: false,
  rows: Array.from({ length: 340 }, (_, index) => ({
    index,
    move: 7,
    type: 9,
    flag: false,
    currentMove: false,
    learnable: false,
    name: { zh: "火焰拳", en: "Fire Punch", ja: "ほのおのパンチ" },
    typeName: { zh: "火", en: "Fire", ja: "ほのお" },
  })),
});
it("requires full source capacities and complete unique zero-based rows", () => {
  const value = catalog();
  expect(validatePlusRecordCatalog(value)).toBe(value);
  for (const invalid of [
    { ...value, countUsed: 360 },
    { ...value, raw: "00".repeat(44) },
    { ...value, rows: value.rows.slice(1) },
    { ...value, rows: value.rows.map((r) => ({ ...r, index: r.index + 1 })) },
  ])
    expect(() => validatePlusRecordCatalog(invalid)).toThrow();
  const draft = value.rows
    .map((r) => ({ index: r.index, flag: true }))
    .reverse();
  const edit = plusRecordEdit(value, "save", draft);
  draft[0].flag = false;
  expect(edit.rows[0]).toEqual({ index: 339, flag: true });
  expect(() => plusRecordEdit(value, "save", draft.slice(1))).toThrow();
  expect(() =>
    plusRecordEdit(
      value,
      "save",
      draft.map((r) => ({ ...r, index: 0 })),
    ),
  ).toThrow();
  expect(plusRecordEdit(value, "none", []).rows).toEqual([]);
  expect(plusRecordEdit(value, "parentCurrent", []).rows).toEqual([]);
  expect(() => plusRecordEdit(value, "none", draft)).toThrow();
});
it("binds every target field and both hashes while accepting tail changes", () => {
  const value = catalog(),
    target: PlusRecordTarget = {
      kind: "file",
      box: 0,
      slot: 0,
      fileName: "a.pa9",
      inputEncrypted: true,
      useFileFormat: true,
    };
  const ticket: PlusRecordTicket = {
    token: "plus-record:1",
    sourceHash: value.sourceHash,
    targetHash: "B".repeat(64),
    target,
    before: value,
    result: { ...value, sourceHash: "B".repeat(64) },
    changedRows: [],
    changedFlags: [340, 359],
    changedBytes: 2,
  };
  expect(plusRecordConfirmation(value, target, ticket).target).toEqual(target);
  for (const changed of [
    { ...target, kind: "save" as const },
    { ...target, box: 1 },
    { ...target, slot: 1 },
    { ...target, fileName: "b.pa9" },
    { ...target, inputEncrypted: false },
    { ...target, useFileFormat: false },
  ])
    expect(() => plusRecordConfirmation(value, changed, ticket)).toThrow();
  expect(() =>
    plusRecordConfirmation(value, target, {
      ...ticket,
      sourceHash: "C".repeat(64),
    }),
  ).toThrow();
  expect(() =>
    plusRecordConfirmation(value, target, { ...ticket, changedFlags: [360] }),
  ).toThrow();
});
