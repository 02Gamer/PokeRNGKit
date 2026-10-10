import type { LocalizedText } from "./domain";
export { seal8bInteger as ug8bInteger } from "./seal8b";
export interface Ug8bEntry {
  index: number;
  type: string;
  name: LocalizedText;
  maximum: number;
  count: number;
  new: boolean;
  favorite: boolean;
  rawHideNew: number;
  rawFavorite: number;
}
export interface Ug8bCatalog {
  canEdit: boolean;
  sourceHash: string;
  entries: Ug8bEntry[];
  rawHideNew: number[];
  rawFavorite: number[];
}
export interface Ug8bValue {
  index: number;
  count?: number;
  new?: boolean;
  favorite?: boolean;
}
export interface Ug8bEdit {
  action: "patch" | "all" | "none" | "resave";
  sourceHash: string;
  entries?: Ug8bValue[];
  targetHash?: string;
}
export interface Ug8bPreview {
  request: Ug8bEdit;
  result: Ug8bCatalog;
  changedOffsets: number[];
}
export const supportsUnderground8b = (format: string) => format === "SAV8BS";
export function ug8bRequest(
  c: Ug8bCatalog,
  action: Ug8bEdit["action"],
  entries?: Ug8bValue[],
): Ug8bEdit {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Underground8b is read-only.");
  if (
    !["patch", "all", "none", "resave"].includes(action) ||
    (action === "patch" && !entries)
  )
    throw Error("Invalid Underground8b action.");
  if (
    entries &&
    (!entries.length ||
      new Set(entries.map((v) => v.index)).size !== entries.length ||
      entries.some(
        (v) =>
          !c.entries.some((e) => e.index === v.index) ||
          (v.count === undefined &&
            v.new === undefined &&
            v.favorite === undefined) ||
          (v.count !== undefined &&
            (!Number.isInteger(v.count) ||
              v.count < -2147483648 ||
              v.count > 2147483647)) ||
          [v.new, v.favorite].some(
            (b) => b !== undefined && typeof b !== "boolean",
          ),
      ))
  )
    throw Error("Invalid Underground8b entries.");
  return { action, sourceHash: c.sourceHash, entries };
}
export function ug8bFrozen(c: Ug8bCatalog, p: Ug8bPreview): Ug8bEdit {
  ug8bRequest(c, p.request.action, p.request.entries);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash
  )
    throw Error("Underground8b preview is stale.");
  return p.request;
}
