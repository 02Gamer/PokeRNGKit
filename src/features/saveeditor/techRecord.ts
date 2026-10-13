// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export interface TechRecordRow {
  index: number;
  number: number;
  move: number;
  type: number;
  flag: boolean;
  permission: "current" | "evolution" | "suspect";
  currentMove: boolean;
  name: LocalizedText;
  typeName: LocalizedText;
}
export interface TechRecordCatalog {
  sourceHash: string;
  format: "PK8" | "PB8" | "PA8" | "PK9" | "PA9";
  species: number;
  form: number;
  level: number;
  countUsed: number;
  countTotal: number;
  rows: TechRecordRow[];
  raw: string;
}
export type TechRecordAction =
  | "save"
  | "legalAll"
  | "forceAll"
  | "legalCurrent"
  | "clearAfterSave"
  | "none"
  | "parentCurrent";
export interface TechRecordRowEdit {
  index: number;
  flag: boolean;
}
export interface TechRecordEdit {
  action: TechRecordAction;
  rows: TechRecordRowEdit[];
}
export interface TechRecordTarget {
  kind: "file" | "save";
  box: number;
  slot: number;
  fileName: string | null;
  inputEncrypted: boolean;
  useFileFormat: boolean;
}
export interface TechRecordTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: TechRecordTarget;
  before: TechRecordCatalog;
  result: TechRecordCatalog;
  changedRows: number[];
  changedFlags: number[];
  changedBytes: number;
}
export interface TechRecordConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: TechRecordTarget;
}
const capacities = {
  PK8: [100, 100, 112, 14],
  PB8: [100, 100, 112, 14],
  PA8: [61, 61, 64, 14],
  PK9: [230, 230, 304, 38],
  PA9: [160, 230, 304, 38],
} as const;
export function validateTechRecordCatalog(catalog: TechRecordCatalog) {
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
        r.number !== r.index + (catalog.format === "PA9" ? 1 : 0) ||
        !Number.isInteger(r.move) ||
        r.move < 1 ||
        !Number.isInteger(r.type) ||
        r.type < 0 ||
        r.type > 18 ||
        typeof r.flag !== "boolean" ||
        typeof r.currentMove !== "boolean" ||
        !["current", "evolution", "suspect"].includes(r.permission) ||
        (["zh", "en", "ja"] as const).some(
          (lang) => !r.name?.[lang] || !r.typeName?.[lang],
        ),
    )
  )
    throw new Error("Invalid technical record catalog");
  return catalog;
}
export function techRecordEdit(
  catalog: TechRecordCatalog,
  action: TechRecordAction,
  rows: TechRecordRowEdit[],
): TechRecordEdit {
  validateTechRecordCatalog(catalog);
  if (
    ![
      "save",
      "legalAll",
      "forceAll",
      "legalCurrent",
      "clearAfterSave",
      "none",
      "parentCurrent",
    ].includes(action)
  )
    throw new Error("Invalid technical record action");
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
    throw new Error("Invalid technical record rows");
  return { action, rows: structuredClone(rows) };
}
export function techRecordConfirmation(
  catalog: TechRecordCatalog,
  target: TechRecordTarget,
  ticket: TechRecordTicket,
): TechRecordConfirmation {
  validateTechRecordCatalog(catalog);
  validateTechRecordCatalog(ticket.before);
  validateTechRecordCatalog(ticket.result);
  if (
    !/^tech-record:\d+$/.test(ticket.token) ||
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
    throw new Error(
      "Technical record preview is stale or targets another entity",
    );
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
    target: structuredClone(target),
  };
}
