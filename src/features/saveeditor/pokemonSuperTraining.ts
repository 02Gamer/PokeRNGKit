// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export interface SuperTrainingDraft {
  regular: boolean[];
  distribution: boolean[];
  unlocked: boolean;
  complete: boolean;
  bag: number | null;
  hits: number | null;
}
export interface SuperTrainingRow {
  index: number;
  distribution: boolean;
  flag: boolean;
  storedFlag: boolean;
  enabled: boolean;
  name: LocalizedText;
}
export interface SuperTrainingCatalog {
  sourceHash: string;
  format: "PK6" | "PK7";
  hasBag: boolean;
  rows: SuperTrainingRow[];
  bags: { index: number; name: LocalizedText }[];
  draft: SuperTrainingDraft;
  stored: SuperTrainingDraft;
  raw: string;
}
export interface SuperTrainingTarget {
  kind: "save" | "file";
  box: number;
  slot: number;
  fileName: string | null;
  inputEncrypted: boolean;
  useFileFormat: boolean;
}
export type SuperTrainingEvent = {
  kind:
    | "regular"
    | "distribution"
    | "unlocked"
    | "complete"
    | "bag"
    | "hits"
    | "all"
    | "none";
  index: number;
  value: number;
};
export interface SuperTrainingEdit {
  events: SuperTrainingEvent[];
}
export interface SuperTrainingRequest {
  sourceHash: string;
  target: SuperTrainingTarget;
  edit: SuperTrainingEdit;
}
export interface SuperTrainingConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: SuperTrainingTarget;
}
export interface SuperTrainingTicket extends SuperTrainingConfirmation {
  before: SuperTrainingCatalog;
  result: SuperTrainingCatalog;
  changedRows: number[];
  changedFields: ("unlocked" | "complete" | "bag" | "hits")[];
  changedFlags: number[];
  changedBytes: number;
}
const languages = ["zh", "en", "ja"] as const;
const hasNames = (value: LocalizedText) =>
  languages.every(
    (lang) => typeof value?.[lang] === "string" && value[lang].length > 0,
  );
