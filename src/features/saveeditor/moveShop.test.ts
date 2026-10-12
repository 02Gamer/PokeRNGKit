// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import {
  moveShopEdit,
  moveShopConfirmation,
  validateMoveShopCatalog,
  sortMoveShopRows,
  type MoveShopTarget,
  type MoveShopTicket,
  type MoveShopCatalog,
  type MoveShopRow,
} from "./moveShop";
const catalog = {
  sourceHash: "A".repeat(64),
  rows: Array.from(
    { length: 61 },
    (_, index) => ({ index, permitted: false }) as MoveShopRow,
  ),
} as MoveShopCatalog;
const rows = () =>
  catalog.rows.map((r) => ({
    index: r.index,
    purchased: false,
    mastered: true,
  }));
it("binds frozen confirmation to exact target and catalog hashes", () => {
  const target: MoveShopTarget = {
    kind: "file",
    box: 0,
    slot: 0,
    fileName: "entity.pa8",
    inputEncrypted: true,
    useFileFormat: true,
  };
  const ticket: MoveShopTicket = {
    token: "move-shop:1",
    sourceHash: catalog.sourceHash,
    targetHash: "B".repeat(64),
    target,
    before: catalog,
    result: { ...catalog, sourceHash: "B".repeat(64) },
    changedRows: [60],
    changedBytes: 2,
  };
  expect(moveShopConfirmation(catalog, target, ticket).target).toEqual(target);
  expect(() =>
    moveShopConfirmation(catalog, { ...target, fileName: "other.pa8" }, ticket),
  ).toThrow();
  expect(() =>
    moveShopConfirmation(catalog, target, { ...ticket, result: catalog }),
  ).toThrow();
});
it("retains manual unpermitted flags and physical indexes after sorted display", () => {
  const draft = rows().reverse();
  const edit = moveShopEdit(catalog, "save", draft);
  draft[0].purchased = true;
  expect(edit.rows[0]).toEqual({ index: 60, purchased: false, mastered: true });
});
it("requires every source row, rejects duplicates and separates parent reset", () => {
  expect(() => moveShopEdit(catalog, "none", rows().slice(1))).toThrow();
  expect(() =>
    moveShopEdit(
      catalog,
      "save",
      rows().map((r) => ({ ...r, index: 0 })),
    ),
  ).toThrow();
  expect(() => moveShopEdit(catalog, "encounterReset", rows())).toThrow();
  expect(moveShopEdit(catalog, "encounterReset", []).rows).toEqual([]);
});
it("rejects malformed full catalogs before showing editable flags", () => {
  const valid: MoveShopCatalog = {
    sourceHash: "A".repeat(64),
    species: 25,
    form: 0,
    level: 25,
    purchasedRaw: "00".repeat(8),
    masteredRaw: "A5".repeat(8),
    rows: Array.from({ length: 61 }, (_, index) => ({
      index,
      move: 85,
      type: 12,
      permitted: false,
      purchased: false,
      mastered: true,
      name: { zh: "十万伏特", en: "Thunderbolt", ja: "１０まんボルト" },
      typeName: { zh: "电", en: "Electric", ja: "でんき" },
    })),
  };
  expect(validateMoveShopCatalog(valid)).toBe(valid);
  expect(() =>
    validateMoveShopCatalog({
      ...valid,
      rows: valid.rows.map((r) => ({ ...r, index: 0 })),
    }),
  ).toThrow();
  expect(() =>
    validateMoveShopCatalog({ ...valid, masteredRaw: "00" }),
  ).toThrow();
  expect(() =>
    validateMoveShopCatalog({
      ...valid,
      rows: valid.rows.map((r) => ({ ...r, type: 18 })),
    }),
  ).toThrow();
});
it("sorts types by source type then permitted status and checkboxes with true first", () => {
  const draft = [
    {
      index: 4,
      type: 12,
      permitted: false,
      purchased: true,
      name: { en: "A" },
    },
    {
      index: 7,
      type: 12,
      permitted: true,
      purchased: false,
      name: { en: "Z" },
    },
    {
      index: 3,
      type: 1,
      permitted: false,
      purchased: false,
      name: { en: "B" },
    },
  ] as MoveShopRow[];
  expect(
    sortMoveShopRows(draft, "type", false, "en").map((r) => r.index),
  ).toEqual([3, 7, 4]);
  expect(
    sortMoveShopRows(draft, "purchased", true, "en").map((r) => r.index),
  ).toEqual([4, 3, 7]);
  expect(draft.map((r) => r.index)).toEqual([4, 7, 3]);
});
