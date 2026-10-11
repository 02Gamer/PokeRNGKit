import type { TrGGField } from "./trainerGG";
import type { Tr6Catalog } from "./trainer6";
import type { OriginChoice } from "./domain";
import type { Hall6Trash } from "./hall6";
export interface Tr8aCatalog {
  canEdit: boolean;
  sourceHash: string;
  fields: TrGGField[];
  ids: { tid: number; sid: number; id32: number; tsv: number };
  position: Tr6Catalog["position"];
  map: string;
  nameTrash: string;
  coordinateRaw: string;
  startedRaw: string;
  savedRaw: string;
  characters: number[];
  trashSpecies: OriginChoice[];
  trashLanguages: OriginChoice[];
}
export interface Tr8aEdit {
  action: "patch" | "ids" | "position" | "resave" | "trash";
  sourceHash: string;
  fields?: { key: string; value: string }[];
  targetHash?: string;
  uiLanguage?: "zh" | "en" | "ja";
  trash?: Hall6Trash;
}
export interface Tr8aPreview {
  request: Tr8aEdit;
  result: Tr8aCatalog;
  changedOffsets: number[];
  ignoredFields: string[];
}
export const supportsTrainer8a = (format: string) => format === "SAV8LA";
export function tr8aDate(text: string): string {
  const value = text.length === 16 ? text + ":00" : text;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value))
    throw Error("Invalid Trainer8a date.");
  const date = new Date(value + "Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 19) !== value ||
    value < "2000-01-01T00:00:00" ||
    value > "2099-12-31T23:59:59"
  )
    throw Error("Invalid Trainer8a date.");
  return value;
}
export function tr8aRequest(
  c: Tr8aCatalog,
  action: Tr8aEdit["action"],
  fields?: Tr8aEdit["fields"],
): Tr8aEdit {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Trainer8a is read-only.");
  if (!["patch", "ids", "position", "resave", "trash"].includes(action))
    throw Error("Invalid Trainer8a action.");
  if (
    ["patch", "ids", "position"].includes(action) &&
    (!fields?.length ||
      new Set(fields.map((v) => v.key)).size !== fields.length)
  )
    throw Error("Invalid Trainer8a field list.");
  if (action === "patch")
    for (const v of fields ?? []) {
      const f = c.fields.find((f) => f.key === v.key);
      if (!f || v.value.length > f.maxLength)
        throw Error("Invalid Trainer8a field.");
      if (f.kind === "number" || f.kind === "choice") {
        const n = Number(v.value || "0");
        if (
          !/^\d*$/.test(v.value) ||
          !Number.isSafeInteger(n) ||
          n < Number(f.min) ||
          n > Number(f.max) ||
          (f.kind === "choice" && !f.choices.some((o) => o.id === n))
        )
          throw Error("Invalid Trainer8a number.");
      }
      if (f.kind === "date") tr8aDate(v.value);
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
    throw Error("Invalid Trainer8a IDs.");
  if (
    action === "position" &&
    (!c.position.canEdit ||
      fields?.some(
        (v) =>
          !["map", "x", "z", "y", "rotation"].includes(v.key) ||
          v.value.length > (v.key === "map" ? 48 : 32767),
      ))
  )
    throw Error("Invalid Trainer8a coordinates.");
  return { action, sourceHash: c.sourceHash, fields };
}
export function tr8aFrozen(c: Tr8aCatalog, p: Tr8aPreview): Tr8aEdit {
  tr8aRequest(c, p.request.action, p.request.fields);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash
  )
    throw Error("Trainer8a preview is stale.");
  return p.request;
}
