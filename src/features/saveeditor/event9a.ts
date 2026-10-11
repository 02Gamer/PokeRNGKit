export interface Ew9aRow {
  index: number;
  keys: string[];
  hashes: string[];
  value: string;
  raw: string;
}
export interface Ew9aGroup {
  id: string;
  blockKey: string;
  kind: "bool" | "u64" | "tuple" | "hash2" | "hash3";
  count: number;
  used: number;
  available: boolean;
  rows: Ew9aRow[];
}
export interface Ew9aCatalog {
  canEdit: boolean;
  sourceHash: string;
  namesHash: string;
  groups: Ew9aGroup[];
}
export interface Ew9aReadQuery {
  names: string;
  group: string;
  filter: string;
  offset: number;
  limit: number;
}
export interface Ew9aPage extends Ew9aCatalog {
  group: string;
  filter: string;
  offset: number;
  total: number;
  rows: Ew9aRow[];
}
export interface Ew9aRowChange {
  group: string;
  index: number;
  keys?: (string | null)[];
  value?: string;
}
export interface Ew9aEdit {
  sourceHash: string;
  names: string;
  changes: Ew9aRowChange[];
}
export interface Ew9aPhysicalDiff {
  group: string;
  index: number;
  before: Ew9aRow | null;
  after: Ew9aRow | null;
}
export interface Ew9aBlockChange {
  key: string;
  beforeType: string;
  afterType: string;
  beforeSubtype: string;
  afterSubtype: string;
  before: string;
  after: string;
}
export interface Ew9aConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  namesHash: string;
}
export interface Ew9aTicket extends Ew9aConfirmation {
  result: Ew9aCatalog;
  rows: Ew9aPhysicalDiff[];
  blocks: Ew9aBlockChange[];
  changedOffsets: number[];
  ignored: string[];
}
export interface Ew9aComparison {
  previousHash: string;
  updatedHash: string;
  rows: Ew9aPhysicalDiff[];
  blocks: Ew9aBlockChange[];
  sourceReport: string[];
  sourceReportError: string | null;
}
export const supportsEvent9a = (format: string) => format === "SAV9ZA";
export const EVENT9A_MAX_NAMES = 4 * 1024 * 1024;
export const EVENT9A_GROUPS = [
  "Flags",
  "Event",
  "Work",
  "Quest",
  "WorkMable",
  "CountMable",
  "CountTitle",
  "Report",
  "WorkSpawn",
  "InfiniteRank",
  "Spawner2",
  "Spawner4",
  "Obstruction",
  "FieldItems",
  "FieldObjectInteractable",
] as const;
const hash = (value: string) => /^[0-9A-F]{64}$/.test(value);
export const event9aKeyCount = (kind: Ew9aGroup["kind"]) =>
  kind === "hash3" ? 3 : kind === "tuple" || kind === "hash2" ? 2 : 1;

export function event9aReadQuery(
  names: string,
  group = "Flags",
  filter = "",
  offset = 0,
  limit = 50,
): Ew9aReadQuery {
  if (
    names.length > EVENT9A_MAX_NAMES ||
    !(EVENT9A_GROUPS as readonly string[]).includes(group) ||
    filter.length > 32767 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 2147483647 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 200
  )
    throw Error("Invalid Event9a read query.");
  return { names, group, filter, offset, limit };
}

export function event9aRequest(
  catalog: Ew9aCatalog,
  names: string,
  changes: readonly Ew9aRowChange[],
): Ew9aEdit {
  if (
    !catalog.canEdit ||
    !hash(catalog.sourceHash) ||
    names.length > EVENT9A_MAX_NAMES ||
    changes.length > catalog.groups.reduce((n, g) => n + g.count, 0)
  )
    throw Error("Event9a is read-only or has an invalid request.");
  const seen = new Set<string>();
  for (const row of changes) {
    const group = catalog.groups.find((g) => g.id === row.group);
    const identity = `${row.group}:${row.index}`;
    if (
      !group?.available ||
      !Number.isInteger(row.index) ||
      row.index < 0 ||
      row.index >= group.count ||
      seen.has(identity) ||
      (row.keys !== undefined &&
        (row.keys.length !== event9aKeyCount(group.kind) ||
          row.keys.some(
            (v) => v !== null && (typeof v !== "string" || v.length > 32767),
          ))) ||
      (row.value !== undefined && row.value.length > 32767) ||
      (group.kind === "bool" &&
        row.value !== undefined &&
        !/^(?:true|false)$/i.test(row.value.trim()))
    )
      throw Error("Invalid Event9a row.");
    seen.add(identity);
  }
  // Numeric text is parsed by source Core controls; invalid text retains its loaded value.
  return structuredClone({
    sourceHash: catalog.sourceHash,
    names,
    changes: [...changes],
  });
}
export function event9aFrozen(
  catalog: Ew9aCatalog,
  ticket: Ew9aTicket,
): Ew9aConfirmation {
  if (
    !/^event9a:\d+$/.test(ticket.token) ||
    ticket.sourceHash !== catalog.sourceHash ||
    !hash(ticket.sourceHash) ||
    !hash(ticket.targetHash) ||
    ticket.targetHash !== ticket.result.sourceHash ||
    !hash(ticket.namesHash) ||
    ticket.namesHash !== catalog.namesHash ||
    ticket.namesHash !== ticket.result.namesHash
  )
    throw Error("Event9a preview is stale.");
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
    namesHash: ticket.namesHash,
  };
}
