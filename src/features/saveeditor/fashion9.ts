export interface F9Row {
  index: number;
  value: string;
  isNew: boolean;
  isNewShop: boolean | null;
  isNewGroup: boolean | null;
  isEquipped: boolean | null;
  isOwned: boolean | null;
  raw: string;
}
export interface F9Group {
  id: string;
  key: string;
  kind: "sv" | "za" | "hair";
  available: boolean;
  count: number;
  bytes: number;
  rows: F9Row[];
}
export interface F9Catalog {
  canEdit: boolean;
  canOwn: boolean;
  sourceHash: string;
  groups: F9Group[];
}
export interface F9ReadQuery {
  group: string;
  filter: string;
  offset: number;
  limit: number;
}
export interface F9Page extends F9Catalog, F9ReadQuery {
  total: number;
  rows: F9Row[];
}
export interface F9RowChange {
  index: number;
  value?: string;
  isNew?: boolean;
  isNewShop?: boolean;
  isNewGroup?: boolean;
  isEquipped?: boolean;
  isOwned?: boolean;
}
export type F9Operation =
  | { action: "rows"; group: string; changes: F9RowChange[] }
  | { action: "import"; group: string; data: string }
  | { action: "owned"; group: string; owned: boolean; all: boolean }
  | { action: "resave"; group: string };
export interface F9Edit {
  sourceHash: string;
  operations: F9Operation[];
}
export interface F9RowDiff {
  group: string;
  index: number;
  before: F9Row;
  after: F9Row;
}
export interface F9Confirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface F9Ticket extends F9Confirmation {
  result: F9Catalog;
  rows: F9RowDiff[];
  blocks: import("./event9a").Ew9aBlockChange[];
  changedOffsets: number[];
  resetValues: string[];
}
export const supportsFashion9 = (format: string) =>
  format === "SAV9SV" || format === "SAV9ZA";
const hash = (value: string) => /^[0-9A-F]{64}$/.test(value);
export const FASHION9_MAX_OPERATIONS = 512;
export const FASHION9_MAX_BLOCK_BYTES = 65536;
export const FASHION9_FLAGS = [
  "isNew",
  "isNewShop",
  "isNewGroup",
  "isEquipped",
  "isOwned",
] as const;

export function fashion9Query(
  group = "",
  filter = "",
  offset = 0,
  limit = 50,
): F9ReadQuery {
  if (
    typeof group !== "string" ||
    group.length > 64 ||
    filter.length > 32767 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 2147483647 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 200
  )
    throw Error("Invalid Fashion9 read query.");
  return { group, filter, offset, limit };
}
export function fashion9Import(
  group: F9Group,
  bytes: Uint8Array,
): Extract<F9Operation, { action: "import" }> {
  if (
    !group.available ||
    bytes.length > FASHION9_MAX_BLOCK_BYTES ||
    bytes.length !== group.bytes
  )
    throw Error("Fashion9 import must match the source block size.");
  const data = Array.from(bytes, (n) =>
    n.toString(16).padStart(2, "0").toUpperCase(),
  ).join("");
  return { action: "import", group: group.id, data };
}
export function fashion9Request(
  catalog: F9Catalog,
  operations: readonly F9Operation[],
): F9Edit {
  if (
    !catalog.canEdit ||
    !hash(catalog.sourceHash) ||
    operations.length > FASHION9_MAX_OPERATIONS
  )
    throw Error("Fashion9 is read-only or has an invalid request.");
  for (const operation of operations) {
    const group = catalog.groups.find((g) => g.id === operation.group);
    if (!group?.available) throw Error("Invalid Fashion9 group.");
    if (operation.action === "rows") {
      if (
        operation.changes.length > group.count ||
        new Set(operation.changes.map((c) => c.index)).size !==
          operation.changes.length
      )
        throw Error("Invalid Fashion9 row changes.");
      for (const change of operation.changes) {
        if (
          !Number.isInteger(change.index) ||
          change.index < 0 ||
          change.index >= group.count ||
          (change.value !== undefined &&
            (typeof change.value !== "string" ||
              change.value.length > 32767)) ||
          FASHION9_FLAGS.some(
            (flag) =>
              change[flag] !== undefined &&
              (typeof change[flag] !== "boolean" ||
                (group.kind !== "za" && flag !== "isNew")),
          )
        )
          throw Error("Invalid Fashion9 row or fields.");
      }
      // Invalid UInt32 text must reach Core: the source resets it to None.
    } else if (operation.action === "owned") {
      if (
        !catalog.canOwn ||
        typeof operation.owned !== "boolean" ||
        typeof operation.all !== "boolean"
      )
        throw Error("Invalid Fashion9 ownership operation.");
    } else if (operation.action === "import") {
      if (
        operation.data.length !== group.bytes * 2 ||
        operation.data.length > FASHION9_MAX_BLOCK_BYTES * 2 ||
        !/^(?:[0-9a-f]{2})*$/i.test(operation.data)
      )
        throw Error("Invalid Fashion9 block data.");
    } else if (operation.action !== "resave")
      throw Error("Invalid Fashion9 action.");
  }
  const request = {
    sourceHash: catalog.sourceHash,
    operations: [...operations],
  };
  if (JSON.stringify(request).length > 8 * 1024 * 1024)
    throw Error("Fashion9 request is too large.");
  return structuredClone(request);
}
export function fashion9Frozen(
  catalog: F9Catalog,
  ticket: F9Ticket,
): F9Confirmation {
  if (
    !/^fashion9:\d+$/.test(ticket.token) ||
    ticket.sourceHash !== catalog.sourceHash ||
    !hash(ticket.sourceHash) ||
    !hash(ticket.targetHash) ||
    ticket.targetHash !== ticket.result.sourceHash ||
    !ticket.result.canEdit
  )
    throw Error("Fashion9 preview is stale or not frozen.");
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
  };
}

