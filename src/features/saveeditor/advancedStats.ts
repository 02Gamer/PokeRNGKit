// SPDX-License-Identifier: GPL-3.0-or-later
import type { OriginChoice } from "./domain";

export interface BoostStats {
  values: number[];
  maximum: number;
  legalMaximum: number[] | null;
}
export interface AdvancedStatsInfo {
  awakening: BoostStats | null;
  ganbaru: BoostStats | null;
  dynamaxLevel: number | null;
  gigantamax: boolean | null;
  alpha: boolean | null;
  noble: boolean | null;
  tera: {
    original: number;
    override: number;
    effective: number;
    primary: number;
    secondary: number;
    choices: OriginChoice[];
  } | null;
}
export interface AdvancedStatsEdit {
  action:
    | "values"
    | "avRandom"
    | "avMinimum"
    | "avSuggested"
    | "avMax"
    | "avClear"
    | "avToggle"
    | "avZero"
    | "gvSuggested"
    | "gvMax"
    | "gvClear"
    | "gvToggle"
    | "gvZero"
    | "dynamaxToggle"
    | "teraToggle"
    | "teraPrimary"
    | "teraSecondary"
    | "teraReset";
  awakening?: number[];
  ganbaru?: number[];
  dynamaxLevel?: number;
  gigantamax?: boolean;
  alpha?: boolean;
  noble?: boolean;
  teraOriginal?: number;
  teraOverride?: number;
  index?: number;
}
export interface AdvancedStatsDraft {
  awakening: string[];
  ganbaru: string[];
  dynamaxLevel: string;
  gigantamax: boolean;
  alpha: boolean;
  noble: boolean;
  teraOriginal: string;
  teraOverride: string;
}
export function advancedStatsDraft(
  info: AdvancedStatsInfo,
): AdvancedStatsDraft {
  return {
    awakening: info.awakening?.values.map(String) ?? [],
    ganbaru: info.ganbaru?.values.map(String) ?? [],
    dynamaxLevel: String(info.dynamaxLevel ?? 0),
    gigantamax: info.gigantamax ?? false,
    alpha: info.alpha ?? false,
    noble: info.noble ?? false,
    teraOriginal: String(info.tera?.original ?? 0),
    teraOverride: String(info.tera?.override ?? 0),
  };
}
/** StatEditor uses three decimal mask positions, empty zero, and caps at the control maximum. */
export function boostInput(text: string, maximum: number) {
  if (!/^[\d ]{0,3}$/.test(text)) throw Error("Invalid boost statistic mask");
  return Math.min(maximum, Number(text.replaceAll(" ", "") || "0"));
}
export function advancedStatsValues(
  info: AdvancedStatsInfo,
  draft: AdvancedStatsDraft,
): AdvancedStatsEdit | undefined {
  const edit: AdvancedStatsEdit = { action: "values" };
  for (const key of ["awakening", "ganbaru"] as const) {
    const source = info[key];
    if (!source) continue;
    if (draft[key].length !== 6) throw Error("Expected six boost statistics");
    const values = draft[key].map((value, i) =>
      value === String(source.values[i])
        ? source.values[i]
        : boostInput(value, source.maximum),
    );
    if (values.some((value, i) => value !== source.values[i]))
      edit[key] = values;
  }
  if (
    info.dynamaxLevel != null &&
    draft.dynamaxLevel !== String(info.dynamaxLevel)
  ) {
    if (!/^\d+$/.test(draft.dynamaxLevel) || Number(draft.dynamaxLevel) > 10)
      throw Error("Invalid Dynamax level");
    edit.dynamaxLevel = Number(draft.dynamaxLevel);
  }
  for (const key of ["gigantamax", "alpha", "noble"] as const)
    if (info[key] != null && draft[key] !== info[key]) edit[key] = draft[key];
  if (info.tera)
    for (const [key, source] of [
      ["teraOriginal", info.tera.original],
      ["teraOverride", info.tera.override],
    ] as const) {
      if (draft[key] === String(source)) continue;
      const value = Number(draft[key]);
      if (
        !/^\d+$/.test(draft[key]) ||
        !info.tera.choices.some((c) => c.id === value)
      )
        throw Error("Invalid Tera type");
      edit[key] = value;
    }
  return Object.keys(edit).length > 1 ? edit : undefined;
}
export function validateAdvancedStatsDraft(
  info: AdvancedStatsInfo,
  draft: AdvancedStatsDraft,
) {
  const edit = advancedStatsValues(info, draft);
  // StatEditor.Valid checks AVs; GV legal maxima are hints rather than write limits.
  if (
    info.awakening &&
    (edit?.awakening ?? info.awakening.values).some(
      (v) => v > info.awakening!.maximum,
    )
  )
    throw Error("Invalid awakening value");
}

