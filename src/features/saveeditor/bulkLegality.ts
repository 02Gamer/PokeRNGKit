// SPDX-License-Identifier: GPL-3.0-or-later
import { sha256 } from "@noble/hashes/sha2.js";
import type { LocalizedText } from "./domain";

export interface SaveBulkLegalityReport {
  apiVersion: 186;
  sourceHash: string;
  clean: boolean;
  analyzedCount: number;
  findingCount: number;
  report: LocalizedText;
}

export function bulkLegalitySourceHash(bytes: Uint8Array): string {
  return Array.from(sha256(bytes), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export function parseBulkLegality(
  value: unknown,
  expectedHash: string,
): SaveBulkLegalityReport {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid stored Pokémon analysis.");
  const v = value as Record<string, unknown>;
  const text = v.report as Record<string, unknown> | null;
  const count = (n: unknown) =>
    typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 2147483647;
  if (
    v.apiVersion !== 186 ||
    typeof v.sourceHash !== "string" ||
    !/^[0-9A-F]{64}$/.test(expectedHash) ||
    v.sourceHash !== expectedHash ||
    typeof v.clean !== "boolean" ||
    !count(v.analyzedCount) ||
    !count(v.findingCount) ||
    !text ||
    typeof text !== "object" ||
    Array.isArray(text) ||
    !["zh", "en", "ja"].every((lang) => typeof text[lang] === "string")
  )
    throw new Error(
      "Stored Pokémon analysis does not match the current save or API.",
    );
  return value as SaveBulkLegalityReport;
}

export const bulkLegalityWords = {
  zh: {
    title: "存储关联检查",
    run: "检查存储的宝可梦",
    copy: "复制报告",
    settings: "合法性设置",
    hint: "检查存档内宝可梦之间的重复数据、训练家与处理者关联等问题。关联检查通过不代表每只宝可梦的独立合法性检查均通过。空槽、无效种类和校验和错误的数据按 PKHeX 规则跳过。",
    clean: "关联检查通过",
    findings: "发现关联问题",
    analyzed: "检查数量",
    count: "报告条目",
    failed: "检查未完成，请重试。",
    copied: "已复制报告。",
    copyFailed: "复制失败，请检查浏览器剪贴板权限。",
  },
  en: {
    title: "Stored Pokémon checks",
    run: "Check stored Pokémon",
    copy: "Copy report",
    settings: "Legality settings",
    hint: "Check for duplicate data and trainer or handler relationships across the save. Passing these checks does not mean every Pokémon passes individual legality analysis. Empty slots, invalid species and entities with invalid checksums are skipped according to PKHeX rules.",
    clean: "Relationship checks passed",
    findings: "Relationship issues found",
    analyzed: "Analyzed",
    count: "Report entries",
    failed: "Analysis did not finish. Please retry.",
    copied: "Report copied.",
    copyFailed: "Copy failed. Check browser clipboard permissions.",
  },
  ja: {
    title: "保存ポケモンの関連チェック",
    run: "保存ポケモンをチェック",
    copy: "レポートをコピー",
    settings: "合法性設定",
    hint: "セーブ内の重複データやトレーナー・ハンドラーの関連を確認します。このチェックに合格しても、各ポケモンの個別の合法性が保証されるわけではありません。空きスロット、無効な種類、チェックサムが不正なデータは PKHeX の規則に従って除外されます。",
    clean: "関連チェックに合格",
    findings: "関連の問題を検出",
    analyzed: "確認数",
    count: "レポート項目",
    failed: "チェックが完了しませんでした。再試行してください。",
    copied: "レポートをコピーしました。",
    copyFailed:
      "コピーに失敗しました。ブラウザーのクリップボード権限を確認してください。",
  },
} as const;
