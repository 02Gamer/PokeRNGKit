import type { TrainerDateKey, TrainerDateState } from "./domain";

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

export function validateTrainerDates(
  draft: Record<TrainerDateKey, string>,
  state: TrainerDateState | null,
) {
  const result: Partial<Record<TrainerDateKey, string>> = {};
  for (const key of ["started", "fame"] as const) {
    if (draft[key] === (state?.[key] ?? "")) continue;
    const value = normalizeTrainerDate(draft[key]);
    if (state && value === state[key]) continue;
    if (!state || !value || value < state.min || value > state.max)
      throw new Error("Trainer dates are unsupported or out of range.");
    result[key] = value;
  }
  return Object.keys(result).length ? result : undefined;
}
