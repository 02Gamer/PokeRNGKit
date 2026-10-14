// SPDX-License-Identifier: GPL-3.0-or-later
import type { SaveReport, LocalizedText } from "./domain";
type TrainerGameOptionState = NonNullable<SaveReport["trainer"]["gameOptions"]>;
type TrainerBadgeState = NonNullable<SaveReport["trainer"]["badges"]>;

export interface SimpleTrainerExtra {
  coins: number | null;
  friendship: number | null;
  beachScore: number | null;
  options: TrainerGameOptionState | null;
  badges: TrainerBadgeState | null;
  hours: number;
  minutes: number;
  seconds: number;
}
export interface SimpleTrainerExtraEdit {
  coins?: number;
  friendship?: number;
  beachScore?: number;
  options?: Partial<TrainerGameOptionState>;
  badges?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}
export interface SimpleTrainerCatalog {
  canEdit: boolean;
  sourceHash: string;
  format: string;
  generation: number;
  maxCoins: number;
  extra: SimpleTrainerExtra;
  fields: { key: string; name: LocalizedText; value: string }[];
}
export type SimpleTrainerRequest =
  | { action: "patch"; sourceHash: string; extra: SimpleTrainerExtraEdit }
  | { action: "resave"; sourceHash: string };
export interface SimpleTrainerConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface SimpleTrainerPreview extends SimpleTrainerConfirmation {
  before: SimpleTrainerCatalog;
  result: SimpleTrainerCatalog;
  changedOffsets: number[];
}
export function supportsSimpleTrainer(format: string) {
  return [
    "SAV1",
    "SAV2",
    "SAV3RS",
    "SAV3E",
    "SAV3FRLG",
    "SAV3Colosseum",
    "SAV3XD",
    "SAV4DP",
    "SAV4Pt",
    "SAV4HGSS",
    "SAV5BW",
    "SAV5B2W2",
  ].includes(format);
}
export type SimpleTrainerDraft = Record<string, string>;
export function simpleTrainerDraft(
  state: SimpleTrainerExtra,
): SimpleTrainerDraft {
  const result: SimpleTrainerDraft = {};
  for (const key of [
    "coins",
    "friendship",
    "beachScore",
    "hours",
    "minutes",
    "seconds",
  ] as const)
    if (state[key] !== null) result[key] = String(state[key]);
  if (state.badges) result.badges = String(state.badges.value);
  if (state.options)
    for (const [key, value] of Object.entries(state.options))
      result[key] = String(value);
  return result;
}
export function validateSimpleTrainerExtra(
  draft: SimpleTrainerDraft,
  state: SimpleTrainerExtra,
  maxCoins: number,
  generation: number,
): SimpleTrainerExtraEdit {
  const original = simpleTrainerDraft(state);
  const result: SimpleTrainerExtraEdit = {};
  const limits: Record<string, number> = {
    coins: maxCoins,
    friendship: 255,
    beachScore: 9999,
    hours: 65535,
    minutes: 99,
    seconds: 99,
    badges: state.badges ? 2 ** state.badges.count - 1 : 0,
    textSpeed: 7,
    battleStyle: 1,
    sound: generation === 1 ? 3 : 1,
    battleEffects: 1,
  };
  for (const [key, text] of Object.entries(draft)) {
    if (text === original[key]) continue;
    if (!Object.hasOwn(original, key) || !/^\d+$/.test(text))
      throw Error("Invalid simple trainer value.");
    const value = Number(text);
    if (!Number.isSafeInteger(value) || value < 0 || value > limits[key])
      throw Error("Invalid simple trainer value.");
    if (
      key === "textSpeed" ||
      key === "battleStyle" ||
      key === "sound" ||
      key === "battleEffects"
    ) {
      (result.options ??= {})[key] = value;
    } else {
      result[key as Exclude<keyof SimpleTrainerExtraEdit, "options">] = value;
    }
  }
  return result;
}
export const simpleTrainerWords = {
  zh: {
    gbScope:
      "此格式支持基础训练家、图鉴及已接入的存档工具。宝可梦编辑以对应工具的支持范围为准。",
    maxCoins: "代币设为最大值",
    title: "基础训练家工具",
    coins: "代币",
    friendship: "皮卡丘亲密度",
    beachScore: "皮卡丘海滩分数",
    read: "读取训练家数据",
    preview: "预览修改",
    resave: "按原版窗口重新保存",
    apply: "应用到工作副本",
    cancel: "取消预览",
    resaveNote:
      "重新保存会按原版窗口处理全部字段，包括未编辑的时间、设置和日期。请检查预览后确认。",
    timeNote:
      "分钟和秒保存时取余 60；第一世代与 GameCube 的时间还受存档格式影响。",
    invalid: "无法处理这些训练家字段，请检查范围和当前存档。",
    changes: "修改的字节数",
    gbSpeed: ["0 · 即时", "1 · 快", "2", "3 · 正常", "4", "5 · 慢", "6", "7"],
    gbSound: ["单声道", "立体声", "左声道", "右声道"],
  },
  en: {
    gbScope:
      "This format supports basic trainer, Pokédex and implemented save tools. Pokémon editing depends on the selected tool's supported scope.",
    maxCoins: "Set coins to maximum",
    title: "Basic trainer tools",
    coins: "Coins",
    friendship: "Pikachu friendship",
    beachScore: "Pikachu beach score",
    read: "Read trainer data",
    preview: "Preview changes",
    resave: "Resave with original window rules",
    apply: "Apply to working copy",
    cancel: "Cancel preview",
    resaveNote:
      "Resaving processes all fields using the original window rules, including unchanged time, options and dates. Review the preview before confirming.",
    timeNote:
      "Minutes and seconds are saved modulo 60. Generation I and GameCube time also depends on the save format.",
    invalid:
      "These trainer fields could not be processed. Check their limits and the current save.",
    changes: "Changed bytes",
    gbSpeed: [
      "0 · Instant",
      "1 · Fast",
      "2",
      "3 · Normal",
      "4",
      "5 · Slow",
      "6",
      "7",
    ],
    gbSound: ["Mono", "Stereo", "Left", "Right"],
  },
  ja: {
    gbScope:
      "この形式は基本トレーナー、図鑑と実装済みセーブツールに対応します。ポケモン編集は選択したツールの対応範囲によります。",
    maxCoins: "コインを最大にする",
    title: "基本トレーナーツール",
    coins: "コイン",
    friendship: "ピカチュウのなつき度",
    beachScore: "ピカチュウのサーフィン得点",
    read: "トレーナーデータを読み込む",
    preview: "変更をプレビュー",
    resave: "元の画面の規則で再保存",
    apply: "作業コピーに適用",
    cancel: "プレビューを取り消す",
    resaveNote:
      "再保存では未変更の時間・設定・日付も元の画面の規則で処理します。プレビューを確認してから適用してください。",
    timeNote:
      "分と秒は 60 で割った余りとして保存します。第一世代と GameCube の時間は保存形式の制約も受けます。",
    invalid:
      "トレーナー項目を処理できません。範囲と現在のセーブデータを確認してください。",
    changes: "変更バイト数",
    gbSpeed: [
      "0 · 即時",
      "1 · 速い",
      "2",
      "3 · 普通",
      "4",
      "5 · 遅い",
      "6",
      "7",
    ],
    gbSound: ["モノラル", "ステレオ", "左", "右"],
  },
} as const;
