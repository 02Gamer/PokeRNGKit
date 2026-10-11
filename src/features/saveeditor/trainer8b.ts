import type { LocalizedText, SaveReport } from "./domain";
import type { Hall6Trash } from "./hall6";
export interface Tr8bField {
  key: string;
  name: LocalizedText;
  value: string;
  kind: "text" | "number" | "choice" | "date";
  maxLength: number;
  min: string;
  max: string;
  choices: { id: number; name: LocalizedText }[];
  editable: boolean;
}
export interface Tr8bCatalog {
  canEdit: boolean;
  sourceHash: string;
  fields: Tr8bField[];
  ids: { tid: number; sid: number; id32: number; tsv: number };
  existing: SaveReport["trainer"];
  nameTrash: string;
  rivalTrash: string;
  startTicks: string;
  savedTicks: string;
  recordAddRaw: string;
  characters: number[];
  trashSpecies: { id: number; name: LocalizedText }[];
  trashLanguages: { id: number; name: LocalizedText }[];
}
export interface Tr8bEdit {
  action: "patch" | "ids" | "position" | "resave" | "trash";
  sourceHash: string;
  fields?: { key: string; value: string }[];
  targetHash?: string;
  nameTarget?: "name" | "rival";
  trash?: Hall6Trash;
  uiLanguage?: "zh" | "en" | "ja";
}
export interface Tr8bPreview {
  request: Tr8bEdit;
  result: Tr8bCatalog;
  changedOffsets: number[];
}
export const supportsTrainer8b = (format: string) => format === "SAV8BS";
export function tr8bRequest(
  c: Tr8bCatalog,
  action: Tr8bEdit["action"],
  fields?: Tr8bEdit["fields"],
): Tr8bEdit {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Trainer8b is read-only.");
  if (!["patch", "ids", "position", "resave", "trash"].includes(action))
    throw Error("Invalid Trainer8b action.");
  if (
    ["patch", "ids", "position"].includes(action) &&
    (!fields?.length ||
      new Set(fields.map((v) => v.key)).size !== fields.length)
  )
    throw Error("Invalid Trainer8b fields.");
  if (action === "patch")
    for (const v of fields ?? []) {
      const f = c.fields.find((f) => f.key === v.key);
      if (!f || !f.editable || v.value.length > f.maxLength)
        throw Error("Invalid Trainer8b field.");
      if (f.kind === "number" || f.kind === "choice") {
        const n = Number(v.value || "0");
        if (
          !/^\d*$/.test(v.value) ||
          !Number.isSafeInteger(n) ||
          n < Number(f.min) ||
          n > Number(f.max) ||
          (f.kind === "choice" && !f.choices.some((o) => o.id === n))
        )
          throw Error("Invalid Trainer8b number.");
      }
    }
  if (
    action === "ids" &&
    (fields?.length !== 2 ||
      fields.some(
        (v) =>
          !["tid", "sid"].includes(v.key) ||
          !/^\d*$/.test(v.value) ||
          v.value.length > (v.key === "tid" ? 6 : 4),
      ))
  )
    throw Error("Invalid Trainer8b IDs.");
  return { action, sourceHash: c.sourceHash, fields };
}
export function tr8bFrozen(c: Tr8bCatalog, p: Tr8bPreview): Tr8bEdit {
  tr8bRequest(c, p.request.action, p.request.fields);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash
  )
    throw Error("Trainer8b preview is stale.");
  return p.request;
}
// Date controls use wall-clock local time; requests carry the browser's offset explicitly.
export function tr8bLocalDate(utc: string): string {
  const date = new Date(utc);
  if (!Number.isFinite(date.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}
export function tr8bOffsetDate(local: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) local += ":00";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(local))
    throw Error("Invalid Trainer8b local date.");
  const date = new Date(local);
  if (
    !Number.isFinite(date.getTime()) ||
    tr8bLocalDate(date.toISOString()) !== local
  )
    throw Error("Invalid Trainer8b local date.");
  const offset = -date.getTimezoneOffset(),
    p = (n: number) => String(n).padStart(2, "0");
  return `${local}${offset < 0 ? "-" : "+"}${p(Math.floor(Math.abs(offset) / 60))}:${p(Math.abs(offset) % 60)}`;
}
