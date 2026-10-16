// SPDX-License-Identifier: GPL-3.0-or-later
import type { OriginChoice } from "./domain";
export interface PokemonVitalsInfo {
  experience: {
    value: number;
    level: number;
    maximum: number;
    start: number;
    end: number;
    progress: number;
    showBar: boolean;
  };
  hiddenPower: {
    type: number;
    power: number | null;
    types: OriginChoice[];
    maximize: boolean;
  } | null;
  status: {
    value: number;
    canEdit: boolean;
    present: boolean;
    fainted: boolean;
    show: boolean;
    choices: OriginChoice[];
    sleepTurns: number;
  };
  showGender: boolean;
  partyStats?: PokemonPartyStatsInfo | null;
}
export interface PokemonPartyStatsInfo {
  values: number[];
  computed: number[];
  writable: boolean[];
  maximum: number;
}
export interface PokemonVitalsEdit {
  action:
    | "experience"
    | "level"
    | "hiddenPower"
    | "partyStats"
    | "resetPartyStats"
    | "status"
    | "bar"
    | "wheel"
    | "edgeLow"
    | "edgeHigh"
    | "overflow"
    | "underflow"
    | "downlevel";
  experience?: number;
  level?: number;
  type?: number;
  status?: number;
  sleepTurns?: number;
  position?: number;
  width?: number;
  direction?: number;
  alt?: boolean;
  shift?: boolean;
  control?: boolean;
  stats?: number[];
}
// Five decimal source mask, blank -> 0, clamped to UInt16 by StatEditor.
export function partyStatInput(value: string) {
  if (!/^[0-9 ]{0,5}$/.test(value)) throw Error("range");
  return Math.min(65535, Number(value.replaceAll(" ", "") || "0"));
}
export const partyStatsWords = {
  zh: {
    title: "队伍能力值",
    special: "特殊",
    manual: "手动能力值（HaX）",
    hint: "HP 同时写入当前值和上限；普通箱位可能不保存这些数值。放入时以预览结果为准。",
    stats: ["HP", "攻击", "防御", "速度", "特攻", "特防"],
  },
  en: {
    title: "Party stats",
    special: "Special",
    manual: "Manual stats (HaX)",
    hint: "HP sets both current and maximum HP. Ordinary box slots may not retain these values; review the Set preview.",
    stats: ["HP", "Attack", "Defense", "Speed", "Sp. Atk", "Sp. Def"],
  },
  ja: {
    title: "手持ちの能力値",
    special: "とくしゅ",
    manual: "能力値を手動入力（HaX）",
    hint: "HPは現在値と最大値の両方に設定されます。通常のボックスは能力値を保存しない場合があります。配置のプレビューを確認してください。",
    stats: ["HP", "こうげき", "ぼうぎょ", "すばやさ", "とくこう", "とくぼう"],
  },
} as const;
export function statusChoice(value: number, generation: number) {
  const low = value & 255;
  if (generation > 4) return [0, 64, 1, 32, 16, 8][low] ?? low + 256;
  if (low <= 7) return low === 0 ? 0 : 1;
  if (low & 64) return 64;
  if (low & 16) return 16;
  if (low & 128) return generation >= 3 ? 128 : 8;
  if (low & 8) return 8;
  if (low & 32) return 32;
  return low + 256;
}
export function statusIconChoice(value: number, generation: number) {
  const low = value & 255;
  if (generation > 4) return [0, 64, 1, 32, 16, 8][low] ?? 0;
  if (low < 8) return low === 0 ? 0 : 1;
  for (const flag of [128, 8, 16, 64, 32]) if (low & flag) return flag;
  return 0;
}
export function vitalInteger(value: string, max: number, min = 0) {
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw Error("range");
  return Number(value);
}
export function experienceInput(value: string) {
  if (!/^[0-9 ]{0,7}$/.test(value)) throw Error("range");
  return Number(value.replaceAll(" ", "") || "0");
}
export function levelInput(value: string) {
  if (!/^[0-9 ]{0,3}$/.test(value)) throw Error("range");
  return Math.max(1, Math.min(100, Number(value.replaceAll(" ", "") || "0")));
}
export const vitalsWords = {
  zh: {
    title: "经验、状态与觉醒力量",
    apply: "应用",
    level: "等级",
    experience: "经验值",
    progress: "当前等级经验进度",
    edgeLow: "本级起点",
    edgeHigh: "升级前",
    overflow: "升一级",
    underflow: "前一级末尾",
    downlevel: "降一级",
    status: "异常状态",
    sleep: "睡眠回合",
    fainted: "濒死",
    notStored: "此记录不保存异常状态。",
    noParty: "此记录没有已保存的队伍状态。",
    hiddenPower: "觉醒力量",
    power: "威力",
    max: "选择属性时最大化个体值",
    close: "选择属性时尽量保留原个体值",
    error: "数值超出范围或更新失败。",
    barHint:
      "拖动调整本级经验；滚轮或方向键可跨级。Alt 返回本级起点，再次操作降级；Shift 调整至升级前，再次操作升级；Ctrl 配合可直接跨级。",
  },
  en: {
    title: "Experience, status and Hidden Power",
    apply: "Apply",
    level: "Level",
    experience: "Experience",
    progress: "Experience within this level",
    edgeLow: "Level start",
    edgeHigh: "Before level up",
    overflow: "Level up",
    underflow: "Previous level end",
    downlevel: "Level down",
    status: "Status condition",
    sleep: "Sleep turns",
    fainted: "Fainted",
    notStored: "This record does not store status conditions.",
    noParty: "This record has no saved party status.",
    hiddenPower: "Hidden Power",
    power: "Power",
    max: "Maximize IVs when changing type",
    close: "Keep IVs close to their current values",
    error: "Value is outside its range or the update failed.",
    barHint:
      "Drag within the level; scroll or use arrow keys across levels. Alt moves to the level start, then below it; Shift moves to the level end, then above it. Add Ctrl to cross immediately.",
  },
  ja: {
    title: "経験値・状態・めざめるパワー",
    apply: "適用",
    level: "レベル",
    experience: "経験値",
    progress: "現在のレベルの経験値",
    edgeLow: "レベルの始点",
    edgeHigh: "次のレベル直前",
    overflow: "1レベル上げる",
    underflow: "前のレベル末尾",
    downlevel: "1レベル下げる",
    status: "状態異常",
    sleep: "ねむりターン",
    fainted: "ひんし",
    notStored: "この記録には状態異常が保存されません。",
    noParty: "保存された手持ちの状態はありません。",
    hiddenPower: "めざめるパワー",
    power: "威力",
    max: "タイプ変更時に個体値を最大化",
    close: "元の個体値をなるべく維持",
    error: "値が範囲外か、更新に失敗しました。",
    barHint:
      "ドラッグで現在のレベル内を調整。スクロールや矢印キーでレベルを移動できます。Altで始点、その後前のレベルへ、Shiftで終点、その後次のレベルへ。Ctrlを併用すると直接移動します。",
  },
} as const;
