import type { LocalizedText } from "./domain";
export interface Dex4State {
  species: number;
  seen: boolean;
  caught: boolean;
  genders: number[];
  forms: number[];
  languages: boolean[];
}
export interface Dex4Entry {
  state: Dex4State;
  name: LocalizedText;
  genderChoices: number[];
  formChoices: LocalizedText[];
  hasLanguage: boolean;
}
export interface Dex4Catalog {
  canEdit: boolean;
  upgrade: number;
  upgrades: { id: number; name: LocalizedText }[];
  entries: Dex4Entry[];
}
export type Dex4Action = "clear" | "seen" | "caught" | "uncaught" | "complete";
export type Dex4Edit =
  | { action: Dex4Action; species: number }
  | { action: "entry"; entry: Dex4State }
  | { action: "upgrade"; upgrade: number };
export function toggleDex4Seen(
  state: Dex4State,
  entry: Dex4Entry,
  seen: boolean,
): Dex4State {
  if (!seen)
    return {
      ...state,
      seen: false,
      caught: false,
      genders: [],
      forms: [],
      languages: Array(6).fill(false),
    };
  return {
    ...state,
    seen: true,
    genders: state.genders.length
      ? [...state.genders]
      : [...entry.genderChoices],
    forms: state.genders.length
      ? [...state.forms]
      : entry.formChoices.map((_, i) => i),
  };
}
export function moveDex4Item(
  items: number[],
  index: number,
  delta: number,
): number[] {
  const result = [...items];
  const target = index + delta;
  if (
    index < 0 ||
    index >= items.length ||
    target < 0 ||
    target >= items.length
  )
    return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
export function validateDex4(state: Dex4State, entry: Dex4Entry): Dex4Edit {
  if (
    state.species !== entry.state.species ||
    typeof state.seen !== "boolean" ||
    typeof state.caught !== "boolean" ||
    state.languages.length !== 6 ||
    state.languages.some(
      (v) => typeof v !== "boolean" || (!entry.hasLanguage && v),
    ) ||
    new Set(state.genders).size !== state.genders.length ||
    state.genders.some((g) => !entry.genderChoices.includes(g)) ||
    new Set(state.forms).size !== state.forms.length ||
    state.forms.some(
      (f) => !Number.isInteger(f) || f < 0 || f >= entry.formChoices.length,
    )
  )
    throw new Error("Pokedex entry values are invalid.");
  return {
    action: "entry",
    entry: {
      ...state,
      genders: [...state.genders],
      forms: [...state.forms],
      languages: [...state.languages],
    },
  };
}
