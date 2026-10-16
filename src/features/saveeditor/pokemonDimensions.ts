// SPDX-License-Identifier: GPL-3.0-or-later
export interface DimensionsInfo {
  heightScalar: number;
  weightScalar: number;
  scale: number | null;
  heightAbsolute: string | null;
  weightAbsolute: string | null;
  cp: number | null;
  heightRating: string;
  weightRating: string;
  scaleRating: string | null;
  scaleIsDetailed: boolean;
  linkedScale: boolean;
  canAuto: boolean;
}
export interface DimensionsEdit {
  action: "values" | "reset" | "randomHeight" | "randomWeight" | "randomScale";
  heightScalar?: number;
  weightScalar?: number;
  scale?: number;
  heightAbsolute?: string;
  weightAbsolute?: string;
  cp?: number;
  auto?: boolean;
}
export function dimensionsDraft(info: DimensionsInfo) {
  return {
    heightScalar: String(info.heightScalar),
    weightScalar: String(info.weightScalar),
    scale: String(info.scale ?? 0),
    heightAbsolute: info.heightAbsolute ?? "",
    weightAbsolute: info.weightAbsolute ?? "",
    cp: String(info.cp ?? 0),
  };
}
export type DimensionsDraft = ReturnType<typeof dimensionsDraft>;
export function dimensionScalarDraft(
  info: DimensionsInfo,
  draft: DimensionsDraft,
  key: "heightScalar" | "weightScalar" | "scale",
  text: string,
): DimensionsDraft {
  return {
    ...draft,
    [key]: text,
    ...(info.linkedScale && key !== "weightScalar"
      ? { heightScalar: text, scale: text }
      : {}),
  };
}
export function dimensionsValues(
  info: DimensionsInfo,
  draft: DimensionsDraft,
  auto: boolean,
): DimensionsEdit | undefined {
  const original = dimensionsDraft(info),
    edit: DimensionsEdit = { action: "values", auto: auto && info.canAuto };
  for (const key of ["heightScalar", "weightScalar", "scale"] as const) {
    if (draft[key] === original[key]) continue;
    if (
      (key === "scale" && info.scale === null) ||
      !/^\d+$/.test(draft[key]) ||
      Number(draft[key]) > 255
    )
      throw Error("Invalid size scalar");
    edit[key] = Number(draft[key]);
  }
  if (
    info.linkedScale &&
    (draft.heightScalar !== original.heightScalar ||
      draft.scale !== original.scale) &&
    draft.heightScalar !== draft.scale
  )
    throw Error("PLA height and scale must agree");
  for (const key of ["heightAbsolute", "weightAbsolute"] as const) {
    if (draft[key] === original[key]) continue;
    if (info[key] === null || draft[key].length > 32767)
      throw Error("Absolute size is unavailable or too long");
    // Core uses the source float parser, including no-write behavior for invalid text.
    edit[key] = draft[key];
  }
  if (draft.cp !== original.cp) {
    if (info.cp === null || !/^[\d ]{0,5}$/.test(draft.cp))
      throw Error("Invalid CP mask");
    const digits = draft.cp.trim();
    if (/^\d+$/.test(digits)) edit.cp = Number(digits);
  }
  return Object.keys(edit).length > 2 ? edit : undefined;
}
export function sizeControlShortcut(event: {
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}) {
  return event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;
}
export const dimensionsWords = {
  zh: {
    title: "尺寸与 CP",
    heightScalar: "身高标量",
    weightScalar: "体重标量",
    scale: "大小标量",
    heightAbsolute: "实际身高",
    weightAbsolute: "实际体重",
    cp: "CP",
    auto: "自动重算实际尺寸与 CP",
    reset: "重算实际值",
    randomHeight: "随机身高",
    randomWeight: "随机体重",
    randomScale: "随机大小",
    apply: "应用尺寸修改",
    revert: "还原输入",
    note: "标量范围 0–255。精确 Ctrl 单击标量可随机；有草稿时先应用或还原。自动模式在应用相关标量时更新实际值；开启时立即重算。",
    floatNote:
      "手动模式按 PKHeX 实数输入保存；无法解析或留空时保留原值。CP 沿五位十进制输入并限制到 65535，留空不改。",
    linked: "此格式的身高与大小联动。",
    error: "请检查尺寸、联动标量或 CP 输入。",
  },
  en: {
    title: "Size and CP",
    heightScalar: "Height scalar",
    weightScalar: "Weight scalar",
    scale: "Scale",
    heightAbsolute: "Absolute height",
    weightAbsolute: "Absolute weight",
    cp: "CP",
    auto: "Automatically recalculate size and CP",
    reset: "Recalculate actual values",
    randomHeight: "Random height",
    randomWeight: "Random weight",
    randomScale: "Random scale",
    apply: "Apply size edits",
    revert: "Revert inputs",
    note: "Scalars range from 0 to 255. Ctrl-only click randomizes a scalar; apply or revert drafts first. Auto mode updates actual values when related scalars are applied, and recalculates immediately when enabled.",
    floatNote:
      "Manual mode follows PKHeX float input. Unparsable or empty text keeps the original value. CP uses five decimal positions, caps at 65535, and remains unchanged when empty.",
    linked: "Height and scale are linked in this format.",
    error: "Check the size, linked scalars, or CP input.",
  },
  ja: {
    title: "サイズと CP",
    heightScalar: "高さの値",
    weightScalar: "重さの値",
    scale: "大きさの値",
    heightAbsolute: "実際の高さ",
    weightAbsolute: "実際の重さ",
    cp: "CP",
    auto: "実際のサイズと CP を自動再計算",
    reset: "実際の値を再計算",
    randomHeight: "高さをランダム化",
    randomWeight: "重さをランダム化",
    randomScale: "大きさをランダム化",
    apply: "サイズを適用",
    revert: "入力を元に戻す",
    note: "値の範囲は 0–255 です。Ctrl のみを押してクリックするとランダム化します。先に入力を適用するか元に戻してください。自動モードは関連する値の適用時に実際の値を更新し、有効化時にも再計算します。",
    floatNote:
      "手動モードは PKHeX と同じ実数入力を使用します。解析できない文字列や空欄は元の値を保持します。CP は10進5桁で、65535 が上限です。空欄は変更しません。",
    linked: "この形式では高さと大きさが連動します。",
    error: "サイズ、連動する値、CP の入力を確認してください。",
  },
};
