import type {
  MoveChoice,
  PokemonEntry,
  SaveReport,
  PokemonLegalityReport,
  PokemonRawEdit,
  RibbonCatalog,
  HistoryCatalog,
  MemoryCatalog,
  CareField,
} from "./domain";
import type { PokemonEdit } from "./PokemonEditor";

export const MAX_ENTITY_BYTES = 1024 * 1024;
export interface StandalonePokemonReport {
  apiVersion: 68;
  format: string;
  extension: string;
  party: boolean;
  canEdit: boolean;
  generation: number;
  canMemories: boolean;
  care: CareField[];
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
  raw?: PokemonRawEdit;
  readKind?: keyof StandaloneAdvancedData;
  handler?: number;
  memory?: number;
}
export interface StandaloneAdvancedData {
  ribbons?: RibbonCatalog | null;
  history?: HistoryCatalog | null;
  memory?: MemoryCatalog | null;
  relearn?: number[] | null;
}
export type StandalonePokemonOperation =
  | "entityRaw"
  | "entityDetails"
  | "entityLegality"
  | "entityInspect"
  | "entityEdit"
  | "entityExport";
export interface StandalonePokemonResult {
  details?: StandaloneAdvancedData;
  legality?: PokemonLegalityReport;
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