export function validateSuperTrainingCatalog(c: SuperTrainingCatalog) {
  const draftValid = (d: SuperTrainingDraft, stored: boolean) =>
    d &&
    d.regular.length === 30 &&
    d.distribution.length === 6 &&
    [...d.regular, ...d.distribution, d.unlocked, d.complete].every(
      (v) => typeof v === "boolean",
    ) &&
    (c.hasBag
      ? Number.isInteger(d.bag) &&
        d.bag! >= 0 &&
        d.bag! <= (stored ? 255 : c.bags.length - 1) &&
        Number.isInteger(d.hits) &&
        d.hits! >= 0 &&
        d.hits! <= 255
      : d.bag === null && d.hits === null);
  if (
    !["PK6", "PK7"].includes(c.format) ||
    c.hasBag !== (c.format === "PK6") ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !new RegExp(`^[A-F0-9]{${c.hasBag ? 18 : 14}}$`).test(c.raw) ||
    c.rows.length !== 36 ||
    !draftValid(c.draft, false) ||
    !draftValid(c.stored, true) ||
    c.bags.length !== (c.hasBag ? 27 : 0) ||
    c.bags.some((b, i) => b.index !== i || !hasNames(b.name)) ||
    c.rows.some(
      (r, i) =>
        r.index !== (i < 30 ? i : i - 30) ||
        r.distribution !== i >= 30 ||
        typeof r.flag !== "boolean" ||
        typeof r.storedFlag !== "boolean" ||
        r.enabled !== (!c.hasBag || i < 18 || i >= 30 || c.draft.unlocked) ||
        r.flag !==
          (i < 30 ? c.draft.regular[i] : c.draft.distribution[i - 30]) ||
        r.storedFlag !==
          (i < 30 ? c.stored.regular[i] : c.stored.distribution[i - 30]) ||
        !hasNames(r.name),
    )
  )
    throw Error("Invalid Pokemon SuperTraining catalog");
  return c;
}
export function superTrainingDraft(
  c: SuperTrainingCatalog,
  events: SuperTrainingEvent[],
) {
  validateSuperTrainingCatalog(c);
  if (events.length > 512) throw Error("Too many SuperTraining events");
  const draft = structuredClone(c.draft);
  for (const e of events) {
    if (!Number.isInteger(e.index) || !Number.isInteger(e.value))
      throw Error("Invalid SuperTraining event");
    const flag = e.value === 1;
    switch (e.kind) {
      case "regular":
        if (
          e.index < 0 ||
          e.index >= 30 ||
          ![0, 1].includes(e.value) ||
          (c.hasBag && e.index >= 18 && !draft.unlocked)
        )
          throw Error("Disabled training");
        draft.regular[e.index] = flag;
        break;
      case "distribution":
        if (e.index < 0 || e.index >= 6 || ![0, 1].includes(e.value))
          throw Error("Invalid distribution");
        draft.distribution[e.index] = flag;
        break;
      case "unlocked":
        if (!c.hasBag || ![0, 1].includes(e.value)) throw Error("Hidden state");
        draft.unlocked = flag;
        draft.complete &&= flag;
        if (!flag) draft.regular.fill(false, 18);
        break;
      case "complete":
        if (!c.hasBag || !draft.unlocked || ![0, 1].includes(e.value))
          throw Error("Disabled completion");
        draft.complete = flag;
        break;
      case "bag":
        if (!c.hasBag || e.value < 0 || e.value >= c.bags.length)
          throw Error("Invalid bag");
        draft.bag = e.value;
        break;
      case "hits":
        if (!c.hasBag || e.value < 0 || e.value > 255)
          throw Error("Invalid hits");
        draft.hits = e.value;
        break;
      case "all":
        if (draft.unlocked) draft.distribution.fill(true);
        if (c.hasBag) {
          draft.unlocked = true;
          draft.complete = true;
        }
        draft.regular.fill(true);
        break;
      case "none":
        draft.unlocked = false;
        draft.complete = false;
        draft.regular.fill(false);
        draft.distribution.fill(false);
        break;
      default:
        throw Error("Unknown SuperTraining event");
    }
  }
  return draft;
}
export function superTrainingConfirmation(
  c: SuperTrainingCatalog,
  target: SuperTrainingTarget,
  t: SuperTrainingTicket,
): SuperTrainingConfirmation {
  validateSuperTrainingCatalog(c);
  validateSuperTrainingCatalog(t.before);
  validateSuperTrainingCatalog(t.result);
  if (
    !/^super-training:\d+$/.test(t.token) ||
    t.sourceHash !== c.sourceHash ||
    t.before.sourceHash !== t.sourceHash ||
    !/^[A-F0-9]{64}$/.test(t.targetHash) ||
    t.result.sourceHash !== t.targetHash ||
    t.result.format !== c.format ||
    (
      [
        "kind",
        "box",
        "slot",
        "fileName",
        "inputEncrypted",
        "useFileFormat",
      ] as const
    ).some((key) => t.target[key] !== target[key]) ||
    !Number.isInteger(t.changedBytes) ||
    t.changedBytes < 0 ||
    new Set(t.changedRows).size !== t.changedRows.length ||
    t.changedRows.some((i) => !Number.isInteger(i) || i < 0 || i >= 36) ||
    new Set(t.changedFlags).size !== t.changedFlags.length ||
    t.changedFlags.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= c.raw.length * 4,
    ) ||
    new Set(t.changedFields).size !== t.changedFields.length ||
    t.changedFields.some(
      (k) => !["unlocked", "complete", "bag", "hits"].includes(k),
    )
  )
    throw Error("Invalid SuperTraining frozen preview");
  return {
    token: t.token,
    sourceHash: t.sourceHash,
    targetHash: t.targetHash,
    target: structuredClone(target),
  };
}