export function isFashion9Page(value: unknown): value is F9Page {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<F9Page>;
  if (
    typeof page.canEdit !== "boolean" ||
    typeof page.canOwn !== "boolean" ||
    typeof page.sourceHash !== "string" ||
    !hash(page.sourceHash) ||
    !Array.isArray(page.groups) ||
    ![8, 25].includes(page.groups.length) ||
    page.groups.some(
      (g) =>
        !g ||
        typeof g.id !== "string" ||
        g.id.length > 64 ||
        !/^[0-9A-F]{8}$/.test(g.key) ||
        !["sv", "za", "hair"].includes(g.kind) ||
        typeof g.available !== "boolean" ||
        !Number.isSafeInteger(g.bytes) ||
        g.bytes < 0 ||
        g.bytes > 32 * 1024 * 1024 ||
        g.count !== Math.floor(g.bytes / 8) ||
        !Array.isArray(g.rows) ||
        g.rows.length !== 0,
    ) ||
    new Set(page.groups.map((g) => g.id)).size !== page.groups.length ||
    new Set(page.groups.map((g) => g.key)).size !== page.groups.length ||
    typeof page.group !== "string" ||
    typeof page.filter !== "string" ||
    page.filter.length > 32767 ||
    typeof page.offset !== "number" ||
    !Number.isInteger(page.offset) ||
    page.offset < 0 ||
    typeof page.limit !== "number" ||
    !Number.isInteger(page.limit) ||
    page.limit < 1 ||
    page.limit > 200 ||
    typeof page.total !== "number" ||
    !Number.isInteger(page.total) ||
    page.total < 0 ||
    !Array.isArray(page.rows) ||
    page.rows.length > page.limit
  )
    return false;
  const group = page.groups.find((g) => g.id === page.group);
  if (
    !group ||
    page.offset > group.count ||
    page.total > group.count ||
    (page.canEdit && page.groups.some((g) => !g.available))
  )
    return false;
  return (
    page.rows.every(
      (row) =>
        row &&
        Number.isInteger(row.index) &&
        row.index >= 0 &&
        row.index < group.count &&
        typeof row.value === "string" &&
        /^(?:0|[1-9]\d{0,9})$/.test(row.value) &&
        Number(row.value) <= 4294967295 &&
        typeof row.isNew === "boolean" &&
        FASHION9_FLAGS.slice(1).every((flag) =>
          group.kind === "za"
            ? typeof row[flag] === "boolean"
            : row[flag] === null,
        ) &&
        typeof row.raw === "string" &&
        /^[0-9A-F]{16}$/.test(row.raw),
    ) && new Set(page.rows.map((row) => row.index)).size === page.rows.length
  );
}
