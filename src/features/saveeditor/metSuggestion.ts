// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
import type { PokemonDraftCapture } from "./pokemonDraftPlan";
export interface MetSuggestionState {
  level: number;
  metLevel: number;
  location: number;
  locationName: LocalizedText;
  groundTile: number | null;
  timeOfDay: number | null;
}
export interface MetSuggestionInput {
  sourceHash: string;
  capture: PokemonDraftCapture;
}
export interface MetSuggestionConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export interface MetSuggestionPreview {
  sourceHash: string;
  available: boolean;
  token?: string | null;
  targetHash?: string | null;
  before?: MetSuggestionState | null;
  after?: MetSuggestionState | null;
  hatchMemory: boolean;
  changedBytes: number;
}
const integer = (value: number, max: number) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max;
function state(value: MetSuggestionState | null | undefined) {
  return (
    !!value &&
    integer(value.level, 255) &&
    integer(value.metLevel, 255) &&
    integer(value.location, 65535) &&
    !!value.locationName &&
    [value.locationName.zh, value.locationName.en, value.locationName.ja].every(
      (v) => typeof v === "string",
    ) &&
    (value.groundTile === null || integer(value.groundTile, 255)) &&
    (value.timeOfDay === null || integer(value.timeOfDay, 3))
  );
}
export function parseMetSuggestion(
  value: MetSuggestionPreview | undefined,
  hash: string,
) {
  if (
    !value ||
    value.sourceHash !== hash ||
    typeof value.available !== "boolean" ||
    typeof value.hatchMemory !== "boolean" ||
    !integer(value.changedBytes, 2 * 1024 * 1024)
  )
    throw Error("Invalid met suggestion preview");
  if (value.available) {
    if (
      !/^met:\d+$/.test(value.token ?? "") ||
      !/^[A-F0-9]{64}$/.test(value.targetHash ?? "") ||
      !state(value.before) ||
      !state(value.after)
    )
      throw Error("Incomplete met suggestion preview");
  } else if (
    value.token != null ||
    value.targetHash != null ||
    value.before != null ||
    value.after != null ||
    value.changedBytes !== 0 ||
    value.hatchMemory
  )
    throw Error("Unavailable met suggestion has a writable result");
  return structuredClone(value);
}
export const metSuggestionWords = {
  zh: {
    title: "相遇地点建议",
    preview: "预览相遇建议",
    confirm: "采用建议并应用当前草稿",
    cancel: "取消",
    none: "当前没有可应用的相遇建议。",
    failed: "无法准备或应用相遇建议，请检查当前输入。",
    note: "包含当前有效草稿。确认后更新编辑缓冲，可撤销；存档仍需另行放入和导出。",
    location: "相遇地点",
    metLevel: "相遇等级",
    level: "当前等级",
    ground: "地形",
    time: "相遇时段",
    memory: "同时同步第六世代孵化记忆。",
  },
  en: {
    title: "Met-location suggestion",
    preview: "Preview met suggestion",
    confirm: "Use suggestion and apply current drafts",
    cancel: "Cancel",
    none: "No applicable met suggestion is available.",
    failed:
      "Could not prepare or apply the suggestion. Check the current inputs.",
    note: "Includes valid current drafts. Confirmation updates the editor buffer and can be undone; writing and exporting the save are separate steps.",
    location: "Met location",
    metLevel: "Met level",
    level: "Current level",
    ground: "Ground tile",
    time: "Encounter time",
    memory: "Also updates Generation VI hatch memories.",
  },
  ja: {
    title: "出会った場所の提案",
    preview: "提案をプレビュー",
    confirm: "提案と現在の入力を適用",
    cancel: "キャンセル",
    none: "適用できる出会い情報の提案はありません。",
    failed: "提案を準備・適用できませんでした。現在の入力を確認してください。",
    note: "現在の有効な入力を含みます。確認後に編集バッファーを更新し、元に戻せます。セーブへの配置と書き出しは別途必要です。",
    location: "出会った場所",
    metLevel: "出会ったレベル",
    level: "現在のレベル",
    ground: "地形",
    time: "出会った時間帯",
    memory: "第六世代の孵化の記憶も更新します。",
  },
};
