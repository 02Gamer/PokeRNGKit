// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText, PokemonEntry } from "./domain";
import { SAVE_EDITOR_API_VERSION } from "./domain";
import type { PokemonDraftCapture } from "./pokemonDraftPlan";
import { editorSnapshot, type PokemonEditorFile } from "./pokemonSet";
export interface ExtraSlotKey {
  type: number;
  slot: number;
  partyFormat: boolean;
}
export interface ExtraSlotSource {
  extra: ExtraSlotKey;
}
export interface ExtraSlotEntry {
  key: ExtraSlotKey;
  name: LocalizedText;
  canWrite: boolean;
  hideLegality: boolean;
  canView: boolean;
  pokemon: PokemonEntry;
}
export interface ExtraSlotCatalog {
  apiVersion: number;
  sourceHash: string;
  haX: boolean;
  slots: ExtraSlotEntry[];
}
export interface ExtraSlotWriteRequest {
  sourceHash: string;
  target: ExtraSlotKey;
  editorFile: PokemonEditorFile;
  capture: PokemonDraftCapture;
}
export interface ExtraSlotConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  allowCompatibility: boolean;
}
export interface ExtraSlotPreview {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: ExtraSlotKey;
  name: LocalizedText;
  pokemon: PokemonEntry;
  editorFile: PokemonEditorFile;
  compatibility: LocalizedText[];
  clear: boolean;
  overwrite: boolean;
  changedBytes: number;
}
export const extraSlotId = (key: ExtraSlotKey) =>
  JSON.stringify([key.type, key.slot, key.partyFormat]);
export function checkExtraCatalog(value: ExtraSlotCatalog, hash: string) {
  if (
    !value ||
    value.apiVersion !== SAVE_EDITOR_API_VERSION ||
    value.sourceHash !== hash ||
    typeof value.haX !== "boolean" ||
    !Array.isArray(value.slots) ||
    value.slots.some(
      (slot) =>
        !validKey(slot.key) ||
        !validText(slot.name) ||
        !slot.pokemon ||
        !validText(slot.pokemon.speciesName) ||
        typeof slot.canWrite !== "boolean" ||
        typeof slot.canView !== "boolean" ||
        typeof slot.hideLegality !== "boolean",
    ) ||
    new Set(value.slots.map((slot) => extraSlotId(slot.key))).size !==
      value.slots.length
  )
    throw Error("Invalid extra slot catalog");
  return structuredClone(value);
}
function validText(text: LocalizedText) {
  return (
    text && [text.zh, text.en, text.ja].every((v) => typeof v === "string")
  );
}
function validKey(key: ExtraSlotKey) {
  return (
    key &&
    Number.isSafeInteger(key.type) &&
    key.type >= 0 &&
    key.type <= 255 &&
    Number.isSafeInteger(key.slot) &&
    key.slot >= 0 &&
    key.slot < 128 &&
    typeof key.partyFormat === "boolean"
  );
}
export function checkExtraPreview(
  value: ExtraSlotPreview,
  hash: string,
  target: ExtraSlotKey,
) {
  if (
    !value ||
    typeof value.token !== "string" ||
    !/^extra:\d+$/.test(value.token) ||
    value.sourceHash !== hash ||
    !/^[A-Fa-f0-9]{64}$/.test(value.targetHash) ||
    !validKey(value.target) ||
    extraSlotId(value.target) !== extraSlotId(target) ||
    !validText(value.name) ||
    !value.pokemon ||
    !Number.isSafeInteger(value.pokemon.species) ||
    value.pokemon.species < 0 ||
    (value.pokemon.species === 0) !== value.clear ||
    typeof value.clear !== "boolean" ||
    typeof value.overwrite !== "boolean" ||
    !Number.isSafeInteger(value.changedBytes) ||
    value.changedBytes < 0 ||
    !Array.isArray(value.compatibility) ||
    !value.compatibility.every(validText)
  )
    throw Error("Invalid extra slot preview");
  editorSnapshot(value.editorFile);
  return structuredClone(value);
}
export const extraSlotWords = {
  zh: {
    title: "额外格位",
    empty: "此存档没有可显示的额外格位。",
    readonly: "只读",
    writable: "可写入",
    view: "查看",
    blank: "空记录",
    choose: "选择额外格位以查看宝可梦。",
    write: "写入此额外格位",
    clear: "清空此额外格位",
    confirm: "确认写入",
    cancel: "取消",
    invalid: "无法读取或写入此额外格位。",
    note: "编辑先保留在缓冲中。确认写入后才会修改存档工作副本；只读格位可查看和导出。",
    overwrite: "确认覆盖当前记录",
    compatibility: "确认上述兼容性提示",
    hiddenLegality: "此记录按游戏设计隐藏自动合法性标记。",
  },
  en: {
    title: "Extra slots",
    empty: "This save has no visible extra slots.",
    readonly: "Read only",
    writable: "Writable",
    view: "View",
    blank: "Empty record",
    choose: "Select an extra slot to view its Pokémon.",
    write: "Write to this extra slot",
    clear: "Clear this extra slot",
    confirm: "Confirm write",
    cancel: "Cancel",
    invalid: "Could not read or write this extra slot.",
    note: "Edits stay in the buffer until you confirm writing to the save working copy. Read-only slots can be viewed and exported.",
    overwrite: "Confirm replacing the current record",
    compatibility: "Acknowledge the compatibility messages",
    hiddenLegality: "This game record hides automatic legality indicators.",
  },
  ja: {
    title: "追加スロット",
    empty: "表示できる追加スロットはありません。",
    readonly: "読み取り専用",
    writable: "書き込み可能",
    view: "表示",
    blank: "空の記録",
    choose: "追加スロットを選択してポケモンを表示します。",
    write: "この追加スロットに書き込む",
    clear: "この追加スロットを空にする",
    confirm: "書き込みを確認",
    cancel: "キャンセル",
    invalid: "追加スロットの読み取りまたは書き込みに失敗しました。",
    note: "変更は編集バッファーに保持されます。確認後にセーブの作業コピーへ書き込みます。読み取り専用スロットは表示・書き出しができます。",
    overwrite: "現在の記録の上書きを確認する",
    compatibility: "互換性の注意事項を確認する",
    hiddenLegality: "このゲームの記録では自動合法性マークが非表示です。",
  },
};
