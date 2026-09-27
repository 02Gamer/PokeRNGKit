import type { TrainerDateKey, TrainerDateField } from "./domain";

// These game clock values have no timezone. UTC here validates the calendar only.
export function normalizeTrainerDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return "";
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalized}Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 19) === normalized
    ? normalized
    : "";
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");
function localClock(date: Date) {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function trainerDateValue(field?: TrainerDateField): string {
  if (!field?.value) return "";
  if (field.kind !== "utc") return field.value;
  const date = new Date(field.value);
  return Number.isFinite(date.getTime()) ? localClock(date) : "";
}

export function trainerDateWithOffset(value: string): string {
  const normalized = normalizeTrainerDate(value);
  if (!normalized) return "";
  const date = new Date(normalized);
  // A nonexistent local clock (DST gap) must not silently move to another hour.
  if (!Number.isFinite(date.getTime()) || localClock(date) !== normalized)
    return "";
  return `${normalized}${offsetText(date)}`;
}

function offsetText(date: Date) {
  const offset = -date.getTimezoneOffset();
  return `${offset < 0 ? "-" : "+"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

export function trainerDateOffset(
  field: TrainerDateField,
  input: string,
): string {
  if (field.kind !== "utc") return "";
  const original = trainerDateValue(field);
  if (original && normalizeTrainerDate(input) === original)
    return offsetText(new Date(field.value));
  return trainerDateWithOffset(input).slice(19);
}

export function validateTrainerDates(
  draft: Record<TrainerDateKey, string>,
  state: TrainerDateField[],
) {
  const result: Partial<Record<TrainerDateKey, string>> = {};
  for (const key of ["started", "fame", "saved"] as const) {
    const field = state.find((f) => f.key === key);
    const original = trainerDateValue(field);
    if (draft[key] === original) continue;
    const value =
      field?.kind === "date"
        ? /^\d{4}-\d{2}-\d{2}$/.test(draft[key]) &&
          normalizeTrainerDate(`${draft[key]}T00:00:00`)
          ? draft[key]
          : ""
        : normalizeTrainerDate(draft[key]);
    if (value && value === original) continue;
    if (
      !field ||
      !value ||
      value < field.min ||
      value > field.max ||
      (field.kind === "minute" && !value.endsWith(":00"))
    )
      throw new Error("Trainer dates are unsupported or out of range.");
    const next = field.kind === "utc" ? trainerDateWithOffset(value) : value;
    if (!next)
      throw new Error("Trainer dates are unsupported or out of range.");
    result[key] = next;
  }
  return Object.keys(result).length ? result : undefined;
}
