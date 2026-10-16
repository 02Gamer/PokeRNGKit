// SPDX-License-Identifier: GPL-3.0-or-later
import type { OriginChoice } from "./domain";
export interface LegacyInfo {
  groundTile: number | null;
  groundTiles: OriginChoice[];
  shinyLeaf: number | null;
  walkingMood: number | null;
}
export interface LegacyEdit {
  groundTile?: number;
  leafFlags?: number;
  walkingMood?: number;
}
export function legacyDraft(info: LegacyInfo) {
  return {
    groundTile: String(info.groundTile ?? 0),
    leafFlags: (info.shinyLeaf ?? 0) & 63,
    walkingMood: String(info.walkingMood ?? 0),
  };
}
export type LegacyDraft = ReturnType<typeof legacyDraft>;
export function toggleLeaf(flags: number, index: number, checked: boolean) {
  if (!Number.isInteger(index) || index < 0 || index > 5)
    throw Error("Invalid leaf flag");
  const next = checked ? flags | (1 << index) : flags & ~(1 << index);
  return index < 5 && !checked ? next & 31 : next;
}
export function legacyValues(
  info: LegacyInfo,
  draft: LegacyDraft,
): LegacyEdit | undefined {
  const original = legacyDraft(info),
    edit: LegacyEdit = {};
  if (draft.groundTile !== original.groundTile) {
    const value = Number(draft.groundTile);
    if (
      info.groundTile === null ||
      !/^\d+$/.test(draft.groundTile) ||
      !info.groundTiles.some((c) => c.id === value)
    )
      throw Error("Invalid ground tile");
    edit.groundTile = value;
  }
  if (draft.walkingMood !== original.walkingMood) {
    const value = Number(draft.walkingMood);
    if (
      info.walkingMood === null ||
      !/^-?\d+$/.test(draft.walkingMood) ||
      value < -127 ||
      value > 127
    )
      throw Error("Invalid walking mood");
    edit.walkingMood = value;
  }
  if (draft.leafFlags !== original.leafFlags) {
    const flags = draft.leafFlags;
    if (
      info.shinyLeaf === null ||
      !Number.isInteger(flags) ||
      flags < 0 ||
      flags > 63 ||
      ((flags & 32) !== 0 &&
        (flags & 31) !== 31 &&
        ((original.leafFlags & 32) === 0 ||
          (original.leafFlags & 31 & ~flags) !== 0))
    )
      throw Error("Invalid new crown");
    edit.leafFlags = flags;
  }
  return Object.keys(edit).length ? edit : undefined;
}
export const legacyWords = {
  zh: {
    title: "地形与第四世代记录",
    groundTile: "相遇地形",
    walkingMood: "散步心情",
    leaves: "闪耀叶子",
    leaf: "叶子",
    crown: "冠冕",
    all: "集齐叶子与冠冕",
    clear: "清空叶子",
    apply: "应用记录修改",
    revert: "还原输入",
    note: "地形按原游戏与目录显示。冠冕需要五片叶子齐全；散步心情范围为 -127–127，未改的特殊原值保留。",
    raw: "原始叶子记录",
    error: "请检查地形、叶子冠冕条件与散步心情范围。",
  },
  en: {
    title: "Ground tile and Generation IV records",
    groundTile: "Encounter ground tile",
    walkingMood: "Walking mood",
    leaves: "Shiny leaves",
    leaf: "Leaf",
    crown: "Crown",
    all: "All leaves and crown",
    clear: "Clear leaves",
    apply: "Apply record edits",
    revert: "Revert inputs",
    note: "Ground tiles follow the origin game and source catalog. A new crown requires all five leaves. Walking mood ranges from -127 to 127; untouched unusual values are preserved.",
    raw: "Raw leaf record",
    error:
      "Check the ground tile, leaf crown conditions, and walking mood range.",
  },
  ja: {
    title: "地形と第四世代の記録",
    groundTile: "出会った地形",
    walkingMood: "歩行時の機嫌",
    leaves: "かがやくはっぱ",
    leaf: "はっぱ",
    crown: "王冠",
    all: "はっぱと王冠をすべて取得",
    clear: "はっぱを消去",
    apply: "記録を適用",
    revert: "入力を元に戻す",
    note: "地形は出身ゲームと一覧に従います。新しい王冠には5枚のはっぱが必要です。機嫌は -127–127 で、未変更の特殊な値は保持します。",
    raw: "元のはっぱ記録",
    error: "地形、王冠の条件、機嫌の範囲を確認してください。",
  },
};
