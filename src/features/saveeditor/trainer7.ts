import type { LocalizedText, OriginChoice, SaveReport } from "./domain";
import type { Tr6Catalog } from "./trainer6";
import type { Hall6Trash } from "./hall6";
import type { Br4Lang } from "./br4";
export interface Tr7Field {
  key: string;
  group: string;
  name: LocalizedText;
  value: string;
  kind: "number" | "choice" | "text";
  maxLength: number;
  min: number;
  max: number;
  choices: OriginChoice[];
  editable: boolean;
}
export interface Tr7Catalog {
  canEdit: boolean;
  sourceHash: string;
  fields: Tr7Field[];
  existing: SaveReport["trainer"];
  basics: Tr6Catalog["basics"];
  nameTrash: string;
  position: Tr6Catalog["position"];
  characters: number[];
  trashSpecies: OriginChoice[];
  trashLanguages: OriginChoice[];
  ids: { tid: number; sid: number; id32: number; tsv: number };
}
export interface Tr7Value {
  key: string;
  value: string;
}
export interface Tr7Edit {
  action:
    | "patch"
    | "ids"
    | "resave"
    | "position"
    | "fashion"
    | "trash"
    | "flyAll"
    | "mapAll";
  sourceHash: string;
  fields?: Tr7Value[];
  targetHash?: string;
  uiLanguage?: Br4Lang;
  allowMismatchedSkin?: boolean;
  trash?: Hall6Trash;
  fashion?: "base" | "legal" | "all";
}
export interface Tr7Preview {
  request: Tr7Edit;
  result: Tr7Catalog;
  changedOffsets: number[];
  ignoredFields: string[];
}
export const supportsTrainer7 = (format: string) =>
  ["SAV7SM", "SAV7USUM"].includes(format);
function source(c: Tr7Catalog) {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Trainer7 is read-only.");
}
export function tr7Patch(
  c: Tr7Catalog,
  fields: Tr7Value[],
  allowMismatchedSkin = false,
): Tr7Edit {
  source(c);
  if (
    !fields.length ||
    fields.length > c.fields.length ||
    new Set(fields.map((v) => v.key)).size !== fields.length
  )
    throw Error("Invalid Trainer7 fields.");
  for (const row of fields) {
    const f = c.fields.find((v) => v.key === row.key);
    if (
      !f?.editable ||
      typeof row.value !== "string" ||
      row.value.length > f.maxLength
    )
      throw Error("Invalid Trainer7 field.");
    if (f.kind === "text") {
      if (
        [...row.value].some(
          (v) => v.charCodeAt(0) < 32 || v.charCodeAt(0) === 127,
        )
      )
        throw Error("Invalid Trainer7 text.");
      continue;
    }
    if (!/^\d+(?:\.0+)?$/.test(row.value))
      throw Error("Invalid Trainer7 decimal value.");
    const value = Number(row.value);
    if (
      !Number.isSafeInteger(value) ||
      value < f.min ||
      value > f.max ||
      (f.kind === "choice" && !f.choices.some((v) => v.id === value))
    )
      throw Error("Invalid Trainer7 number or choice.");
    if (
      f.key === "Skin" &&
      value !== Number(f.value) &&
      (value & 1) !== (c.basics.gender & 1) &&
      !allowMismatchedSkin
    )
      throw Error("Trainer7 gender/skin mismatch requires confirmation.");
  }
  return {
    action: "patch",
    sourceHash: c.sourceHash,
    fields,
    allowMismatchedSkin,
  };
}
export function tr7Action(
  c: Tr7Catalog,
  action: "resave" | "flyAll" | "mapAll",
): Tr7Edit {
  source(c);
  return { action, sourceHash: c.sourceHash };
}
export function tr7Fashion(
  c: Tr7Catalog,
  fashion: "base" | "legal" | "all",
): Tr7Edit {
  source(c);
  if (![0, 1].includes(c.basics.gender))
    throw Error("Trainer7 fashion requires a known gender.");
  return { action: "fashion", sourceHash: c.sourceHash, fashion };
}
export function tr7Position(
  c: Tr7Catalog,
  lang: Br4Lang,
  fields: Tr7Value[],
): Tr7Edit {
  source(c);
  if (
    !c.position.canEdit ||
    !fields.length ||
    fields.length > 5 ||
    new Set(fields.map((v) => v.key)).size !== fields.length ||
    fields.some(
      (v) =>
        !c.position.fields.some((f) => f.key === v.key) ||
        typeof v.value !== "string" ||
        v.value.length > 32767,
    )
  )
    throw Error("Invalid Trainer7 position fields.");
  return {
    action: "position",
    sourceHash: c.sourceHash,
    fields,
    uiLanguage: lang,
  };
}
export function tr7Trash(c: Tr7Catalog, trash: Hall6Trash): Tr7Edit {
  source(c);
  if (
    !["prepare", "text", "hex", "clear", "layer"].includes(trash.action) ||
    (trash.action === "text" &&
      (typeof trash.text !== "string" || trash.text.length > 12)) ||
    (trash.action === "hex" &&
      (typeof trash.hex !== "string" || !/^[0-9A-F]{52}$/i.test(trash.hex)))
  )
    throw Error("Invalid Trainer7 name trash.");
  if (
    trash.action === "layer" &&
    (!c.trashSpecies.some((v) => v.id === trash.species) ||
      !c.trashLanguages.some((v) => v.id === trash.language) ||
      !Number.isInteger(trash.generation) ||
      trash.generation! < 0 ||
      trash.generation! > 100 ||
      !["zh", "en", "ja"].includes(trash.uiLanguage ?? ""))
  )
    throw Error("Invalid Trainer7 trash layer.");
  if (
    (trash.action !== "layer" &&
      [trash.species, trash.language, trash.generation, trash.uiLanguage].some(
        (v) => v !== undefined,
      )) ||
    (trash.action !== "text" && trash.text !== undefined) ||
    (trash.action !== "hex" && trash.hex !== undefined)
  )
    throw Error("Invalid Trainer7 trash fields.");
  return { action: "trash", sourceHash: c.sourceHash, trash };
}
export function tr7Ids(c: Tr7Catalog, tid: string, sid: string): Tr7Edit {
  source(c);
  if (!/^\d{0,6}$/.test(tid) || !/^\d{0,4}$/.test(sid))
    throw Error("Invalid Trainer7 ID controls.");
  return {
    action: "ids",
    sourceHash: c.sourceHash,
    fields: [
      { key: "tid", value: tid },
      { key: "sid", value: sid },
    ],
  };
}
export function tr7Frozen(c: Tr7Catalog, p: Tr7Preview): Tr7Edit {
  source(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash
  )
    throw Error("Trainer7 preview is stale.");
  return p.request;
}
