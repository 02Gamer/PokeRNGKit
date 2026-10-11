export type R7FieldName = "Identifier" | "Captured" | "Defeated";
export interface R7Entry {
  index: number;
  canEdit: boolean;
  identifier: number;
  captured: boolean;
  defeated: boolean | null;
  defeatedIdentifier: number | null;
  captureRaw: string;
  defeatedRaw: string | null;
}
export interface R7Query {
  offset: number;
  limit: number;
  filter: string;
}
export interface R7Page extends R7Query {
  canEdit: boolean;
  sourceHash: string;
  count: number;
  defeatedCount: number;
  hasDefeatedBlock: boolean;
  total: number;
  entries: R7Entry[];
}
export interface R7Change {
  index: number;
  fields: { name: R7FieldName; value: string }[];
}
export interface R7Edit {
  sourceHash: string;
  changes: R7Change[];
  culture: "zh-CN" | "en-US" | "ja-JP";
  query: R7Query;
}
export interface R7Confirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface R7Ticket extends R7Confirmation {
  result: R7Page;
  entries: { index: number; before: R7Entry; after: R7Entry }[];
  blocks: import("./event9a").Ew9aBlockChange[];
  changedOffsets: number[];
}
const hash = (value: string) => /^[0-9A-F]{64}$/.test(value);
const integer = (n: number, max: number) =>
  Number.isInteger(n) && n >= 0 && n <= max;
const maxRows = (32 * 1024 * 1024) / 8;
export const supportsSevenStar9 = (format: string) => format === "SAV9SV";
export function sevenStar9Query(query: R7Query): R7Query {
  if (
    !integer(query.offset, maxRows) ||
    !integer(query.limit, 200) ||
    query.limit === 0 ||
    typeof query.filter !== "string" ||
    query.filter.length > 32767 ||
    JSON.stringify(query).length > 128 * 1024
  )
    throw Error("Invalid SevenStar9 page query.");
  return { ...query };
}
export function sevenStar9Request(
  page: R7Page,
  changes: readonly R7Change[],
  lang: "zh" | "en" | "ja",
  query: R7Query,
): R7Edit {
  if (!page.canEdit || !hash(page.sourceHash) || changes.length > 32768)
    throw Error("SevenStar9 is read-only or has an invalid change count.");
  for (const change of changes) {
    if (
      !integer(change.index, page.count - 1) ||
      (page.hasDefeatedBlock && change.index >= page.defeatedCount) ||
      change.fields.length > 3 ||
      new Set(change.fields.map((f) => f.name)).size !== change.fields.length ||
      change.fields.some(
        (f) =>
          !["Identifier", "Captured", "Defeated"].includes(f.name) ||
          typeof f.value !== "string" ||
          f.value.length > 32767,
      )
    )
      throw Error("Invalid SevenStar9 fields or incomplete paired record.");
  }
  const edit: R7Edit = {
    sourceHash: page.sourceHash,
    changes: [...changes],
    culture: lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : "en-US",
    query: sevenStar9Query(query),
  };
  if (JSON.stringify(edit).length > 8 * 1024 * 1024)
    throw Error("SevenStar9 request is too large.");
  return structuredClone(edit);
}
export function sevenStar9Frozen(
  page: R7Page,
  ticket: R7Ticket,
): R7Confirmation {
  if (
    !/^sevenstar9:\d+$/.test(ticket.token) ||
    !hash(ticket.sourceHash) ||
    !hash(ticket.targetHash) ||
    ticket.sourceHash !== page.sourceHash ||
    ticket.result.sourceHash !== ticket.targetHash ||
    !ticket.result.canEdit
  )
    throw Error("SevenStar9 preview is stale or not frozen.");
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
  };
}
export function isSevenStar9Page(value: unknown): value is R7Page {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<R7Page>;
  if (
    typeof p.canEdit !== "boolean" ||
    typeof p.sourceHash !== "string" ||
    !hash(p.sourceHash) ||
    typeof p.count !== "number" ||
    !integer(p.count, maxRows) ||
    typeof p.defeatedCount !== "number" ||
    !integer(p.defeatedCount, maxRows) ||
    typeof p.hasDefeatedBlock !== "boolean" ||
    typeof p.total !== "number" ||
    !integer(p.total, p.count) ||
    typeof p.offset !== "number" ||
    !integer(p.offset, maxRows) ||
    typeof p.limit !== "number" ||
    !integer(p.limit, 200) ||
    p.limit === 0 ||
    typeof p.filter !== "string" ||
    p.filter.length > 32767 ||
    !Array.isArray(p.entries) ||
    p.entries.length !== Math.max(0, Math.min(p.limit, p.total - p.offset))
  )
    return false;
  return p.entries.every(
    (e, i) =>
      e &&
      integer(e.index, p.count! - 1) &&
      (i === 0 || e.index > p.entries![i - 1].index) &&
      typeof e.canEdit === "boolean" &&
      integer(e.identifier, 4294967295) &&
      typeof e.captured === "boolean" &&
      (e.defeated === null || typeof e.defeated === "boolean") &&
      (e.defeatedIdentifier === null ||
        integer(e.defeatedIdentifier, 4294967295)) &&
      typeof e.captureRaw === "string" &&
      /^[0-9A-F]{16}$/.test(e.captureRaw) &&
      (e.defeatedRaw === null ||
        (typeof e.defeatedRaw === "string" &&
          /^[0-9A-F]{16}$/.test(e.defeatedRaw))) &&
      (p.hasDefeatedBlock
        ? e.canEdit === e.index < p.defeatedCount! &&
          (e.canEdit
            ? e.defeated !== null &&
              e.defeatedIdentifier !== null &&
              e.defeatedRaw !== null
            : e.defeated === null &&
              e.defeatedIdentifier === null &&
              e.defeatedRaw === null)
        : e.canEdit &&
          e.defeated !== null &&
          e.defeatedIdentifier === null &&
          e.defeatedRaw === null),
  );
}
