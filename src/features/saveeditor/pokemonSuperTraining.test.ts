// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import {
  superTrainingDraft,
  superTrainingConfirmation,
  validateSuperTrainingCatalog,
  type SuperTrainingCatalog,
  type SuperTrainingTarget,
  type SuperTrainingTicket,
} from "./pokemonSuperTraining";
const name = { zh: "训练", en: "Training", ja: "トレーニング" };
const catalog = (format: "PK6" | "PK7"): SuperTrainingCatalog => {
  const hasBag = format === "PK6";
  const draft = {
    regular: Array<boolean>(30).fill(false),
    distribution: Array<boolean>(6).fill(false),
    unlocked: false,
    complete: false,
    bag: hasBag ? 0 : null,
    hits: hasBag ? 255 : null,
  };
  return {
    sourceHash: "A".repeat(64),
    format,
    hasBag,
    draft,
    stored: structuredClone(draft),
    raw: "00".repeat(hasBag ? 9 : 7),
    bags: hasBag
      ? Array.from({ length: 27 }, (_, index) => ({ index, name }))
      : [],
    rows: Array.from({ length: 36 }, (_, i) => ({
      index: i < 30 ? i : i - 30,
      distribution: i >= 30,
      flag: false,
      storedFlag: false,
      enabled: !hasBag || i < 18 || i >= 30,
      name,
    })),
  };
};
it.each(["PK6", "PK7"] as const)(
  "preserves %s source ordering and independent draft",
  (format) => {
    const c = catalog(format);
    expect(validateSuperTrainingCatalog(c)).toBe(c);
    const once = superTrainingDraft(c, [{ kind: "all", index: 0, value: 0 }]);
    expect(once.regular.every(Boolean)).toBe(true);
    expect(once.distribution.some(Boolean)).toBe(false);
    const twice = superTrainingDraft(c, [
      { kind: "all", index: 0, value: 0 },
      { kind: "all", index: 0, value: 0 },
    ]);
    expect(twice.distribution.every(Boolean)).toBe(format === "PK6");
    expect(c.draft.regular.some(Boolean)).toBe(false);
    expect(
      superTrainingDraft(c, [
        { kind: "none", index: 0, value: 0 },
      ]).regular.some(Boolean),
    ).toBe(false);
    expect(() =>
      superTrainingDraft(c, [{ kind: "distribution", index: 6, value: 1 }]),
    ).toThrow();
    expect(() =>
      superTrainingDraft(
        c,
        Array.from({ length: 513 }, () => ({
          kind: "all" as const,
          index: 0,
          value: 0,
        })),
      ),
    ).toThrow();
  },
);
it("enforces secret controls and bag/hit ranges without changing stored values", () => {
  const c = catalog("PK6");
  expect(() =>
    superTrainingDraft(c, [{ kind: "regular", index: 18, value: 1 }]),
  ).toThrow();
  const d = superTrainingDraft(c, [
    { kind: "unlocked", index: 0, value: 1 },
    { kind: "regular", index: 29, value: 1 },
    { kind: "unlocked", index: 0, value: 0 },
  ]);
  expect(d.regular[29]).toBe(false);
  expect(() =>
    superTrainingDraft(c, [{ kind: "hits", index: 0, value: 256 }]),
  ).toThrow();
  expect(() =>
    superTrainingDraft(c, [{ kind: "bag", index: 0, value: 27 }]),
  ).toThrow();
  expect(() =>
    superTrainingDraft(catalog("PK7"), [
      { kind: "unlocked", index: 0, value: 1 },
    ]),
  ).toThrow();
  expect(c.stored.hits).toBe(255);
});
it("binds exact target and raw/row/field difference ranges", () => {
  const c = catalog("PK6"),
    target: SuperTrainingTarget = {
      kind: "file",
      box: 0,
      slot: 0,
      fileName: "a.pk6",
      inputEncrypted: true,
      useFileFormat: true,
    };
  const t: SuperTrainingTicket = {
    token: "super-training:1",
    sourceHash: c.sourceHash,
    targetHash: "B".repeat(64),
    target,
    before: c,
    result: { ...c, sourceHash: "B".repeat(64) },
    changedRows: [30, 35],
    changedFields: ["bag"],
    changedFlags: [71],
    changedBytes: 2,
  };
  expect(superTrainingConfirmation(c, target, t).target).toEqual(target);
  expect(() =>
    superTrainingConfirmation(c, { ...target, inputEncrypted: false }, t),
  ).toThrow();
  expect(() =>
    superTrainingConfirmation(c, target, { ...t, changedFlags: [72] }),
  ).toThrow();
  expect(() =>
    superTrainingConfirmation(c, target, { ...t, changedRows: [36] }),
  ).toThrow();
  expect(() =>
    superTrainingConfirmation(c, target, { ...t, sourceHash: "C".repeat(64) }),
  ).toThrow();
});
