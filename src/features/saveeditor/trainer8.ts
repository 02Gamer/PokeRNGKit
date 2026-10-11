import type { Tr8aCatalog } from "./trainer8a";
import type { TrGGField } from "./trainerGG";
import type { Hall6Trash } from "./hall6";
import type { Br4Lang } from "./br4";
import type { LocalizedText } from "./domain";
export interface Tr8TeamField {
  key: string;
  kind: "u16" | "u8" | "u32" | "i32" | "bool";
  value: string;
  min: string;
  max: string;
}
export interface Tr8TeamMember {
  index: number;
  species: number;
  name: LocalizedText;
  sprite: string;
  raw: string;
  fields: Tr8TeamField[];
}
export interface Tr8Catalog extends Omit<
  Tr8aCatalog,
  "map" | "startedRaw" | "savedRaw"
> {
  revision: number;
  canDiglett: boolean;
  savedValue: string;
  appearance?: { key: string; name: LocalizedText; value: string }[];
  cardTeam: Tr8TeamMember[];
  titleTeam: Tr8TeamMember[];
  cardTrash: string;
  statusRaw: string;
  cardRaw: string;
  playedRaw: string;
  recordRaw: string;
  fashionRaw: string;
}
export interface Tr8Edit {
  action:
    | "patch"
    | "ids"
    | "position"
    | "resave"
    | "trash"
    | "team"
    | "copyParty"
    | "resetAppearance"
    | "fashion"
    | "diglett";
  sourceHash: string;
  targetHash?: string;
  fields?: { key: string; value: string }[];
  uiLanguage?: Br4Lang;
  team?: "card" | "title";
  members?: { index: number; property: string; value: string }[];
  nameTarget?: "name" | "cardName";
  trash?: Hall6Trash;
  fashion?: "base" | "legal" | "all";
}
export interface Tr8Preview {
  request: Tr8Edit;
  result: Tr8Catalog;
  changedOffsets: number[];
  ignoredFields: string[];
  blocks?: {
    key: string;
    beforeType: string;
    afterType: string;
    before: string;
    after: string;
  }[];
}
export const supportsTrainer8 = (format: string) => format === "SAV8SWSH";
export function tr8Date(f: TrGGField, text: string): string {
  const value =
    f.key === "started" ? text : text.length === 16 ? text + ":00" : text;
  if (
    !(
      f.key === "started"
        ? /^\d{4}-\d{2}-\d{2}$/
        : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
    ).test(value)
  )
    throw Error("Invalid Trainer8 date.");
  const d = new Date(value + (f.key === "started" ? "T00:00:00Z" : "Z"));
  if (
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, f.key === "started" ? 10 : 19) !== value ||
    value < f.min ||
    value > f.max
  )
    throw Error("Invalid Trainer8 date.");
  return value;
}
export function tr8Request(
  c: Tr8Catalog,
  e: Omit<Tr8Edit, "sourceHash">,
): Tr8Edit {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Trainer8 is read-only.");
  if (
    ![
      "patch",
      "ids",
      "position",
      "resave",
      "trash",
      "team",
      "copyParty",
      "resetAppearance",
      "fashion",
      "diglett",
    ].includes(e.action)
  )
    throw Error("Invalid Trainer8 action.");
  if (
    (!["patch", "ids", "position"].includes(e.action) &&
      e.fields !== undefined) ||
    (!["position", "team"].includes(e.action) && e.uiLanguage !== undefined) ||
    (!["team", "copyParty"].includes(e.action) && e.team !== undefined) ||
    (e.action !== "team" && e.members !== undefined) ||
    (e.action !== "trash" &&
      (e.nameTarget !== undefined || e.trash !== undefined)) ||
    (e.action !== "fashion" && e.fashion !== undefined)
  )
    throw Error("Invalid Trainer8 action fields.");
  if (
    ["patch", "ids", "position"].includes(e.action) &&
    (!e.fields?.length ||
      new Set(e.fields.map((v) => v.key)).size !== e.fields.length)
  )
    throw Error("Invalid Trainer8 field list.");
  if (
    (["position", "team"].includes(e.action) && e.uiLanguage === undefined) ||
    (e.uiLanguage !== undefined && !["zh", "en", "ja"].includes(e.uiLanguage))
  )
    throw Error("Invalid Trainer8 language.");
  if (e.action === "patch")
    for (const v of e.fields ?? []) {
      const f = c.fields.find((f) => f.key === v.key);
      if (
        !f ||
        v.value.length > f.maxLength ||
        ((f.key === "hours" || f.kind === "choice") && v.value.length === 0)
      )
        throw Error("Invalid Trainer8 field.");
      if (f.kind === "number" || f.kind === "choice") {
        const n = Number(v.value || "0");
        if (
          !/^\d*$/.test(v.value) ||
          !Number.isSafeInteger(n) ||
          n < Number(f.min) ||
          n > Number(f.max) ||
          (f.kind === "choice" && !f.choices.some((o) => o.id === n))
        )
          throw Error("Invalid Trainer8 number.");
      }
      if (
        f.kind === "text" &&
        Array.from(v.value).some((char) => {
          const n = char.charCodeAt(0);
          return n < 32 || (n >= 127 && n <= 159);
        })
      )
        throw Error("Invalid Trainer8 text.");
      if (f.kind === "date") tr8Date(f, v.value);
    }
  if (
    e.action === "ids" &&
    (e.fields?.length !== 2 ||
      e.fields.some(
        (v) =>
          !["tid", "sid"].includes(v.key) ||
          !/^\d*$/.test(v.value) ||
          v.value.length > (v.key === "tid" ? 6 : 4),
      ))
  )
    throw Error("Invalid Trainer8 IDs.");
  if (
    e.action === "position" &&
    (!c.position.canEdit ||
      e.fields?.some(
        (v) =>
          !c.position.fields.some((f) => f.key === v.key) ||
          v.value.length > 32767,
      ))
  )
    throw Error("Invalid Trainer8 coordinates.");
  if (
    ["team", "copyParty"].includes(e.action) &&
    e.team !== "card" &&
    e.team !== "title"
  )
    throw Error("Invalid Trainer8 team.");
  if (e.action === "team") {
    const team = e.team === "card" ? c.cardTeam : c.titleTeam;
    if (
      !e.members?.length ||
      e.members.length > 60 ||
      e.members.some(
        (v) =>
          !Number.isInteger(v.index) ||
          v.index < 0 ||
          v.index >= 6 ||
          !team[v.index]?.fields.some((f) => f.key === v.property) ||
          v.value.length > 32767,
      )
    )
      throw Error("Invalid Trainer8 team fields.");
    // The Worker applies the source CLR converters, including their hexadecimal forms.
  }
  if (
    e.action === "fashion" &&
    !(["base", "legal", "all"] as unknown[]).includes(e.fashion)
  )
    throw Error("Invalid Trainer8 fashion.");
  if (e.action === "diglett" && !c.canDiglett)
    throw Error("Trainer8 Diglett requires Isle of Armor.");
  if (
    e.action === "trash" &&
    (!e.trash || !["name", "cardName"].includes(e.nameTarget ?? ""))
  )
    throw Error("Invalid Trainer8 name bytes.");
  const fields = e.fields?.map((v) => {
    const f = c.fields.find((f) => f.key === v.key);
    return {
      ...v,
      value:
        e.action === "patch" && f?.kind === "date"
          ? tr8Date(f, v.value)
          : v.value,
    };
  });
  return structuredClone({ ...e, sourceHash: c.sourceHash, fields });
}
export function tr8Frozen(c: Tr8Catalog, p: Tr8Preview): Tr8Edit {
  tr8Request(c, p.request);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash
  )
    throw Error("Trainer8 preview is stale.");
  return structuredClone(p.request);
}
