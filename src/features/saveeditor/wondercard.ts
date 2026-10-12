// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export interface WondercardEntry {
  index: number;
  type: string;
  bytes: number;
  empty: boolean;
  used: boolean;
  cardId: number;
  title: string;
  fileName: string;
  data: string;
  sprite: string;
  itemId: number;
  species: number;
  shiny: boolean;
  egg: boolean;
  description: LocalizedText[];
  error: string | null;
  isEntity: boolean;
  isItem: boolean;
  heldItem: number;
  ball: number;
  quantity: number;
  speciesName: LocalizedText;
  itemName: LocalizedText;
}
export interface WondercardCatalog {
  sourceHash: string;
  format: string;
  generation: number;
  canEdit: boolean;
  canUse: boolean;
  flagMax: number;
  received: number[];
  album: WondercardEntry[];
  issues: string[];
}
export interface WondercardAction {
  kind:
    | "set"
    | "drop"
    | "qrSet"
    | "copy"
    | "delete"
    | "swap"
    | "used"
    | "usedAll"
    | "received"
    | "save";
  index?: number;
  source?: number;
  data?: string;
  fileName?: string;
  value?: boolean;
}
export interface WondercardRequest {
  sourceHash: string;
  actions: WondercardAction[];
}
export interface WondercardTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  before: WondercardCatalog;
  result: WondercardCatalog;
  changedOffsets: number[];
  issues: string[];
}
export interface WondercardConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  acceptIssues: boolean;
}
export function supportsWondercard(format: string) {
  return [
    "SAV4DP",
    "SAV4Pt",
    "SAV4HGSS",
    "SAV5BW",
    "SAV5B2W2",
    "SAV6XY",
    "SAV6AO",
    "SAV7SM",
    "SAV7USUM",
    "SAV7b",
  ].includes(format);
}
export function wondercardRequest(
  catalog: WondercardCatalog,
  actions: WondercardAction[],
): WondercardRequest {
  if (
    !catalog.canEdit ||
    !supportsWondercard(catalog.format) ||
    !/^[A-F0-9]{64}$/.test(catalog.sourceHash) ||
    actions.length > 512
  )
    throw new Error("Invalid mystery gift source/actions");
  const slot = (index = 0) => {
    if (!Number.isInteger(index) || index < 0 || index >= catalog.album.length)
      throw new Error("Invalid mystery gift slot");
  };
  for (const action of actions) {
    switch (action.kind) {
      case "set":
      case "drop":
      case "qrSet":
        slot(action.index);
        if (
          typeof action.data !== "string" ||
          action.data.length > 4 * 1024 * 1024 ||
          (action.fileName?.length ?? 0) > 1024 ||
          (action.kind !== "qrSet" && !action.fileName)
        )
          throw new Error("Invalid mystery gift import");
        if (action.kind === "qrSet" && !catalog.canUse)
          throw new Error("QR is unavailable for gift records");
        break;
      case "copy":
      case "swap":
        slot(action.index);
        slot(action.source);
        break;
      case "delete":
        slot(action.index);
        break;
      case "used":
        slot(action.index);
        if (!catalog.canUse || typeof action.value !== "boolean")
          throw new Error("Invalid used status");
        break;
      case "usedAll":
        if (!catalog.canUse || typeof action.value !== "boolean")
          throw new Error("Invalid used status");
        break;
      case "received":
        if (
          !Number.isInteger(action.index) ||
          action.index! < 0 ||
          action.index! >= catalog.flagMax ||
          typeof action.value !== "boolean"
        )
          throw new Error("Invalid received flag");
        break;
      case "save":
        break;
      default:
        throw new Error("Unknown mystery gift action");
    }
  }
  const request = {
    sourceHash: catalog.sourceHash,
    actions: structuredClone(actions),
  };
  if (JSON.stringify(request).length > 4 * 1024 * 1024)
    throw new Error("Mystery gift request is too large");
  return request;
}
export function wondercardConfirmation(
  catalog: WondercardCatalog,
  ticket: WondercardTicket,
  acceptIssues: boolean,
): WondercardConfirmation {
  if (
    !/^wondercard:\d+$/.test(ticket.token) ||
    ticket.sourceHash !== catalog.sourceHash ||
    !/^[A-F0-9]{64}$/.test(ticket.targetHash) ||
    ticket.before.sourceHash !== ticket.sourceHash ||
    ticket.result.sourceHash !== ticket.targetHash ||
    ticket.before.format !== catalog.format ||
    ticket.result.format !== catalog.format ||
    ticket.before.album.length !== catalog.album.length ||
    ticket.result.album.length !== catalog.album.length ||
    (ticket.issues.length > 0 && !acceptIssues)
  )
    throw new Error(
      "Mystery gift preview is stale or requires issue acceptance",
    );
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
    acceptIssues,
  };
}
