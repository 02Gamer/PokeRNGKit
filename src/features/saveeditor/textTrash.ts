// SPDX-License-Identifier: GPL-3.0-or-later
import type { OriginChoice } from "./domain";

export type TextTrashField = "nickname" | "originalTrainer" | "handlingTrainer";
export interface TextTrashTarget {
  kind: "save" | "file";
  field: TextTrashField;
  box: number;
  slot: number;
  fileName: string | null;
  inputEncrypted: boolean;
  useFileFormat: boolean;
}
export interface TextTrashEvent {
  kind: "text" | "character" | "byte" | "clear" | "layer";
  text?: string;
  index?: number;
  value?: number;
  species?: number;
  language?: number;
  generation?: number;
  uiLanguage?: "zh" | "en" | "ja";
}
export interface TextTrashDraft {
  field: TextTrashField;
  initialText: string;
  text: string;
  hex: string;
  maxLength: number;
  characters: number[];
}
export interface TextTrashCatalog {
  sourceHash: string;
  format: string;
  generation: number;
  canEdit: boolean;
  field: TextTrashField;
  storedText: string;
  storedHex: string;
  draft: TextTrashDraft;
  species: OriginChoice[];
  languages: OriginChoice[];
}
export interface TextTrashRequest {
  sourceHash: string;
  target: TextTrashTarget;
  initialText: string;
  events: TextTrashEvent[];
}
export interface TextTrashConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: TextTrashTarget;
}
export interface TextTrashTicket extends TextTrashConfirmation {
  before: TextTrashCatalog;
  result: TextTrashCatalog;
  changedNameBytes: number[];
  changedBytes: number;
}
const fields: TextTrashField[] = [
  "nickname",
  "originalTrainer",
  "handlingTrainer",
];
const formats = [
  "PK1",
  "PK2",
  "PK3",
  "CK3",
  "XK3",
  "PK4",
  "BK4",
  "PK5",
  "PK6",
  "PK7",
  "PB7",
  "PK8",
  "PB8",
  "PA8",
  "PK9",
  "PA9",
];
const hash = (v: string) => typeof v === "string" && /^[\da-f]{64}$/i.test(v);
const hex = (v: string) =>
  typeof v === "string" && v.length <= 128 && /^(?:[\da-f]{2})*$/i.test(v);
