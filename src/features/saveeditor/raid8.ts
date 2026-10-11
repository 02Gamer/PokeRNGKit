export interface Raid8Entry {
  index: number;
  hash: string;
  seed: string;
  stars: number;
  randRoll: number;
  denType: number;
  flags: number;
  active: boolean;
  rare: boolean;
  wishingPiece: boolean;
  wattsHarvested: boolean;
  event: boolean;
  raw: string;
}
export interface Raid8Region {
  origin: number;
  countUsed: number;
  countAll: number;
  available: boolean;
  entries: Raid8Entry[];
}
export interface Raid8Catalog {
  canEdit: boolean;
  sourceHash: string;
  regions: Raid8Region[];
}
export interface Raid8Operation {
  origin: number;
  index: number;
  property: string;
  value: string;
}
export interface Raid8Edit {
  sourceHash: string;
  operations: Raid8Operation[];
  targetHash?: string;
}
export interface Raid8Preview {
  request: Raid8Edit;
  result: Raid8Catalog;
  changedOffsets: number[];
}
export const supportsRaid8 = (format: string) => format === "SAV8SWSH";
export const raid8Properties = [
  "hash",
  "seed",
  "stars",
  "randRoll",
  "denType",
  "flags",
  "rare",
  "wishingPiece",
  "wattsHarvested",
  "event",
] as const;
export function raid8Hex(text: string) {
  let s = text;
  if (/^0x/i.test(s)) s = s.slice(2);
  s = s.trim();
  if (!/^[\da-f]+$/i.test(s)) return "0000000000000000";
  try {
    const n = BigInt("0x" + s);
    return n <= 0xffffffffffffffffn
      ? n.toString(16).toUpperCase().padStart(16, "0")
      : "0000000000000000";
  } catch {
    return "0000000000000000";
  }
}
export function raid8Request(
  c: Raid8Catalog,
  operations: Raid8Operation[],
): Raid8Edit {
  if (
    !c.canEdit ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash) ||
    operations.length > 4096
  )
    throw Error("Raid8 is read-only or request too large.");
  for (const op of operations) {
    const region = c.regions.find((r) => r.origin === op.origin);
    if (
      !region?.available ||
      !Number.isInteger(op.index) ||
      !region.entries.some((e) => e.index === op.index) ||
      !raid8Properties.includes(op.property as (typeof raid8Properties)[number])
    )
      throw Error("Invalid Raid8 property or den.");
    if (
      ["stars", "randRoll", "denType", "flags"].includes(op.property) &&
      (!/^\s*\+?\d+\s*$/.test(op.value) || Number(op.value) > 255)
    )
      throw Error("Invalid Raid8 byte.");
    if (
      ["rare", "wishingPiece", "wattsHarvested", "event"].includes(
        op.property,
      ) &&
      !/^true$|^false$/i.test(op.value)
    )
      throw Error("Invalid Raid8 boolean.");
  }
  return { sourceHash: c.sourceHash, operations };
}
export function raid8Frozen(c: Raid8Catalog, p: Raid8Preview): Raid8Edit {
  raid8Request(c, p.request.operations);
  if (
    p.request.sourceHash !== c.sourceHash ||
    !/^[0-9A-F]{64}$/.test(p.request.targetHash ?? "") ||
    p.request.targetHash !== p.result.sourceHash
  )
    throw Error("Raid8 preview is stale.");
  return p.request;
}
