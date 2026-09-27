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
  OriginCatalog,
  OriginChoice,
} from "./domain";
import type { PokemonEdit } from "./PokemonEditor";

export const MAX_ENTITY_BYTES = 1024 * 1024;
export interface StandalonePokemonReport {
  apiVersion: 70;
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
  version?: number;
  useFileFormat?: boolean;
  eggTrainer?: StandaloneEggTrainer;
}
export interface StandaloneEggTrainer {
  version: number;
  name: string;
  tid: number;
  sid: number;
}
export interface StandaloneEggCatalog {
  games: OriginChoice[];
  trainer: StandaloneEggTrainer;
  maximumName: number;
}
export interface StandaloneAdvancedData {
  eggContext?: StandaloneEggCatalog | null;
  origin?: OriginCatalog | null;
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
  useFileFormat?: boolean;
  eggTrainer?: StandaloneEggTrainer;
}
