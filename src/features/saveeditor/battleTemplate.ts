// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export type BattleTemplateScope = "single" | "party" | "box" | "allBoxes";
export interface BattleTemplateQuery {
  scope: BattleTemplateScope;
  box?: number;
  slot?: number;
}
export interface BattleTemplateReport {
  apiVersion: 176;
  sourceHash: string;
  scope: BattleTemplateScope;
  box: number | null;
  slot: number | null;
  count: number;
  text: LocalizedText;
}
export function parseBattleTemplate(
  value: unknown,
  hash: string,
  query: BattleTemplateQuery,
): BattleTemplateReport {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Missing battle template.");
  const v = value as BattleTemplateReport;
  if (
    v.apiVersion !== 176 ||
    !/^[A-F0-9]{64}$/.test(hash) ||
    v.sourceHash !== hash ||
    v.scope !== query.scope ||
    v.box !== (query.box ?? null) ||
    v.slot !== (query.slot ?? null) ||
    !Number.isSafeInteger(v.count) ||
    v.count < 0 ||
    v.count > 2147483647 ||
    !v.text ||
    typeof v.text !== "object" ||
    Array.isArray(v.text) ||
    !["zh", "en", "ja"].every(
      (l) => typeof v.text[l as keyof LocalizedText] === "string",
    )
  )
    throw new Error("Battle template source, scope or API mismatch.");
  return v;
}
export const battleTemplateWords = {
  zh: {
    title: "对战文本",
    scope: "导出范围",
    single: "单只宝可梦",
    party: "队伍",
    box: "单个箱子",
    allBoxes: "全部箱子",
    pokemon: "宝可梦",
    run: "生成对战文本",
    copy: "复制文本",
    settings: "对战模板设置",
    note: "读取当前工作副本，使用 PKHeX 对战模板设置。未应用的编辑草稿不会导出。此文本不包含完整存档数据。",
    empty: "没有可导出的文本。",
    failed: "文本生成失败，请重试。",
    copied: "已复制对战文本。",
    copyFailed: "复制失败，请检查浏览器剪贴板权限。",
    count: "宝可梦数量",
  },
  en: {
    title: "Battle text",
    scope: "Export scope",
    single: "Single Pokémon",
    party: "Party",
    box: "One box",
    allBoxes: "All boxes",
    pokemon: "Pokémon",
    run: "Generate battle text",
    copy: "Copy text",
    settings: "Battle template settings",
    note: "Read the current working copy using PKHeX battle template settings. Unapplied edits are excluded. This text does not contain complete save data.",
    empty: "No text to export.",
    failed: "Text generation failed. Please retry.",
    copied: "Battle text copied.",
    copyFailed: "Copy failed. Check browser clipboard permissions.",
    count: "Pokémon count",
  },
  ja: {
    title: "対戦テキスト",
    scope: "出力範囲",
    single: "ポケモン1匹",
    party: "手持ち",
    box: "ボックス1個",
    allBoxes: "全ボックス",
    pokemon: "ポケモン",
    run: "対戦テキストを生成",
    copy: "テキストをコピー",
    settings: "対戦テンプレート設定",
    note: "PKHeX の対戦テンプレート設定で作業コピーを読み取ります。未適用の編集は出力されません。このテキストには完全なセーブデータは含まれません。",
    empty: "出力できるテキストがありません。",
    failed: "テキスト生成に失敗しました。再試行してください。",
    copied: "対戦テキストをコピーしました。",
    copyFailed:
      "コピーに失敗しました。ブラウザーのクリップボード権限を確認してください。",
    count: "ポケモン数",
  },
} as const;
