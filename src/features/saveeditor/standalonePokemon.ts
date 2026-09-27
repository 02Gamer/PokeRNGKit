import type { MoveChoice, PokemonEntry, SaveReport } from "./domain";
import type { PokemonEdit } from "./PokemonEditor";

export const MAX_ENTITY_BYTES = 1024 * 1024;
export interface StandalonePokemonReport {
  apiVersion: 66;
  format: string;
  extension: string;
  party: boolean;
  canEdit: boolean;
  pokemon: PokemonEntry;
  attributeChoices: SaveReport["attributeChoices"];
  moveChoices: MoveChoice[];
}
export interface StandalonePokemonRequest {
  fileName: string;
  inputEncrypted: boolean;
  party?: boolean;
  encrypted?: boolean;
  edit?: PokemonEdit;
}
export type StandalonePokemonOperation =
  "entityInspect" | "entityEdit" | "entityExport";
export interface StandalonePokemonResult {
  entity: StandalonePokemonReport;
  output?: Uint8Array<ArrayBuffer>;
  entityFile?: Uint8Array<ArrayBuffer>;
}

// History must restore encoding metadata together with the original byte sequence.
export interface StandalonePokemonSnapshot {
  bytes: Uint8Array<ArrayBuffer>;
  fileName: string;
  inputEncrypted: boolean;
}
