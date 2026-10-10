import type { LocalizedText } from "./domain";
export interface Misc8bValue {
  key: string;
  group: string;
  index: number;
  value: string;
  name: LocalizedText;
}
export interface Misc8bCatalog {
  canEdit: boolean;
  sourceHash: string;
  actions: { key: string; enabled: boolean }[];
  values: Misc8bValue[];
}
export interface Misc8bEdit {
  action: string;
  sourceHash: string;
  targetHash?: string;
}
export interface Misc8bPreview {
  request: Misc8bEdit;
  result: Misc8bCatalog;
  changedOffsets: number[];
}
export const supportsMisc8b = (format: string) => format === "SAV8BS";
function source(c: Misc8bCatalog) {
  if (!c.canEdit || !/^[0-9A-F]{64}$/.test(c.sourceHash))
    throw Error("Misc8b is read-only.");
}
export function misc8bAction(c: Misc8bCatalog, action: string): Misc8bEdit {
  source(c);
  if (!c.actions.some((a) => a.key === action && a.enabled))
    throw Error("Misc8b operation is unavailable.");
  return { action, sourceHash: c.sourceHash };
}
export function misc8bFrozen(c: Misc8bCatalog, p: Misc8bPreview): Misc8bEdit {
  source(c);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash
  )
    throw Error("Misc8b preview is stale.");
  misc8bAction(c, p.request.action);
  return p.request;
}
