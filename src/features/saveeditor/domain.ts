export const MAX_SAVE_BYTES = 32 * 1024 * 1024;

export interface SaveReport {
  apiVersion: 26;
  attributeChoices: {
    natures: LocalizedText[];
    items: LocalizedText[];
    species: SpeciesChoice[];
  };
  format: string;
  generation: number;
  version: string;
  ot: string;
  tid: number;
  sid: number;
  displayTid: number;
  displaySid: number;
  language: number;
  gender: number;
  money: number;
  maxMoney: number;
  maxNameLength: number;
  boxCount: number;
  partyCount: number;
  playTime: string;
  checksumsValid: boolean;
  canEdit: boolean;
  extension: string;
  nationalDex: boolean | null;
  pokemon: PokemonEntry[];
  moveChoices: MoveChoice[];
  boxSlotCount: number;
  boxOptions: {
    canName: boolean;
    nameLength: number;
    wallpapers: LocalizedText[];
  };
  boxes: { index: number; name: string; wallpaper: number }[];
}

export interface LocalizedText {
  zh: string;
  en: string;
  ja: string;
}
export interface MoveChoice {
  name: LocalizedText;
  maxPp: number[];
}
export interface SpeciesChoice {
  id: number;
  name: LocalizedText;
  forms: {
    name: LocalizedText;
    genders: number[];
    abilities: LocalizedText[];
  }[];
}
export interface OriginChoice {
  id: number;
  name: LocalizedText;
}
export interface OriginCatalog {
  version: number;
  games: OriginChoice[];
  balls: OriginChoice[];
  metLocations: OriginChoice[];
  eggLocations: OriginChoice[];
}
export interface PokemonEntry {
  relearnMoves: number[] | null;
  eggInfo: { cycles: number; suggestedMinimum: number } | null;
  origin: {
    version: number;
    ball: number;
    metLocation: number;
    eggLocation: number;
    canEggLocation: boolean;
  };
  encounter: {
    metLevel: number;
    maxMetLevel: number;
    fateful: boolean;
    canDates: boolean;
    metDate: string;
    eggDate: string;
  };
  formArgument: {
    mode: "Raw" | "Named" | "Triple" | "TripleParty";
    value: number;
    max: number;
    remain: number;
    elapsed: number;
    maximum: number;
    canRemain: boolean;
    canElapsed: boolean;
    canMaximum: boolean;
    choices: LocalizedText[];
  } | null;
  canEditEncryptionConstant: boolean;
  isNicknamed: boolean;
  natureId: number;
  statAlignment: number;
  canStatAlignment: boolean;
  abilityIndex: number;
  abilityChoices: LocalizedText[];
  heldItem: number;
  movePpUps: number[];
  sprite: string;
  moveIds: number[];
  limits: {
    nickname: number;
    trainerName: number;
    iv: number;
    ev: number;
    move: number;
  };
  box: number;
  slot: number;
  species: number;
  form: number;
  nickname: string;
  level: number;
  gender: number;
  shiny: boolean;
  egg: boolean;
  valid: boolean;
  ot: string;
  tid: number;
  sid: number;
  pid: number;
  encryptionConstant: number;
  experience: number;
  friendship: number;
  speciesName: LocalizedText;
  nature: LocalizedText;
  ability: LocalizedText;
  item: LocalizedText;
  moves: LocalizedText[];
  movePp: number[];
  ivs: number[];
  evs: number[];
}

export interface TrainerDraft {
  ot: string;
  tid: string;
  sid: string;
  money: string;
}

export function trainerDraft(report: SaveReport): TrainerDraft {
  return {
    ot: report.ot,
    tid: String(report.tid),
    sid: String(report.sid),
    money: String(report.money),
  };
}

export function validateTrainer(draft: TrainerDraft, report: SaveReport) {
  if (!report.canEdit || !report.checksumsValid)
    throw new Error("This save is read-only.");
  if (
    !draft.ot ||
    draft.ot.length > report.maxNameLength ||
    [...draft.ot].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  ) {
    throw new Error(`OT: 1–${report.maxNameLength} characters.`);
  }
  const integer = (text: string, max: number, label: string) => {
    if (!/^\d+$/.test(text) || Number(text) > max)
      throw new Error(`${label}: 0–${max}.`);
    return Number(text);
  };
  return {
    ot: draft.ot,
    tid: integer(draft.tid, 65535, "TID16"),
    sid: integer(draft.sid, 65535, "SID16"),
    money: integer(draft.money, report.maxMoney, "Money"),
  };
}

// Grouped game IDs are deliberately not resolved to one arbitrary game.
export const SAVE_GAME_CHOICES: Readonly<Record<string, readonly string[]>> = {
  R: ["ruby"],
  S: ["sapphire"],
  RS: ["ruby", "sapphire"],
  E: ["emerald"],
  FR: ["firered"],
  LG: ["leafgreen"],
  FRLG: ["firered", "leafgreen"],
  COLO: ["colosseum"],
  XD: ["xd"],
  D: ["diamond"],
  P: ["pearl"],
  DP: ["diamond", "pearl"],
  Pt: ["platinum"],
  HG: ["heartgold"],
  SS: ["soulsilver"],
  HGSS: ["heartgold", "soulsilver"],
  B: ["black"],
  W: ["white"],
  BW: ["black", "white"],
  B2: ["black2"],
  W2: ["white2"],
  B2W2: ["black2", "white2"],
  X: ["x"],
  Y: ["y"],
  OR: ["omega-ruby"],
  AS: ["alpha-sapphire"],
  SN: ["sun"],
  MN: ["moon"],
  US: ["ultra-sun"],
  UM: ["ultra-moon"],
  SW: ["sword"],
  SH: ["shield"],
  BD: ["brilliantdiamond"],
  SP: ["shiningpearl"],
};

