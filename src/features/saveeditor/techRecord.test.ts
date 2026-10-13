// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import {
  validateTechRecordCatalog,
  techRecordEdit,
  techRecordConfirmation,
  type TechRecordCatalog,
  type TechRecordTarget,
  type TechRecordTicket,
} from "./techRecord";
const catalog = (format: TechRecordCatalog["format"]): TechRecordCatalog => {
  const count =
    format === "PA9"
      ? 160
      : format === "PK9"
        ? 230
        : format === "PA8"
          ? 61
          : 100;
  return {
    sourceHash: "A".repeat(64),
    format,
    species: 25,
    form: 0,
    level: 25,
    countUsed: format === "PA9" ? 230 : count,
    countTotal:
      format === "PA9" || format === "PK9" ? 304 : format === "PA8" ? 64 : 112,
    raw: "A5".repeat(format === "PA9" || format === "PK9" ? 38 : 14),
    rows: Array.from({ length: count }, (_, index) => ({
      index,
      number: index + (format === "PA9" ? 1 : 0),
      move: 29,
      type: 0,
      flag: false,
      permission: "suspect",
      currentMove: false,
      name: { zh: "头锤", en: "Headbutt", ja: "ずつき" },
      typeName: { zh: "一般", en: "Normal", ja: "ノーマル" },
    })),
  };
};
it.each(["PK8", "PB8", "PA8", "PK9", "PA9"] as const)(
  "keeps %s candidate, force and raw capacities separate",
  (format) => {
    const value = catalog(format);
    expect(validateTechRecordCatalog(value)).toBe(value);
    const draft = value.rows
      .map((r) => ({ index: r.index, flag: true }))
      .reverse();
    const edit = techRecordEdit(value, "save", draft);
    draft[0].flag = false;
    expect(edit.rows[0].flag).toBe(true);
    expect(edit.rows[0].index).toBe(value.rows.length - 1);
    expect(() => techRecordEdit(value, "save", draft.slice(1))).toThrow();
    expect(() =>
      techRecordEdit(
        value,
        "save",
        draft.map((r) => ({ ...r, index: 0 })),
      ),
    ).toThrow();
    expect(techRecordEdit(value, "none", []).rows).toEqual([]);
    expect(techRecordEdit(value, "parentCurrent", []).rows).toEqual([]);
    expect(() => techRecordEdit(value, "parentCurrent", draft)).toThrow();
  },
);
it("does not fabricate ZA candidates or confuse display numbers with bit positions", () => {
  const value = catalog("PA9");
  expect(value.rows[0].number).toBe(1);
  expect(value.rows[0].index).toBe(0);
  expect(value.rows).toHaveLength(160);
  expect(() =>
    validateTechRecordCatalog({ ...value, countUsed: 160 }),
  ).toThrow();
  expect(() =>
    validateTechRecordCatalog({
      ...value,
      rows: value.rows.map((r) => ({ ...r, index: r.number })),
    }),
  ).toThrow();
});
it("binds exact target and hashes while retaining non-visible changed flags", () => {
  const value = catalog("PA9"),
    target: TechRecordTarget = {
      kind: "file",
      box: 0,
      slot: 0,
      fileName: "entity.pa9",
      inputEncrypted: true,
      useFileFormat: true,
    };
  const ticket: TechRecordTicket = {
    token: "tech-record:1",
    sourceHash: value.sourceHash,
    targetHash: "B".repeat(64),
    target,
    before: value,
    result: { ...value, sourceHash: "B".repeat(64) },
    changedRows: [0],
    changedFlags: [0, 229, 303],
    changedBytes: 2,
  };
  expect(techRecordConfirmation(value, target, ticket).target).toEqual(target);
  expect(() =>
    techRecordConfirmation(value, { ...target, inputEncrypted: false }, ticket),
  ).toThrow();
  expect(() =>
    techRecordConfirmation(value, target, { ...ticket, changedFlags: [304] }),
  ).toThrow();
  expect(() =>
    techRecordConfirmation(value, target, { ...ticket, result: value }),
  ).toThrow();
});
