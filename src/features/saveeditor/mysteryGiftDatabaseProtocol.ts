// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText, OriginChoice, PokemonEntry } from "./domain";
import type { PokemonSearchFormat } from "./pokemonSearch";
export type MysteryGiftDatabaseRequestKind =
  | "giftDatabaseOpen"
  | "giftDatabaseRead"
  | "giftDatabaseCatalog"
  | "giftDatabasePreview"
  | "giftDatabaseCommit"
  | "giftDatabaseExport"
  | "giftDatabaseExportAll"
  | "giftDatabaseArchive"
  | "giftDatabaseDiscard"
  | "giftDatabaseReset";
export interface MysteryGiftDatabaseOptions {
  filterUnavailableSpecies: boolean;
  gridRows: number;
}
export interface MysteryGiftDatabaseOpen {
  options?: MysteryGiftDatabaseOptions;
  files?: { fileName: string; data: string }[];
}
export interface MysteryGiftDatabaseQuery {
  species: number;
  heldItem: number;
  moves: number[];
  egg: boolean | null;
  shiny: boolean | null;
  generation: number;
  comparison: number;
  instructions: string;
}
export interface MysteryGiftDatabaseRow {
  id: number;
  cardId: number;
  title: string;
  type: string;
  fileName: string;
  species: number;
  form: number;
  generation: number;
  version: number;
  egg: boolean;
  shiny: boolean;
  sprite: string;
  details: LocalizedText[];
}
export interface MysteryGiftDatabaseView {
  sourceHash: string;
  matches: number;
  offset: number;
  gridRows: number;
  rows: MysteryGiftDatabaseRow[];
}
export interface MysteryGiftDatabaseCatalog {
  species: OriginChoice[];
  items: OriginChoice[];
  moves: OriginChoice[];
  formats: PokemonSearchFormat[];
  prefixes: string[];
}
export interface MysteryGiftDatabaseConfirmation {
  token: string;
  sourceHash: string;
  outputHash: string;
}
export interface MysteryGiftDatabaseTicket {
  confirmation: MysteryGiftDatabaseConfirmation;
  id: number;
  convertToSave: boolean;
  pokemon: PokemonEntry;
}
export function defaultMysteryGiftQuery(
  generation = 10,
): MysteryGiftDatabaseQuery {
  return {
    species: -1,
    heldItem: -1,
    moves: [-1, -1, -1, -1],
    egg: null,
    shiny: null,
    generation: generation >= 4 && generation <= 9 ? generation : 10,
    comparison: 3,
    instructions: "",
  };
}