export function saveGameChoices(report: SaveReport): readonly string[] {
  if (report.format === "SAV3Colosseum") return ["colosseum"];
  if (report.format === "SAV3XD") return ["xd"];
  return SAVE_GAME_CHOICES[report.version] ?? [];
}

export function exportSaveName(name: string) {
  const clean = [...name.replace(/[<>:"/\\|?*]/gu, "_")]
    .map((char) => (char.charCodeAt(0) < 32 ? "_" : char))
    .join("");
  return `edited-${clean || "main"}`;
}

export interface PokemonPosition {
  box: number;
  slot: number;
}
export interface PokemonRawEdit extends PokemonPosition {
  action:
    | "values"
    | "rerollPid"
    | "rerollEc"
    | "formArgument"
    | "encounter"
    | "origin"
    | "egg"
    | "shiny"
    | "relearn"
    | "ribbons"
    | "history"
    | "care"
    | "memory";
  relearn?: { moves: number[] };
  memory?: MemoryEdit;
  history?: HistoryEdit;
  care?: { values: { key: CareField["key"]; value: number }[] };
  ribbons?: {
    mode?: "values" | "suggest" | "minimal";
    values: { key: string; value: number }[];
    affixed?: number;
  };
  shiny?: { method: "pid" | "sid"; type: "any" | "star" | "square" | "off" };
  egg?: { action: "cycles" | "hatch" | "makeEgg"; cycles?: number };
  origin?: {
    version?: number;
    ball?: number;
    metLocation?: number;
    eggLocation?: number;
  };
  encounter?: {
    metLevel?: number;
    fateful?: boolean;
    metDate?: string;
    eggDate?: string;
  };
  formArgument?: {
    value?: number;
    remain?: number;
    elapsed?: number;
    maximum?: number;
  };
  pid?: number;
  encryptionConstant?: number;
}

export function parsePokemonHex(value: string): number {
  if (!/^[0-9a-f]{1,8}$/i.test(value))
    throw new Error("Pokemon value must contain 1–8 hexadecimal digits.");
  return Number.parseInt(value, 16);
}
export interface PokemonLegalityReport extends PokemonPosition {
  parsed: boolean;
  valid: boolean;
  summary: LocalizedText;
  details: LocalizedText;
}
export interface MemoryEdit {
  handler: 0 | 1;
  memory: number;
  variable: number;
  intensity: number;
  feeling: number;
}
export interface MemoryQuery extends PokemonPosition {
  handler: 0 | 1;
  memory?: number;
}
export interface GeoValue {
  index: number;
  country: number;
  region: number;
}
export interface HistoryEdit {
  handler?: number;
  locations?: GeoValue[];
}
export interface HistoryCatalog {
  holder: { current: number; original: string; handling: string };
  geo: {
    entries: (GeoValue & { canEdit: boolean })[];
    countries: OriginChoice[];
    regions: { country: number; choices: OriginChoice[] }[];
  } | null;
}

export interface CareField {
  key:
    | "originalFriendship"
    | "handlingFriendship"
    | "originalAffection"
    | "handlingAffection"
    | "fullness"
    | "enjoyment"
    | "sociability";
  value: number;
  max: number;
  canEdit: boolean;
}

export interface MemoryCatalog {
  care: CareField[];
  isEgg: boolean;
  current: MemoryEdit;
  canEdit: boolean;
  nickname: string;
  trainer: string;
  memories: OriginChoice[];
  variables: OriginChoice[];
  intensities: OriginChoice[];
  feelings: OriginChoice[];
  argumentType: string;
}
export interface RibbonCatalog {
  entries: {
    key: string;
    name: LocalizedText;
    value: number;
    max: number;
    status:
      "unchecked" | "missing" | "invalid" | "possible" | "mark" | "unmarked";
  }[];
  analysisComplete: boolean;
  affixed: number | null;
  affixedChoices: { id: number; name: LocalizedText }[];
}
export interface SaveEditorResult {
  memoryCatalog?: MemoryCatalog;
  historyCatalog?: HistoryCatalog;
  ribbons?: RibbonCatalog;
  relearnSuggestion?: number[];
  originCatalog?: OriginCatalog;
  report: SaveReport;
  output?: Uint8Array;
  legality?: PokemonLegalityReport;
  pokemonFile?: { fileName: string; data: string };
}

export interface BoxEdit {
  box: number;
  name: string | null;
  wallpaper: number | null;
}

export interface StorageEdit {
  action: "move" | "swap" | "copy" | "delete";
  source: PokemonPosition;
  target: PokemonPosition | null;
}

export interface PokemonImport extends PokemonPosition {
  fileName: string;
  data: string;
}
