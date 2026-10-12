// SPDX-License-Identifier: GPL-3.0-or-later
export type AccessorCulture = "en-US" | "zh-CN" | "ja-JP";
export interface AccessorProperty {
  path: string[];
  type: string;
  kind: string;
  readOnly: boolean;
  canConvertText: boolean;
  value: string | null;
  error: string | null;
  choices: string[];
  children: AccessorProperty[];
  structuredJson?: string | null;
}
export interface AccessorCatalog {
  sourceHash: string;
  format: string;
  blocks: { key: string; type: string; bytes: number }[];
  selected: string;
  properties: AccessorProperty[];
  culture: AccessorCulture;
}
export interface AccessorChange {
  block: string;
  path: string[];
  value: string;
  kind: "text" | "json";
}
export interface AccessorRequest {
  sourceHash: string;
  changes: AccessorChange[];
  culture: AccessorCulture;
}
export interface AccessorConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface AccessorTicket extends AccessorConfirmation {
  results: {
    block: string;
    before: AccessorCatalog;
    result: AccessorCatalog;
  }[];
  blocks: {
    key: string;
    offsets: number[];
    beforeHex: string;
    afterHex: string;
  }[];
  changedOffsets: number[];
}
export function supportsBlockAccessor(format: string) {
  return [
    "SAV5BW",
    "SAV5B2W2",
    "SAV6XY",
    "SAV6AO",
    "SAV6AODemo",
    "SAV7SM",
    "SAV7USUM",
    "SAV7b",
  ].includes(format);
}
export function accessorCulture(lang: "zh" | "en" | "ja"): AccessorCulture {
  return lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : "en-US";
}
export function accessorRequest(
  catalog: AccessorCatalog,
  changes: AccessorChange[],
): AccessorRequest {
  if (
    !/^[A-F0-9]{64}$/.test(catalog.sourceHash) ||
    changes.length > 512 ||
    !["en-US", "zh-CN", "ja-JP"].includes(catalog.culture)
  )
    throw new Error("Invalid block accessor source/changes");
  for (const change of changes)
    if (
      !catalog.blocks.some((b) => b.key === change.block) ||
      change.path.length < 1 ||
      change.path.length > 12 ||
      change.path.some((p) => p.length < 1 || p.length > 256) ||
      change.value.length > 4 * 1024 * 1024 ||
      !["text", "json"].includes(change.kind)
    )
      throw new Error("Invalid block accessor property request");
  const request = {
    sourceHash: catalog.sourceHash,
    culture: catalog.culture,
    changes: structuredClone(changes),
  };
  if (JSON.stringify(request).length > 4 * 1024 * 1024)
    throw new Error("Block accessor request is too large");
  return request;
}
export function accessorConfirmation(
  catalog: AccessorCatalog,
  ticket: AccessorTicket,
): AccessorConfirmation {
  if (
    !/^accessor:\d+$/.test(ticket.token) ||
    ticket.sourceHash !== catalog.sourceHash ||
    !/^[A-F0-9]{64}$/.test(ticket.targetHash) ||
    ticket.results.some(
      (r) =>
        !catalog.blocks.some((b) => b.key === r.block) ||
        r.before.selected !== r.block ||
        r.result.selected !== r.block ||
        r.before.format !== catalog.format ||
        r.result.format !== catalog.format ||
        r.before.culture !== catalog.culture ||
        r.result.culture !== catalog.culture ||
        r.before.sourceHash !== ticket.sourceHash ||
        r.result.sourceHash !== ticket.targetHash,
    )
  )
    throw new Error("Block accessor preview is stale");
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
  };
}
