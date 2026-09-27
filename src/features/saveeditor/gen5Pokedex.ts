import type { LocalizedText } from "./domain";
export interface Dex5State {
  species: number;
  caught: boolean;
  seen: boolean[];
  displayed: boolean[];
  languages: boolean[];
  forms: boolean[][];
  foreign?: boolean | null;
  countSeen?: string | null;
  countObtained?: string | null;
}
export interface Dex5Entry {
  state: Dex5State;
  name: LocalizedText;
  allowedRegions: boolean[];
  formChoices: LocalizedText[];
}
export interface Dex5Globals {
  unlocked: boolean;
  nationalMode: boolean;
  initialSpecies: number;
  spinda: string;
}
export interface Dex5Catalog {
  canEdit: boolean;
  globals: Dex5Globals;
  entries: Dex5Entry[];
}
export type Dex5Action =
  | "give"
  | "giveNone"
  | "clear"
  | "seen"
  | "caught"
  | "uncaught"
  | "complete"
  | "formsClear"
  | "formsFirst"
  | "formsAll"
  | "dexNavAll"
  | "dexNavClear";
export type Dex5Edit =
  | { action: "entry"; entry: Dex5State }
  | { action: "globals"; globals: Dex5Globals }
  | {
      action: Dex5Action;
      species: number;
      shiny: boolean;
      allLanguages: boolean;
    };
export const dex5Shiny = (action: Dex5Action) =>
  ["give", "seen", "complete", "formsFirst", "formsAll"].includes(action);
export const dex5Languages = (action: Dex5Action) =>
  ["give", "caught", "complete"].includes(action);
export function toggleDex5Region(
  state: Dex5State,
  region: number,
  display: boolean,
  value: boolean,
): Dex5State {
  const seen = [...state.seen];
  let displayed = [...state.displayed];
  if (display) {
    displayed[region] = value;
    if (value) {
      displayed = displayed.map((_, i) => i === region);
      seen[region] = true;
    }
  } else {
    seen[region] = value;
    if (!seen.some(Boolean)) displayed.fill(false);
    else if (value && !displayed.some(Boolean)) displayed[region] = true;
  }
  return { ...state, seen, displayed };
}
export function toggleDex5Form(
  state: Dex5State,
  region: number,
  index: number,
  value: boolean,
): Dex5State {
  const forms = state.forms.map((r) => [...r]);
  forms[region][index] = value;
  if (region >= 2 && value) {
    forms[2].fill(false);
    forms[3].fill(false);
    forms[region][index] = true;
    forms[region - 2][index] = true;
  }
  return { ...state, forms };
}
export function validateDex5(
  state: Dex5State,
  entry: Dex5Entry,
  languageMax = 493,
): Dex5Edit {
  const arrays = [state.seen, state.displayed, state.languages, ...state.forms];
  if (
    state.species !== entry.state.species ||
    typeof state.caught !== "boolean" ||
    state.seen.length !== 4 ||
    state.displayed.length !== 4 ||
    state.languages.length !== 7 ||
    state.forms.length !== 4 ||
    state.forms.some((r) => r.length !== entry.formChoices.length) ||
    arrays.some((a) => a.some((v) => typeof v !== "boolean")) ||
    (state.species > languageMax && state.languages.some(Boolean)) ||
    entry.allowedRegions.some(
      (allowed, i) =>
        !allowed &&
        ((state.seen[i] && !entry.state.seen[i]) ||
          (state.displayed[i] && !entry.state.displayed[i])),
    )
  )
    throw new Error("Pokedex choices are invalid.");
  return {
    action: "entry",
    entry: {
      ...state,
      seen: [...state.seen],
      displayed: [...state.displayed],
      languages: [...state.languages],
      forms: state.forms.map((r) => [...r]),
    },
  };
}
