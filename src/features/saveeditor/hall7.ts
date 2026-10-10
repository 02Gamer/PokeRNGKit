import type { LocalizedText, OriginChoice } from "./domain";
export interface Hall7Member {
  index: number;
  species: number;
  known: boolean;
  name: LocalizedText;
  sprite: string;
}
export interface Hall7Catalog {
  canEdit: boolean;
  sourceHash: string;
  members: Hall7Member[];
  species: OriginChoice[];
  ec: string | null;
}
export interface Hall7Edit {
  action: "patch" | "resave";
  sourceHash: string;
  members?: { index: number; species: number }[];
  ec?: string;
  targetHash?: string;
}
export interface Hall7Preview {
  request: Hall7Edit;
  result: Hall7Catalog;
  changedOffsets: number[];
}
export const supportsHall7 = (format: string) =>
  ["SAV7SM", "SAV7USUM"].includes(format);
function source(c: Hall7Catalog) {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Hall7 is read-only.");
}
export function h7Ec(text: string) {
  if (text.length > 8) throw Error("Hall7 EC exceeds eight characters.");
  const hex = text.replace(/[^0-9A-F]/gi, "");
  return (hex ? parseInt(hex, 16) : 0)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
}
export function h7Patch(
  c: Hall7Catalog,
  members: Hall7Edit["members"],
  ec?: string,
): Hall7Edit {
  source(c);
  if (members === undefined && ec === undefined)
    throw Error("Missing Hall7 changes.");
  if (
    members &&
    (!members.length ||
      members.length > 12 ||
      new Set(members.map((v) => v.index)).size !== members.length ||
      members.some(
        (v) =>
          !Number.isInteger(v.index) ||
          v.index < 0 ||
          v.index >= 12 ||
          !c.species.some((f) => f.id === v.species),
      ))
  )
    throw Error("Invalid Hall7 members.");
  if (ec !== undefined) {
    if (c.ec === null) throw Error("Hall7 EC requires USUM.");
    h7Ec(ec);
  }
  return { action: "patch", sourceHash: c.sourceHash, members, ec };
}
export function h7Resave(c: Hall7Catalog): Hall7Edit {
  source(c);
  return { action: "resave", sourceHash: c.sourceHash };
}
export function h7Frozen(c: Hall7Catalog, p: Hall7Preview): Hall7Edit {
  source(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash
  )
    throw Error("Hall7 preview is stale.");
  return p.request;
}
