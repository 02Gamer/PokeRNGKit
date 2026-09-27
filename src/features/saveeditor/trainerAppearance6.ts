export interface TrainerAppearance6State {
  nickname: string;
  gender: number;
  fields: {
    key: string;
    value: number;
    max: number;
    choices: { id: number; name: string }[];
  }[];
}
export interface AppearanceDraft extends Record<`fashion.${string}`, string> {
  nickname: string;
  fashionGender: string;
}
export function appearanceDraft(
  state: TrainerAppearance6State | null,
): AppearanceDraft {
  return {
    nickname: state?.nickname ?? "",
    fashionGender: String(state?.gender ?? ""),
    ...Object.fromEntries(
      state?.fields.map((f) => [`fashion.${f.key}`, String(f.value)]) ?? [],
    ),
  };
}
export function resetAppearance<T extends AppearanceDraft>(
  draft: T,
  state: TrainerAppearance6State | null,
): T {
  const result = { ...draft };
  for (const key of Object.keys(result))
    if (key.startsWith("fashion.")) delete result[key as `fashion.${string}`];
  return { ...result, ...appearanceDraft(state) };
}
export function rebaseAppearance<T extends AppearanceDraft>(
  draft: T,
  before: TrainerAppearance6State | null,
  after: TrainerAppearance6State | null,
  next: T,
): T {
  const dirty =
    draft.fashionGender !== String(before?.gender ?? "") ||
    before?.fields.some((f) => draft[`fashion.${f.key}`] !== String(f.value));
  if (dirty && draft.fashionGender !== String(after?.gender ?? "")) {
    const result = { ...next, fashionGender: draft.fashionGender };
    for (const key of Object.keys(result))
      if (key.startsWith("fashion.")) delete result[key as `fashion.${string}`];
    for (const key of Object.keys(draft))
      if (key.startsWith("fashion."))
        (result as AppearanceDraft)[key as `fashion.${string}`] =
          draft[key as `fashion.${string}`];
    return result;
  }
  const allowed = new Set(after?.fields.map((f) => `fashion.${f.key}`));
  for (const key of Object.keys(next))
    if (key.startsWith("fashion.") && !allowed.has(key))
      delete next[key as `fashion.${string}`];
  return next;
}
export function validateAppearance(
  draft: AppearanceDraft,
  state: TrainerAppearance6State | null,
) {
  const nickname =
    draft.nickname !== (state?.nickname ?? "") ? draft.nickname : undefined;
  if (
    nickname !== undefined &&
    (!state ||
      nickname.length > 12 ||
      [...nickname].some((char) => {
        const code = char.charCodeAt(0);
        return code < 32 || (code >= 127 && code <= 159);
      }))
  )
    throw new Error(
      "Trainer nickname must contain at most 12 characters without control characters.",
    );
  if (draft.fashionGender !== String(state?.gender ?? ""))
    throw new Error(
      "Trainer appearance format or gender has changed. Reset the appearance draft.",
    );
  const fields: Record<string, number> = {};
  for (const [key, text] of Object.entries(draft)) {
    if (!key.startsWith("fashion.")) continue;
    const field = state?.fields.find((f) => `fashion.${f.key}` === key);
    if (field && text === String(field.value)) continue;
    if (!field || !/^\d+$/.test(text) || Number(text) > field.max)
      throw new Error(
        "Trainer appearance field is unsupported or out of range.",
      );
    fields[field.key] = Number(text);
  }
  return state && (nickname !== undefined || Object.keys(fields).length)
    ? { gender: state.gender, nickname, fields }
    : undefined;
}
