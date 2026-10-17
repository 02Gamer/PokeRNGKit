// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonEntry, PokemonPosition, OriginChoice } from "./domain";
import type { PokemonSearchFormat } from "./pokemonSearch";
export type EncounterRequestKind =
  | "encounterOpen"
  | "encounterRead"
  | "encounterCatalog"
  | "encounterCriteria"
  | "encounterPreview"
  | "encounterCommit"
  | "encounterDiscard"
  | "encounterReset";
export interface EncounterCriteria {
  gender: number;
  ability: number;
  nature: number;
  shiny: number;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  levelMin: number;
  levelMax: number;
  hiddenPowerType: number;
  form: number;
  mutations: number;
}
export interface EncounterTrainer {
  version: number;
  name: string;
  tid: number;
  sid: number;
  gender: number;
  language: number;
  consoleRegion: number;
  country: number;
  region: number;
}
export interface EncounterOptions {
  returnNoneIfEmptySearch: boolean;
  filterUnavailableSpecies: boolean;
  useTabsAsCriteria: boolean;
  useTabsAsCriteriaAnySpecies: boolean;
  gridRows: number;
}
export interface EncounterOpen {
  position?: PokemonPosition;
  fileName?: string;
  criteria?: EncounterCriteria;
  trainers?: EncounterTrainer[];
  trainerFiles?: { fileName: string; data: string }[];
  options?: EncounterOptions;
}
export interface EncounterQuery {
  species: number;
  version: number;
  moves: number[];
  egg: boolean | null;
  shiny: boolean | null;
  types: number[];
  instructions: string;
}
export interface EncounterRow {
  artwork?: import("./PokemonSprite").SpriteData | null;
  id: number;
  species: number;
  form: number;
  gender: number;
  generation: number;
  version: number;
  levelMin: number;
  levelMax: number;
  location: number;
  eggLocation: number;
  egg: boolean;
  shiny: boolean;
  ability: number;
  type: string;
  sprite: string;
  details: { zh: string[]; en: string[]; ja: string[] };
}
export interface EncounterView {
  trainerFileCount: number;
  sourceHash: string;
  matches: number;
  offset: number;
  gridRows: number;
  criteria: EncounterCriteria;
  rows: EncounterRow[];
}
export interface EncounterCatalog {
  species: OriginChoice[];
  games: OriginChoice[];
  moves: OriginChoice[];
  languages: OriginChoice[];
  natures: OriginChoice[];
  hiddenPowerTypes: OriginChoice[];
  types: EncounterEnum[];
  genders: EncounterEnum[];
  abilities: EncounterEnum[];
  shinies: EncounterEnum[];
  mutations: EncounterEnum[];
  unrestricted: EncounterCriteria;
  fromEditor: EncounterCriteria;
  formats: PokemonSearchFormat[];
  prefixes: string[];
}
export interface EncounterEnum {
  id: number;
  name: string;
}
export interface EncounterConfirmation {
  token: string;
  sourceHash: string;
  outputHash: string;
}
export interface EncounterTicket {
  confirmation: EncounterConfirmation;
  id: number;
  pokemon: PokemonEntry;
}
