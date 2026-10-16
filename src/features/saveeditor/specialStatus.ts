// SPDX-License-Identifier: GPL-3.0-or-later
export interface PokemonVirusInfo {
  strain: number;
  days: number;
  infected: boolean;
  cured: boolean;
  durations: number[];
}
export interface SpecialStatusInfo {
  virus: PokemonVirusInfo | null;
  nSparkle: boolean | null;
  pokeStarFame: number | null;
}
export interface SpecialStatusEdit {
  action: "values" | "infected" | "cured";
  strain?: number;
  days?: number;
  nSparkle?: boolean;
  pokeStarFame?: number;
  value?: boolean;
}
export function specialStatusDraft(info: SpecialStatusInfo) {
  return {
    strain: String(info.virus?.strain ?? 0),
    days: String(info.virus?.days ?? 0),
    nSparkle: info.nSparkle ?? false,
    pokeStarFame: String(info.pokeStarFame ?? 0),
  };
}
export type SpecialStatusDraft = ReturnType<typeof specialStatusDraft>;
export function strainDraft(
  info: SpecialStatusInfo,
  draft: SpecialStatusDraft,
  text: string,
): SpecialStatusDraft {
  const strain = Number(text);
  const maximum = info.virus?.durations[strain];
  if (!/^\d+$/.test(text) || maximum === undefined)
    throw Error("Invalid source strain");
  return {
    ...draft,
    strain: text,
    days: String(Math.min(maximum, Number(draft.days))),
  };
}
export function specialStatusValues(
  info: SpecialStatusInfo,
  draft: SpecialStatusDraft,
): SpecialStatusEdit | undefined {
  const original = specialStatusDraft(info);
  const edit: SpecialStatusEdit = { action: "values" };
  const virusChanged =
    draft.strain !== original.strain || draft.days !== original.days;
  if (virusChanged) {
    const virus = info.virus;
    if (!virus || !/^\d+$/.test(draft.strain) || !/^\d+$/.test(draft.days))
      throw Error("Invalid virus input");
    const strain = Number(draft.strain),
      days = Number(draft.days),
      maximum = virus.durations[strain];
    if (
      strain < 0 ||
      strain > 15 ||
      maximum === undefined ||
      days < 0 ||
      days > maximum
    )
      throw Error("Virus input exceeds source duration");
    if (strain !== virus.strain) edit.strain = strain;
    if (days !== virus.days) edit.days = days;
  }
  if (draft.nSparkle !== original.nSparkle) {
    if (info.nSparkle === null) throw Error("N sparkle is unavailable");
    edit.nSparkle = draft.nSparkle;
  }
  if (draft.pokeStarFame !== original.pokeStarFame) {
    const fame = Number(draft.pokeStarFame);
    if (
      info.pokeStarFame === null ||
      !/^\d+$/.test(draft.pokeStarFame) ||
      fame < 0 ||
      fame > 255
    )
      throw Error("Invalid PokeStar fame");
    edit.pokeStarFame = fame;
  }
  return Object.keys(edit).length > 1 ? edit : undefined;
}
export const specialStatusWords = {
  zh: {
    title: "特殊状态与记录",
    virus: "宝可病毒",
    infected: "有感染记录",
    cured: "已治愈",
    strain: "宝可病毒菌株",
    days: "宝可病毒剩余天数",
    nSparkle: "N 的闪耀标记",
    pokeStarFame: "宝可好莱坞名气",
    note: "菌株决定剩余天数上限。有未应用的输入时，请先应用或还原，再切换感染／治愈状态。已有异常数值保持不变。",
    stored: "这些字段按实际存储能力显示；能保存不代表符合游戏合法性。",
    apply: "应用特殊状态",
    revert: "还原输入",
    error: "请检查菌株、对应天数和名气范围。",
  },
  en: {
    title: "Special status and records",
    virus: "Pokérus",
    infected: "Has infection history",
    cured: "Cured",
    strain: "Pokérus strain",
    days: "Pokérus days remaining",
    nSparkle: "N's sparkle",
    pokeStarFame: "Pokéstar fame",
    note: "The strain determines the duration limit. Apply or revert inputs before toggling infection or cure. Existing unusual values are preserved.",
    stored:
      "Fields follow actual storage support. A stored value is not necessarily legal for the game.",
    apply: "Apply special status",
    revert: "Revert inputs",
    error: "Check the strain, its duration limit, and fame range.",
  },
  ja: {
    title: "特殊な状態と記録",
    virus: "ポケルス",
    infected: "感染歴あり",
    cured: "治癒済み",
    strain: "ポケルスの種類",
    days: "ポケルスの残り日数",
    nSparkle: "N の輝き",
    pokeStarFame: "ポケウッドの人気",
    note: "種類によって日数の上限が変わります。感染・治癒を切り替える前に入力を適用するか元に戻してください。既存の特殊な値は保持されます。",
    stored:
      "実際に保存できる項目を表示します。保存できても、そのゲームで合法とは限りません。",
    apply: "特殊状態を適用",
    revert: "入力を元に戻す",
    error: "種類と日数の上限、人気の範囲を確認してください。",
  },
};
