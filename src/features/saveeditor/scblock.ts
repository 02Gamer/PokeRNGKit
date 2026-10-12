// SPDX-License-Identifier: GPL-3.0-or-later
export interface SCBlockQuery {
  names: string;
  exclusions: string[];
  filter: string;
  offset: number;
  limit: number;
  selected?: string;
}
export interface SCBlockEntry {
  key: string;
  hint: string;
  name: string | null;
  type: string;
  subType: string;
  bytes: number;
  value: string | null;
  fileName: string;
  canToggle: boolean;
}
export interface SCBlockPage {
  sourceHash: string;
  format: string;
  canEdit: boolean;
  total: number;
  offset: number;
  blocks: SCBlockEntry[];
  selected: SCBlockEntry | null;
  data: string | null;
}
export interface SCBlockFile {
  fileName: string;
  data: string;
}
export interface SCBlockAction {
  kind: "toggle" | "import" | "folder";
  key?: string;
  type?: "Bool1" | "Bool2";
  data?: string;
  files?: SCBlockFile[];
}
export interface SCBlockDifference {
  key: string;
  kind: "added" | "removed" | "changed";
  beforeType: string | null;
  afterType: string | null;
  beforeSubType: string | null;
  afterSubType: string | null;
  beforeData: string | null;
  afterData: string | null;
}
export interface SCBlockImportResult {
  index: number;
  fileName: string;
  key: string;
  imported: boolean;
  error: string | null;
}
export interface SCBlockTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  blocks: SCBlockDifference[];
  imports: SCBlockImportResult[];
  changedBytes: number;
  requiresPartialAcceptance: boolean;
}
export interface SCBlockConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  acceptPartialImport: boolean;
}
export interface SCBlockComparison {
  previousHash: string;
  updatedHash: string;
  sourceReport: string[];
  sourceReportError: string | null;
  blocks: SCBlockDifference[];
}
export interface SCBlockExportResult {
  kind: "block" | "folder" | "single";
  files: SCBlockFile[];
}
export const supportsSCBlock = (format: string) =>
  ["SAV8SWSH", "SAV8LA", "SAV9SV", "SAV9ZA"].includes(format);

export function scblockTopLevelFiles<T extends { webkitRelativePath: string }>(
  files: T[],
) {
  return files.filter(
    (file) =>
      !file.webkitRelativePath ||
      file.webkitRelativePath.split("/").length === 2,
  );
}
export function scblockRequest(page: SCBlockPage, actions: SCBlockAction[]) {
  if (
    !page.canEdit ||
    !supportsSCBlock(page.format) ||
    !/^[A-F0-9]{64}$/.test(page.sourceHash) ||
    actions.length > 512
  )
    throw new Error("Invalid SCBlock source/actions");
  for (const action of actions) {
    if (action.kind === "toggle" || action.kind === "import") {
      if (!/^[A-F0-9]{8}$/.test(action.key ?? ""))
        throw new Error("Invalid SCBlock key");
      if (
        action.kind === "toggle" &&
        action.type !== "Bool1" &&
        action.type !== "Bool2"
      )
        throw new Error("Invalid SCBlock type");
      if (action.kind === "import" && typeof action.data !== "string")
        throw new Error("Missing SCBlock data");
    } else if (action.kind === "folder") {
      if (
        !action.files ||
        action.files.length > 50000 ||
        action.files.some(
          (f) =>
            f.fileName.length > 1024 ||
            /[/\\]/.test(f.fileName) ||
            typeof f.data !== "string",
        )
      )
        throw new Error("Invalid SCBlock files");
    } else throw new Error("Unknown SCBlock action");
  }
  const request = {
    sourceHash: page.sourceHash,
    actions: structuredClone(actions),
  };
  if (JSON.stringify(request).length > 52 * 1024 * 1024)
    throw new Error("SCBlock request is too large");
  return request;
}
export function scblockConfirmation(
  page: SCBlockPage,
  ticket: SCBlockTicket,
  accepted: boolean,
): SCBlockConfirmation {
  if (
    !/^scblock:\d+$/.test(ticket.token) ||
    ticket.sourceHash !== page.sourceHash ||
    !/^[A-F0-9]{64}$/.test(ticket.targetHash) ||
    (ticket.requiresPartialAcceptance && !accepted)
  )
    throw new Error(
      "SCBlock preview is stale or requires partial-import acceptance",
    );
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
    acceptPartialImport: accepted,
  };
}
