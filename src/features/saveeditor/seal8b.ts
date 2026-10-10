import type { LocalizedText } from "./domain";
export interface Seal8bEntry {
  index: number;
  name: LocalizedText;
  count: number;
  total: number;
  obtained: boolean;
  rawObtained: number;
}
export interface Seal8bCatalog {
  canEdit: boolean;
  sourceHash: string;
  entries: Seal8bEntry[];
  rawObtained: number[];
}
export interface Seal8bValue {
  index: number;
  count?: number;
  total?: number;
  obtained?: boolean;
}
export interface Seal8bEdit {
  action: "patch" | "all" | "none" | "resave";
  sourceHash: string;
  entries?: Seal8bValue[];
  targetHash?: string;
}
export interface Seal8bPreview {
  request: Seal8bEdit;
  result: Seal8bCatalog;
  changedOffsets: number[];
}
export const supportsSeal8b = (format: string) => format === "SAV8BS";
// Source int.TryParse accepts decimal signed Int32; empty, malformed and overflow become zero.
export function seal8bInteger(text: string): number {
  const s = text.trim();
  if (!/^[+-]?\d+$/.test(s)) return 0;
  const n = Number(s);
  return Number.isInteger(n) && n >= -2147483648 && n <= 2147483647 ? n : 0;
}
export function seal8bRequest(
  c: Seal8bCatalog,
  action: Seal8bEdit["action"],
  entries?: Seal8bValue[],
): Seal8bEdit {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Seal8b is read-only.");
  if (
    !["patch", "all", "none", "resave"].includes(action) ||
    (action === "patch" && entries === undefined)
  )
    throw Error("Invalid Seal8b action.");
  if (
    entries &&
    (!entries.length ||
      new Set(entries.map((v) => v.index)).size !== entries.length ||
      entries.some(
        (v) =>
          !c.entries.some((e) => e.index === v.index) ||
          (v.count === undefined &&
            v.total === undefined &&
            v.obtained === undefined) ||
          [v.count, v.total].some(
            (n) =>
              n !== undefined &&
              (!Number.isInteger(n) || n < -2147483648 || n > 2147483647),
          ) ||
          (v.obtained !== undefined && typeof v.obtained !== "boolean"),
      ))
  )
    throw Error("Invalid Seal8b entries.");
  return { action, sourceHash: c.sourceHash, entries };
}
export function seal8bFrozen(c: Seal8bCatalog, p: Seal8bPreview): Seal8bEdit {
  seal8bRequest(c, p.request.action, p.request.entries);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash
  )
    throw Error("Seal8b preview is stale.");
  return p.request;
}
