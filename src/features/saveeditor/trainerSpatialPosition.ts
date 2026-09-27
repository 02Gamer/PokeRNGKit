export const TRAINER_SPATIAL_KEYS = [
  "map",
  "x",
  "z",
  "y",
  "rotation",
  "scaleX",
  "scaleZ",
  "scaleY",
] as const;
export type TrainerSpatialKey = (typeof TRAINER_SPATIAL_KEYS)[number];
export interface TrainerSpatialField {
  key: TrainerSpatialKey;
  value: string;
  min: string;
  max: string;
  places: number;
  truncate: boolean;
}

// Fixed-point comparison also keeps SWSH's uint64 map ID exact, beyond Number.MAX_SAFE_INTEGER.
export function spatialUnits(text: string, places: number): bigint | null {
  if (text.length > 64 || !/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const negative = text.startsWith("-"),
    [whole, fraction = ""] = (negative ? text.slice(1) : text).split(".");
  if (fraction.length > places) return null;
  return BigInt(whole + fraction.padEnd(places, "0")) * (negative ? -1n : 1n);
}

export function validateSpatialPosition(
  draft: Record<TrainerSpatialKey, string>,
  fields: TrainerSpatialField[],
) {
  const result: Partial<Record<TrainerSpatialKey, string>> = {};
  // DS owns its four existing fields when no spatial format is present.
  const keys = fields.length
    ? TRAINER_SPATIAL_KEYS
    : TRAINER_SPATIAL_KEYS.slice(4);
  for (const key of keys) {
    const field = fields.find((f) => f.key === key);
    if (draft[key] === (field?.value ?? "")) continue;
    const value = spatialUnits(draft[key], field?.places ?? 0);
    if (
      field &&
      value !== null &&
      value === spatialUnits(field.value, field.places)
    )
      continue;
    if (
      !field ||
      value === null ||
      value < spatialUnits(field.min, field.places)! ||
      value > spatialUnits(field.max, field.places)!
    )
      throw new Error(
        "Trainer spatial position is unsupported or out of range.",
      );
    result[key] = draft[key];
  }
  return Object.keys(result).length ? result : undefined;
}