const text = (v: string) => typeof v === "string" && v.length <= 64;
function choices(values: OriginChoice[]) {
  return (
    Array.isArray(values) &&
    values.length <= 8192 &&
    new Set(values.map((v) => v.id)).size === values.length &&
    values.every(
      (v) =>
        Number.isInteger(v.id) &&
        v.id >= 0 &&
        ["zh", "en", "ja"].every(
          (lang) => typeof v.name?.[lang as "zh"] === "string",
        ),
    )
  );
}
export function validateTextTrashDraft(d: TextTrashDraft, width?: number) {
  if (
    !d ||
    !fields.includes(d.field) ||
    !text(d.initialText) ||
    !text(d.text) ||
    !hex(d.hex) ||
    (width !== undefined && d.hex.length !== width) ||
    !Number.isInteger(d.maxLength) ||
    d.maxLength < 1 ||
    d.maxLength > 12 ||
    !Array.isArray(d.characters) ||
    d.characters.length > 64 ||
    new Set(d.characters).size !== d.characters.length ||
    d.characters.some((v) => !Number.isInteger(v) || v < 1 || v > 65535)
  )
    throw Error("Invalid name-byte draft");
  return d;
}
export function validateTextTrashCatalog(c: TextTrashCatalog) {
  if (
    !c ||
    !hash(c.sourceHash) ||
    !formats.includes(c.format) ||
    !Number.isInteger(c.generation) ||
    c.generation < 1 ||
    c.generation > 9 ||
    typeof c.canEdit !== "boolean" ||
    !fields.includes(c.field) ||
    !text(c.storedText) ||
    !hex(c.storedHex) ||
    !choices(c.species) ||
    !choices(c.languages)
  )
    throw Error("Invalid name-byte catalog");
  validateTextTrashDraft(c.draft, c.storedHex.length);
  if (c.draft.field !== c.field) throw Error("Name-byte field mismatch");
  return c;
}
export function validateTextTrashRequest(
  c: TextTrashCatalog,
  target: TextTrashTarget,
  initialText: string,
  events: TextTrashEvent[],
): TextTrashRequest {
  validateTextTrashCatalog(c);
  if (
    !c.canEdit ||
    target.field !== c.field ||
    !text(initialText) ||
    (initialText.length > c.draft.maxLength && initialText !== c.storedText) ||
    !Array.isArray(events) ||
    events.length > 512
  )
    throw Error("Invalid name-byte request");
  for (const e of events) {
    if (!e) throw Error("Missing name-byte event");
    switch (e.kind) {
      case "text":
        if (typeof e.text !== "string" || e.text.length > c.draft.maxLength)
          throw Error("Name exceeds source limit");
        break;
      case "character":
        if (!c.draft.characters.includes(e.value ?? 0))
          throw Error("Unavailable source character");
        break;
      case "byte":
        if (
          !Number.isInteger(e.index) ||
          e.index! < 0 ||
          e.index! >= c.storedHex.length / 2 ||
          !Number.isInteger(e.value) ||
          e.value! < 0 ||
          e.value! > 255
        )
          throw Error("Invalid physical name byte");
        break;
      case "clear":
        if (!c.storedHex.length) throw Error("Name has no byte buffer");
        break;
      case "layer":
        if (
          !c.storedHex.length ||
          !c.species.some((v) => v.id === e.species) ||
          !c.languages.some((v) => v.id === e.language) ||
          !Number.isInteger(e.generation) ||
          e.generation! < 0 ||
          e.generation! > 100 ||
          !["zh", "en", "ja"].includes(e.uiLanguage ?? "")
        )
          throw Error("Invalid source name layer");
        break;
      default:
        throw Error("Unknown name-byte event");
    }
  }
  return {
    sourceHash: c.sourceHash,
    target: structuredClone(target),
    initialText,
    events: structuredClone(events),
  };
}
export function textTrashConfirmation(
  c: TextTrashCatalog,
  target: TextTrashTarget,
  t: TextTrashTicket,
): TextTrashConfirmation {
  validateTextTrashCatalog(c);
  validateTextTrashCatalog(t.before);
  validateTextTrashCatalog(t.result);
  const keys = [
    "kind",
    "field",
    "box",
    "slot",
    "fileName",
    "inputEncrypted",
    "useFileFormat",
  ] as const;
  const actual = Array.from(
    { length: c.storedHex.length / 2 },
    (_, i) => i,
  ).filter(
    (i) =>
      t.before.storedHex.slice(i * 2, i * 2 + 2).toUpperCase() !==
      t.result.storedHex.slice(i * 2, i * 2 + 2).toUpperCase(),
  );
  if (
    !/^text-trash:\d+$/.test(t.token) ||
    !hash(t.targetHash) ||
    t.sourceHash !== c.sourceHash ||
    t.before.sourceHash !== c.sourceHash ||
    t.result.sourceHash !== t.targetHash ||
    t.before.storedHex !== c.storedHex ||
    t.before.field !== target.field ||
    t.result.field !== target.field ||
    t.result.format !== c.format ||
    t.result.storedHex.length !== c.storedHex.length ||
    keys.some((k) => t.target[k] !== target[k]) ||
    !Number.isInteger(t.changedBytes) ||
    t.changedBytes < 0 ||
    !Array.isArray(t.changedNameBytes) ||
    t.changedNameBytes.length !== actual.length ||
    t.changedNameBytes.some((v, i) => v !== actual[i])
  )
    throw Error("Invalid name-byte frozen preview");
  return {
    token: t.token,
    sourceHash: t.sourceHash,
    targetHash: t.targetHash,
    target: structuredClone(target),
  };
}
