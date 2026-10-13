// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export interface PlusRecordRow {
  index: number;
  move: number;
  type: number;
  flag: boolean;
  learnable: boolean;
  currentMove: boolean;
  name: LocalizedText;
  typeName: LocalizedText;
}
export interface PlusRecordCatalog {
  sourceHash: string;
  format: "PA9";
  species: number;
  form: number;
  level: number;
  countUsed: number;
  countTotal: number;
  rows: PlusRecordRow[];
  raw: string;
  hasImpossibleFlags: boolean;
}
export type PlusRecordAction =
  | "save"
  | "legalCurrentTM"
  | "legalSeedTM"
  | "legalCurrent"
  | "clearAfterSave"
  | "none"
  | "parentCurrent";
export interface PlusRecordRowEdit {
  index: number;
  flag: boolean;
}
export interface PlusRecordEdit {
  action: PlusRecordAction;
  rows: PlusRecordRowEdit[];
}
export interface PlusRecordTarget {
  kind: "file" | "save";
  box: number;
  slot: number;
  fileName: string | null;
  inputEncrypted: boolean;
  useFileFormat: boolean;
}
export interface PlusRecordTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: PlusRecordTarget;
  before: PlusRecordCatalog;
  result: PlusRecordCatalog;
  changedRows: number[];
  changedFlags: number[];
  changedBytes: number;
}
export interface PlusRecordConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: PlusRecordTarget;
}
const capacities = { PA9: [340, 340, 360, 45] } as const;
export function validatePlusRecordCatalog(catalog: PlusRecordCatalog) {
  const limits = capacities[catalog.format];
  if (
    !limits ||
    !/^[A-F0-9]{64}$/.test(catalog.sourceHash) ||
    !Number.isInteger(catalog.species) ||
    catalog.species < 1 ||
    !Number.isInteger(catalog.form) ||
    catalog.form < 0 ||
    !Number.isInteger(catalog.level) ||
    catalog.level < 1 ||
    catalog.level > 100 ||
    typeof catalog.hasImpossibleFlags !== "boolean" ||
    catalog.countUsed !== limits[1] ||
    catalog.countTotal !== limits[2] ||
    catalog.rows.length !== limits[0] ||
    !new RegExp(`^[A-F0-9]{${limits[3] * 2}}$`).test(catalog.raw) ||
    new Set(catalog.rows.map((r) => r.index)).size !== limits[0] ||
    catalog.rows.some(
      (r) =>
        !Number.isInteger(r.index) ||
        r.index < 0 ||
        r.index >= limits[0] ||
        !Number.isInteger(r.move) ||
        r.move < 1 ||
        !Number.isInteger(r.type) ||
        r.type < 0 ||
        r.type > 18 ||
        typeof r.flag !== "boolean" ||
        typeof r.currentMove !== "boolean" ||
        typeof r.learnable !== "boolean" ||
        (["zh", "en", "ja"] as const).some(
          (lang) => !r.name?.[lang] || !r.typeName?.[lang],
        ),
    )
  )
    throw new Error("Invalid plus record catalog");
  return catalog;
}
export function plusRecordEdit(
  catalog: PlusRecordCatalog,
  action: PlusRecordAction,
  rows: PlusRecordRowEdit[],
): PlusRecordEdit {
  validatePlusRecordCatalog(catalog);
  if (
    ![
      "save",
      "legalCurrentTM",
      "legalSeedTM",
      "legalCurrent",
      "clearAfterSave",
      "none",
      "parentCurrent",
    ].includes(action)
  )
    throw new Error("Invalid plus record action");
  const count =
    action === "none" || action === "parentCurrent" ? 0 : catalog.rows.length;
  if (
    rows.length !== count ||
    new Set(rows.map((r) => r.index)).size !== count ||
    rows.some(
      (r) =>
        !Number.isInteger(r.index) ||
        r.index < 0 ||
        r.index >= catalog.rows.length ||
        typeof r.flag !== "boolean",
    )
  )
    throw new Error("Invalid plus record rows");
  return { action, rows: structuredClone(rows) };
}
export function plusRecordConfirmation(
  catalog: PlusRecordCatalog,
  target: PlusRecordTarget,
  ticket: PlusRecordTicket,
): PlusRecordConfirmation {
  validatePlusRecordCatalog(catalog);
  validatePlusRecordCatalog(ticket.before);
  validatePlusRecordCatalog(ticket.result);
  if (
    !/^plus-record:\d+$/.test(ticket.token) ||
    ticket.sourceHash !== catalog.sourceHash ||
    !/^[A-F0-9]{64}$/.test(ticket.targetHash) ||
    ticket.before.sourceHash !== ticket.sourceHash ||
    ticket.result.sourceHash !== ticket.targetHash ||
    ticket.result.format !== catalog.format ||
    ticket.result.species !== catalog.species ||
    ticket.result.form !== catalog.form ||
    ticket.result.level !== catalog.level ||
    (
      [
        "kind",
        "box",
        "slot",
        "fileName",
        "inputEncrypted",
        "useFileFormat",
      ] as const
    ).some((key) => ticket.target[key] !== target[key]) ||
    !Number.isInteger(ticket.changedBytes) ||
    ticket.changedBytes < 0 ||
    new Set(ticket.changedRows).size !== ticket.changedRows.length ||
    new Set(ticket.changedFlags).size !== ticket.changedFlags.length ||
    ticket.changedRows.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= catalog.rows.length,
    ) ||
    ticket.changedFlags.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= catalog.raw.length * 4,
    )
  )
    throw new Error("Plus record preview is stale or targets another entity");
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
    target: structuredClone(target),
  };
}
