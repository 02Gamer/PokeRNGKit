export const RAID9_ORIGINS = [
  "Paldea",
  "Kitakami",
  "BlueberryAcademy",
] as const;
export type R9Origin = (typeof RAID9_ORIGINS)[number];
export const RAID9_FIELDS = [
  "IsEnabled",
  "AreaID",
  "LotteryGroup",
  "SpawnPointID",
  "Seed",
  "Unused",
  "Content",
  "IsClaimedLeaguePoints",
] as const;
export interface R9Entry {
  index: number;
  isEnabled: boolean;
  areaID: number;
  lotteryGroup: number;
  spawnPointID: number;
  scenePointName: string;
  seed: string;
  unused: number;
  content: string;
  contentRaw: number;
  isClaimedLeaguePoints: boolean;
  raw: string;
}
export interface R9Region {
  origin: R9Origin;
  available: boolean;
  countUsed: number;
  countAll: number;
  hasSeeds: boolean;
  currentSeed: string | null;
  tomorrowSeed: string | null;
  entries: R9Entry[];
}
export interface R9Catalog {
  canEdit: boolean;
  sourceHash: string;
  regions: R9Region[];
}
export interface R9Field {
  name: (typeof RAID9_FIELDS)[number];
  value: string;
}
export type R9Operation =
  | { action: "fields"; origin: R9Origin; index: number; fields: R9Field[] }
  | { action: "seeds"; origin: R9Origin; today?: string; tomorrow?: string }
  | { action: "propagate"; origin: R9Origin; index: number; seedToo: boolean };
export interface R9Edit {
  sourceHash: string;
  operations: R9Operation[];
  culture: "zh-CN" | "en-US" | "ja-JP";
}
export interface R9Confirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface R9Ticket extends R9Confirmation {
  result: R9Catalog;
  entries: {
    origin: R9Origin;
    index: number;
    before: R9Entry;
    after: R9Entry;
  }[];
  blocks: import("./event9a").Ew9aBlockChange[];
  changedOffsets: number[];
  ignoredSeeds: string[];
}
export const supportsRaid9 = (format: string) => format === "SAV9SV";
const hash = (value: string) => /^[0-9A-F]{64}$/.test(value);
export function raid9Request(
  catalog: R9Catalog,
  operations: readonly R9Operation[],
  lang: "zh" | "en" | "ja",
): R9Edit {
  if (!catalog.canEdit || !hash(catalog.sourceHash) || operations.length > 512)
    throw Error("Raid9 is read-only or has an invalid request.");
  for (const operation of operations) {
    const region = catalog.regions.find((r) => r.origin === operation.origin);
    if (!region?.available) throw Error("Raid9 region is unavailable.");
    if (operation.action === "seeds") {
      if (
        !region.hasSeeds ||
        (operation.today === undefined && operation.tomorrow === undefined) ||
        [operation.today, operation.tomorrow].some(
          (v) => v !== undefined && (typeof v !== "string" || v.length > 16),
        )
      )
        throw Error("Invalid Raid9 seed validation event.");
      // Invalid or empty validated text reaches Core and leaves the stored seed unchanged.
    } else {
      if (
        !Number.isInteger(operation.index) ||
        operation.index < 0 ||
        operation.index >= region.countUsed
      )
        throw Error("Invalid Raid9 index.");
      if (operation.action === "propagate") {
        if (typeof operation.seedToo !== "boolean")
          throw Error("Invalid Raid9 propagation.");
      } else if (operation.action === "fields") {
        if (
          operation.fields.length > 8 ||
          new Set(operation.fields.map((f) => f.name)).size !==
            operation.fields.length ||
          operation.fields.some(
            (f) =>
              !RAID9_FIELDS.includes(f.name) ||
              typeof f.value !== "string" ||
              f.value.length > 32767,
          )
        )
          throw Error("Invalid Raid9 properties.");
      } else throw Error("Invalid Raid9 action.");
    }
  }
  const request: R9Edit = {
    sourceHash: catalog.sourceHash,
    operations: [...operations],
    culture: lang === "zh" ? "zh-CN" : lang === "ja" ? "ja-JP" : "en-US",
  };
  if (JSON.stringify(request).length > 8 * 1024 * 1024)
    throw Error("Raid9 request is too large.");
  return structuredClone(request);
}
export function raid9Frozen(
  catalog: R9Catalog,
  ticket: R9Ticket,
): R9Confirmation {
  if (
    !/^raid9:\d+$/.test(ticket.token) ||
    !hash(ticket.sourceHash) ||
    !hash(ticket.targetHash) ||
    ticket.sourceHash !== catalog.sourceHash ||
    ticket.targetHash !== ticket.result.sourceHash ||
    !ticket.result.canEdit
  )
    throw Error("Raid9 preview is stale or not frozen.");
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
  };
}
export function isRaid9Catalog(value: unknown): value is R9Catalog {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<R9Catalog>;
  if (
    typeof c.canEdit !== "boolean" ||
    typeof c.sourceHash !== "string" ||
    !hash(c.sourceHash) ||
    !Array.isArray(c.regions) ||
    c.regions.length !== 3
  )
    return false;
  const u32 = (n: number) => Number.isInteger(n) && n >= 0 && n <= 4294967295;
  return c.regions.every(
    (r, regionIndex) =>
      r &&
      r.origin === RAID9_ORIGINS[regionIndex] &&
      typeof r.available === "boolean" &&
      r.countUsed === [72, 100, 80][regionIndex] &&
      Number.isInteger(r.countAll) &&
      r.countAll >= 0 &&
      r.countAll <= (32 * 1024 * 1024) / 32 &&
      r.hasSeeds === (regionIndex === 0) &&
      [r.currentSeed, r.tomorrowSeed].every((seed) =>
        r.available && r.hasSeeds
          ? typeof seed === "string" && /^[0-9A-F]{16}$/.test(seed)
          : seed === null,
      ) &&
      Array.isArray(r.entries) &&
      r.entries.length === (r.available ? r.countUsed : 0) &&
      (!r.available || r.countAll >= r.countUsed) &&
      r.entries.every(
        (e, i) =>
          e &&
          e.index === i &&
          typeof e.isEnabled === "boolean" &&
          typeof e.isClaimedLeaguePoints === "boolean" &&
          [
            e.areaID,
            e.lotteryGroup,
            e.spawnPointID,
            e.unused,
            e.contentRaw,
          ].every(u32) &&
          typeof e.seed === "string" &&
          /^[0-9A-F]{8}$/.test(e.seed) &&
          typeof e.raw === "string" &&
          /^[0-9A-F]{64}$/.test(e.raw) &&
          typeof e.scenePointName === "string" &&
          typeof e.content === "string",
      ),
  );
}
