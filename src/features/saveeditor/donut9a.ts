import type { LocalizedText, OriginChoice } from "./domain";
import type { Br4Lang } from "./br4";
export interface Dn9aFlavor {
  id: number;
  hash: string;
  name: LocalizedText;
  sprite: string;
  generatorAllowed: boolean;
}
export interface Dn9aEntry {
  index: number;
  canLoad: boolean;
  hasMilliseconds: boolean;
  stars: number;
  levelBoost: number;
  donut: number;
  calories: number;
  berries: number[];
  flavors: string[];
  date: string;
  milliseconds: string;
  raw: string;
  profile: number[];
  scale: number[];
  sprite: string;
}
export interface Dn9aCatalog {
  canEdit: boolean;
  sourceHash: string;
  entries: Dn9aEntry[];
  donuts: OriginChoice[];
  berries: OriginChoice[];
  flavors: Dn9aFlavor[];
}
export type Dn9aAction =
  | "patch"
  | "resave"
  | "reset"
  | "clone"
  | "import"
  | "hex"
  | "randomLv3"
  | "shiny"
  | "generate";
export type Dn9aExportMode = "file" | "text" | "clipboard";
export interface Dn9aEdit {
  action: Dn9aAction;
  sourceHash: string;
  index: number;
  fields?: { key: string; value: string }[];
  hex?: string;
  start?: number;
  end?: number;
  flavors?: number[];
  now?: string;
  uiLanguage?: Br4Lang;
}
export interface Dn9aTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  result: Dn9aCatalog;
  changedEntries: number[];
  changedOffsets: number[];
  ignoredFields: string[];
}
export interface Dn9aConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export const supportsDonut9a = (format: string) => format === "SAV9ZA";
const hash = (text: string) => /^[0-9A-F]{64}$/.test(text);
export function donut9aWallClock(date = new Date()): string {
  if (!Number.isFinite(date.getTime()))
    throw Error("Invalid Donut9a browser time.");
  const n = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${n(date.getFullYear(), 4)}-${n(date.getMonth() + 1)}-${n(date.getDate())}T${n(date.getHours())}:${n(date.getMinutes())}:${n(date.getSeconds())}.${n(date.getMilliseconds(), 3)}`;
}
export function donut9aRequest(
  c: Dn9aCatalog,
  e: Omit<Dn9aEdit, "sourceHash">,
): Dn9aEdit {
  if (
    !c.canEdit ||
    !hash(c.sourceHash) ||
    !Number.isInteger(e.index) ||
    e.index < 0 ||
    e.index >= 999 ||
    !c.entries.some((v) => v.index === e.index)
  )
    throw Error("Donut9a is read-only or has an invalid slot.");
  if (
    ![
      "patch",
      "resave",
      "reset",
      "clone",
      "import",
      "hex",
      "randomLv3",
      "shiny",
      "generate",
    ].includes(e.action)
  )
    throw Error("Invalid Donut9a action.");
  if (
    (e.action !== "patch" && e.fields !== undefined) ||
    (!["import", "hex"].includes(e.action) && e.hex !== undefined) ||
    (e.action !== "generate" &&
      (e.start !== undefined ||
        e.end !== undefined ||
        e.flavors !== undefined)) ||
    (!["patch", "randomLv3", "shiny", "generate"].includes(e.action) &&
      e.now !== undefined) ||
    (e.action !== "patch" && e.uiLanguage !== undefined)
  )
    throw Error("Invalid Donut9a action fields.");
  if (
    ["patch", "resave", "clone", "generate"].includes(e.action) &&
    !c.entries.find((v) => v.index === e.index)?.canLoad
  )
    throw Error("Donut9a source controls cannot load.");
  if (e.action === "patch") {
    if (
      !e.fields?.length ||
      e.fields.length > 512 ||
      !(["zh", "en", "ja"] as unknown[]).includes(e.uiLanguage)
    )
      throw Error("Invalid Donut9a fields or UI language.");
    for (const row of e.fields) {
      if (row.value.length > 32767) throw Error("Invalid Donut9a text.");
      if (["stars", "boost", "calories", "milliseconds"].includes(row.key))
        continue;
      if (row.key === "date") {
        if (
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(row.value) ||
          row.value < "1753-01-01T00:00:00" ||
          row.value > "4095-12-31T00:00:00"
        )
          throw Error("Invalid Donut9a date.");
        const d = new Date(row.value + "Z");
        if (
          !Number.isFinite(d.getTime()) ||
          d.toISOString().slice(0, 19) !== row.value
        )
          throw Error("Invalid Donut9a date.");
        continue;
      }
      if (!/^\d+$/.test(row.value) || !Number.isSafeInteger(Number(row.value)))
        throw Error("Invalid Donut9a choice.");
      const id = Number(row.value);
      if (
        (row.key === "donut" && c.donuts.some((v) => v.id === id)) ||
        (/^berry[0-8]$/.test(row.key) && c.berries.some((v) => v.id === id)) ||
        (/^flavor[0-2]$/.test(row.key) &&
          (id === 0 || c.flavors.some((v) => v.id === id)))
      )
        continue;
      throw Error("Invalid Donut9a field.");
    }
  }
  if (
    e.action === "import" &&
    (!e.hex || e.hex.length !== 144 || !/^[0-9A-Fa-f]+$/.test(e.hex))
  )
    throw Error("Invalid Donut9a binary file.");
  if (e.action === "hex" && (e.hex === undefined || e.hex.length > 32767))
    throw Error("Invalid Donut9a clipboard text.");
  if (
    e.action === "generate" &&
    (!Number.isInteger(e.start) ||
      !Number.isInteger(e.end) ||
      e.start! < 0 ||
      e.start! > 998 ||
      e.end! < 0 ||
      e.end! > 999 ||
      e.start! >= e.end! ||
      !e.flavors?.length ||
      new Set(e.flavors).size !== e.flavors.length ||
      e.flavors.some(
        (id) => !c.flavors.some((f) => f.id === id && f.generatorAllowed),
      ))
  )
    throw Error("Invalid Donut9a generator range or flavors.");
  if (
    ["randomLv3", "shiny", "generate"].includes(e.action) &&
    e.now === undefined
  )
    throw Error("Donut9a requires browser wall-clock time.");
  if (e.now !== undefined) {
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(e.now) ||
      e.now < "1970-01-01T00:00:00.000" ||
      e.now > "4095-12-31T00:00:00.000"
    )
      throw Error("Invalid Donut9a browser time.");
    const d = new Date(e.now + "Z");
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 23) !== e.now)
      throw Error("Invalid Donut9a browser time.");
  }
  return structuredClone({ ...e, sourceHash: c.sourceHash });
}
export function donut9aFrozen(c: Dn9aCatalog, t: Dn9aTicket): Dn9aConfirmation {
  if (
    !/^donut:\d+$/.test(t.token) ||
    t.sourceHash !== c.sourceHash ||
    !hash(t.sourceHash) ||
    !hash(t.targetHash) ||
    t.targetHash !== t.result.sourceHash
  )
    throw Error("Donut9a preview is stale.");
  return { token: t.token, sourceHash: t.sourceHash, targetHash: t.targetHash };
}
