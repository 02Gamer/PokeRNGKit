// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText, PokemonPosition } from "./domain";
export interface SearchChoice {
  id: number;
  name: LocalizedText;
}
export interface PokemonSearchField {
  name: string;
  type: string;
  present: boolean;
  hasValue: boolean;
  value: string;
}
export interface PokemonSearchFormat {
  index: number;
  name: string;
  fields: PokemonSearchField[];
}
export interface PokemonSearchCatalog {
  species: SearchChoice[];
  abilities: SearchChoice[];
  natures: SearchChoice[];
  items: SearchChoice[];
  games: SearchChoice[];
  hiddenPowerTypes: SearchChoice[];
  moves: SearchChoice[];
  prefixes: string[];
  mutationPrefixes: boolean[];
  formats: PokemonSearchFormat[];
}
export interface PokemonSearchQuery {
  species: number;
  ability: number;
  nature: number;
  item: number;
  nickname: string;
  version: number;
  generation: number;
  hiddenPowerType: number;
  levelComparison: number;
  level: string;
  ivType: number;
  evType: number;
  shiny: boolean | null;
  egg: boolean | null;
  esv: string;
  moves: number[];
  instructions: string;
}
export interface PokemonSearchResults {
  matches: PokemonPosition[];
}
export function searchCandidateInput(
  choices: SearchChoice[],
  lang: "zh" | "en" | "ja",
  text: string,
  emptyValue = 0,
) {
  const index = choices.findIndex(
    (choice) =>
      choice.name[lang].toLocaleLowerCase(lang) ===
      text.toLocaleLowerCase(lang),
  );
  return { index, text, value: index < 0 ? emptyValue : choices[index].id };
}
// Core ComboItemUtil uses CompareOrdinal; held items keep their first None entry.
export function orderSearchChoices(
  choices: SearchChoice[],
  lang: "zh" | "en" | "ja",
  keepFirst = false,
) {
  const first = keepFirst ? choices.slice(0, 1) : [];
  const rest = (keepFirst ? choices.slice(1) : [...choices]).sort((a, b) =>
    a.name[lang] < b.name[lang] ? -1 : a.name[lang] > b.name[lang] ? 1 : 0,
  );
  return [...first, ...rest];
}
export interface PokemonSearchActions {
  catalog(
    position?: PokemonPosition,
  ): Promise<PokemonSearchCatalog | undefined>;
  search(query: PokemonSearchQuery): Promise<PokemonSearchResults | undefined>;
  seek(
    query: PokemonSearchQuery,
    box: number,
    slot: number,
    reverse: boolean,
  ): Promise<PokemonPosition | null | undefined>;
}
export function newPokemonSearch(): PokemonSearchQuery {
  return {
    species: 0,
    ability: -1,
    nature: 25,
    item: -1,
    nickname: "",
    version: -1,
    generation: 0,
    hiddenPowerType: -1,
    levelComparison: 0,
    level: "",
    ivType: 0,
    evType: 0,
    shiny: null,
    egg: null,
    esv: "",
    moves: [0, 0, 0, 0],
    instructions: "",
  };
}
// Selection side effects from EntitySearchControl; result matching remains in Core.
export function changePokemonSearch(
  query: PokemonSearchQuery,
  field: "generation" | "version" | "levelComparison",
  value: number,
): PokemonSearchQuery {
  if (field === "generation")
    return { ...query, generation: value, version: value ? -1 : query.version };
  if (field === "version")
    return {
      ...query,
      version: value,
      generation: value === -1 ? query.generation : 0,
    };
  return {
    ...query,
    levelComparison: value,
    level: value === 0 ? "" : query.level,
  };
}
export function appendSearchInstruction(
  text: string,
  catalog: PokemonSearchCatalog,
  format: number,
  property: string,
  prefix: string,
) {
  const selected = catalog.formats.find((f) => f.index === format);
  if (
    !selected?.fields.some((f) => f.name === property) ||
    !catalog.prefixes.includes(prefix)
  )
    throw Error("Invalid source instruction selection.");
  const next =
    text + (text && !text.endsWith("\n") ? "\n" : "") + prefix + property + "=";
  if (next.length > 32767)
    throw Error("Search instructions exceed the browser limit.");
  return next;
}
