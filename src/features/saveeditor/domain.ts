export const MAX_SAVE_BYTES = 32 * 1024 * 1024;

export interface SaveReport {
  apiVersion: 2;
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
}

export interface LocalizedText {
  zh: string;
  en: string;
  ja: string;
}
export interface PokemonEntry {
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
