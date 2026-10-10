import type { LocalizedText, OriginChoice } from "./domain";
import type { Tr6Catalog } from "./trainer6";
import type { Hall6Trash } from "./hall6";
import type { Br4Lang } from "./br4";
export interface TrGGField {
  key: string;
  name: LocalizedText;
  value: string;
  kind: "number" | "choice" | "text" | "date";
  maxLength: number;
  min: string;
  max: string;
  choices: OriginChoice[];
  editable: boolean;
}
export interface GoParkEntry {
  index: number;
  species: number;
  form: number;
  gender: number;
  shiny: boolean;
  name: LocalizedText;
  sprite: string;
  nickname: string;
  level: number;
  levelRaw: string;
  cp: number;
  hp: number;
  ivs: number[];
  date: number;
  city: string;
  username1: string;
  username2: string;
  moves: number[];
  moveNames: LocalizedText[];
  height: string;
  weight: string;
}
export interface TrGGCatalog {
  canEdit: boolean;
  sourceHash: string;
  fields: TrGGField[];
  ids: { tid: number; sid: number; id32: number; tsv: number };
  position: Tr6Catalog["position"];
  nameTrash: string;
  rivalTrash: string;
  characters: number[];
  trashSpecies: OriginChoice[];
  trashLanguages: OriginChoice[];
  park: GoParkEntry[];
  titleCount: number;
}
export interface GoParkFile {
  name: string;
  data: string;
}
export interface TrGGEdit {
  action:
    | "patch"
    | "ids"
    | "position"
    | "resave"
    | "titles"
    | "fashion"
    | "trash"
    | "parkImport"
    | "parkBatch"
    | "parkDelete"
    | "parkClear";
  sourceHash: string;
  targetHash?: string;
  fields?: { key: string; value: string }[];
  uiLanguage?: Br4Lang;
  index?: number;
  files?: GoParkFile[];
  nameTarget?: "name" | "rival";
  trash?: Hall6Trash;
}
export interface TrGGPreview {
  request: TrGGEdit;
  result: TrGGCatalog;
  changedOffsets: number[];
  ignoredFields: string[];
  receipt: {
    placements: { file: number; index: number }[];
    skipped: { file: number; reason: "size" | "extension" }[];
    unplaced: number[];
  } | null;
}
export interface GoParkExport {
  index: number;
  name: string;
  data: string;
}
export const supportsTrainerGG = (format: string) => format === "SAV7b";
export function ggChangedParkSlots(offsets: readonly number[]) {
  return [
    ...new Set(
      offsets
        .filter((v) => v >= 0x4e200 && v < 0x4e200 + 432000)
        .map((v) => Math.floor((v - 0x4e200) / 432)),
    ),
  ];
}
function source(c: TrGGCatalog) {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("TrainerGG is read-only.");
}
export function ggPatch(
  c: TrGGCatalog,
  fields: NonNullable<TrGGEdit["fields"]>,
): TrGGEdit {
  source(c);
  if (
    !fields.length ||
    fields.length > c.fields.length ||
    new Set(fields.map((v) => v.key)).size !== fields.length
  )
    throw Error("Invalid TrainerGG fields.");
  for (const row of fields) {
    const f = c.fields.find((v) => v.key === row.key);
    if (
      !f?.editable ||
      typeof row.value !== "string" ||
      row.value.length > f.maxLength
    )
      throw Error("Invalid TrainerGG field.");
    if (f.kind === "text") {
      if (
        [...row.value].some(
          (v) => v.charCodeAt(0) < 32 || v.charCodeAt(0) === 127,
        )
      )
        throw Error("Invalid TrainerGG name.");
    } else if (f.kind === "date") {
      if (
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(row.value) ||
        !Number.isFinite(Date.parse(row.value + "Z")) ||
        new Date(row.value + "Z").toISOString().slice(0, 19) !== row.value ||
        row.value < f.min ||
        row.value > f.max
      )
        throw Error("Invalid TrainerGG date.");
    } else {
      const empty = ["money", "minutes", "seconds"].includes(row.key);
      if (!(empty ? /^\d*$/ : /^\d+$/).test(row.value))
        throw Error("Invalid TrainerGG number.");
      const n = Number(row.value || 0);
      if (
        !Number.isSafeInteger(n) ||
        n < Number(f.min) ||
        n > Number(f.max) ||
        (f.kind === "choice" && !f.choices.some((v) => v.id === n))
      )
        throw Error("Invalid TrainerGG choice or number.");
    }
  }
  return { action: "patch", sourceHash: c.sourceHash, fields };
}
export function ggIds(c: TrGGCatalog, tid: string, sid: string): TrGGEdit {
  source(c);
  if (!/^\d{0,6}$/.test(tid) || !/^\d{0,4}$/.test(sid))
    throw Error("Invalid TrainerGG ID controls.");
  return {
    action: "ids",
    sourceHash: c.sourceHash,
    fields: [
      { key: "tid", value: tid },
      { key: "sid", value: sid },
    ],
  };
}
export function ggAction(
  c: TrGGCatalog,
  action: "resave" | "titles" | "fashion" | "parkClear",
): TrGGEdit {
  source(c);
  return { action, sourceHash: c.sourceHash };
}
export function ggPosition(
  c: TrGGCatalog,
  fields: NonNullable<TrGGEdit["fields"]>,
  lang: Br4Lang,
): TrGGEdit {
  source(c);
  if (
    !c.position.canEdit ||
    !fields.length ||
    fields.length > 8 ||
    new Set(fields.map((v) => v.key)).size !== fields.length ||
    fields.some(
      (v) =>
        !c.position.fields.some((f) => f.key === v.key) ||
        typeof v.value !== "string" ||
        v.value.length > 32767,
    )
  )
    throw Error("Invalid TrainerGG position.");
  return {
    action: "position",
    sourceHash: c.sourceHash,
    fields,
    uiLanguage: lang,
  };
}
function index(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 999)
    throw Error("Invalid TrainerGG GO Park index.");
}
export function ggDelete(c: TrGGCatalog, value: number): TrGGEdit {
  source(c);
  index(value);
  return { action: "parkDelete", sourceHash: c.sourceHash, index: value };
}
export function ggImport(
  c: TrGGCatalog,
  value: number,
  files: GoParkFile[],
  batch = false,
): TrGGEdit {
  source(c);
  index(value);
  if (
    !files.length ||
    files.length > 1000 ||
    (!batch && files.length !== 1) ||
    files.some(
      (f) =>
        typeof f.name !== "string" ||
        !f.name.length ||
        f.name.length > 255 ||
        typeof f.data !== "string",
    )
  )
    throw Error("Invalid TrainerGG GP1 files.");
  const request: TrGGEdit = {
    action: batch ? "parkBatch" : "parkImport",
    sourceHash: c.sourceHash,
    index: value,
    files,
  };
  if (JSON.stringify(request).length > 2300000)
    throw Error("TrainerGG import request too large.");
  return request;
}
export function ggTrash(
  c: TrGGCatalog,
  target: "name" | "rival",
  trash: Hall6Trash,
): TrGGEdit {
  source(c);
  if (
    !["name", "rival"].includes(target) ||
    !["prepare", "text", "hex", "clear", "layer"].includes(trash.action) ||
    (trash.action === "text" &&
      (typeof trash.text !== "string" || trash.text.length > 12)) ||
    (trash.action === "hex" &&
      (typeof trash.hex !== "string" || !/^[0-9a-f]{52}$/i.test(trash.hex))) ||
    (trash.action === "layer" &&
      (!c.trashSpecies.some((v) => v.id === trash.species) ||
        !c.trashLanguages.some((v) => v.id === trash.language) ||
        !Number.isInteger(trash.generation) ||
        trash.generation! < 0 ||
        trash.generation! > 100 ||
        !["zh", "en", "ja"].includes(trash.uiLanguage ?? "")))
  )
    throw Error("Invalid TrainerGG name trash.");
  if (
    (trash.action !== "text" && trash.text !== undefined) ||
    (trash.action !== "hex" && trash.hex !== undefined) ||
    (trash.action !== "layer" &&
      [trash.species, trash.language, trash.generation, trash.uiLanguage].some(
        (v) => v !== undefined,
      ))
  )
    throw Error("Invalid TrainerGG trash fields.");
  return {
    action: "trash",
    sourceHash: c.sourceHash,
    nameTarget: target,
    trash,
  };
}
export function ggFrozen(c: TrGGCatalog, p: TrGGPreview): TrGGEdit {
  source(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash
  )
    throw Error("TrainerGG preview is stale.");
  return p.request;
}