export function awakeningShortcut(modifiers: {
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}): AdvancedStatsEdit["action"] {
  if (
    modifiers.ctrlKey &&
    !modifiers.altKey &&
    !modifiers.shiftKey &&
    !modifiers.metaKey
  )
    return "avSuggested";
  if (
    modifiers.altKey &&
    !modifiers.ctrlKey &&
    !modifiers.shiftKey &&
    !modifiers.metaKey
  )
    return "avMinimum";
  return "avRandom";
}

export const advancedStatsWords = {
  zh: {
    title: "世代专属能力与标记",
    awakening: "觉醒值（AV）",
    ganbaru: "奋斗等级（GV）",
    dynamax: "极巨化等级",
    gigantamax: "超极巨",
    alpha: "头目",
    noble: "王",
    original: "原始太晶属性",
    override: "修正太晶属性",
    apply: "应用修改",
    clear: "清零",
    max: "填满",
    suggested: "推荐值",
    minimum: "最低值",
    random: "随机",
    toggle: "切换极巨化等级起止值",
    primary: "使用第一属性",
    secondary: "使用第二属性",
    teraToggle: "切换原始太晶属性",
    reset: "重置覆盖属性",
    error: "请检查数值和选项范围，当前工作副本未改变。",
    hint: "数值框支持 Ctrl+单击切换最大值／零，Alt+单击清零。使用快捷动作前请先应用表单修改。",
    legalMax: "当前个体值对应的建议上限",
    over: "高于建议上限；允许保存，合法性仍需另行检查。",
  },
  en: {
    title: "Generation-specific stats and flags",
    awakening: "Awakening Values (AVs)",
    ganbaru: "Effort Levels (GVs)",
    dynamax: "Dynamax Level",
    gigantamax: "Gigantamax",
    alpha: "Alpha",
    noble: "Noble",
    original: "Original Tera Type",
    override: "Override Tera Type",
    apply: "Apply changes",
    clear: "Zero",
    max: "Maximize",
    suggested: "Suggested values",
    minimum: "Minimum",
    random: "Randomize",
    toggle: "Toggle minimum / maximum Dynamax level",
    primary: "Use primary type",
    secondary: "Use secondary type",
    teraToggle: "Toggle original Tera type",
    reset: "Reset override",
    error: "Check the values and choices. The working copy has not changed.",
    hint: "Ctrl+click a stat to toggle its maximum / zero; Alt+click to zero it. Apply form changes before using shortcuts.",
    legalMax: "Suggested maximum for the current IV",
    over: "Above the suggested maximum; saving is allowed and legality requires a separate check.",
  },
  ja: {
    title: "世代固有の能力値とフラグ",
    awakening: "覚醒値（AV）",
    ganbaru: "がんばレベル（GV）",
    dynamax: "ダイマックスレベル",
    gigantamax: "キョダイマックス",
    alpha: "オヤブン",
    noble: "ｷﾝｸﾞ/ｸｲｰﾝ",
    original: "元のテラスタイプ",
    override: "変更テラスタイプ",
    apply: "変更を適用",
    clear: "ゼロ",
    max: "最大値",
    suggested: "推奨値",
    minimum: "最小値",
    random: "ランダム",
    toggle: "ダイマックスレベルの最小・最大を切替",
    primary: "第1タイプを使用",
    secondary: "第2タイプを使用",
    teraToggle: "元のテラスタイプを切替",
    reset: "変更タイプをリセット",
    error:
      "数値と選択肢の範囲を確認してください。作業コピーは変更されていません。",
    hint: "能力値を Ctrl+クリックすると最大・ゼロを切替、Alt+クリックでゼロにします。操作前にフォームの変更を適用してください。",
    legalMax: "現在の個体値に対応する推奨上限",
    over: "推奨上限を超えています。保存できますが、合法性の確認が別途必要です。",
  },
};
