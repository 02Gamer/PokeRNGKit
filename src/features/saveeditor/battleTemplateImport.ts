// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export const MAX_BATTLE_TEMPLATE_TEXT = 1024 * 1024;
export interface BattleTemplateTarget {
  kind: "save" | "file";
  box: number;
  slot: number;
  fileName: string | null;
  inputEncrypted: boolean;
  useFileFormat: boolean;
}
export interface BattleTemplateImportRequest {
  sourceHash: string;
  target: BattleTemplateTarget;
  text: string;
}
export interface BattleTemplateImportTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: BattleTemplateTarget;
  before: LocalizedText;
  result: LocalizedText;
  parsed: LocalizedText;
  issues: LocalizedText[];
  changedBytes: number;
  beforePid: string;
  resultPid: string;
  beforeEncryptionConstant: string;
  resultEncryptionConstant: string;
}
export interface BattleTemplateImportConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: BattleTemplateTarget;
  acceptIssues: boolean;
}
export interface BattleTemplateImportActions {
  preview(
    target: BattleTemplateTarget,
    text: string,
  ): Promise<BattleTemplateImportTicket | undefined>;
  apply(confirmation: BattleTemplateImportConfirmation): Promise<boolean>;
  discard(token: string): Promise<void>;
}
export function parseBattleTemplateImport(
  value: unknown,
  sourceHash: string,
  target: BattleTemplateTarget,
): BattleTemplateImportTicket {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Missing battle template preview.");
  const v = value as BattleTemplateImportTicket;
  const hash = (s: unknown) =>
    typeof s === "string" && /^[A-F0-9]{64}$/.test(s);
  const text = (s: unknown) =>
    !!s &&
    typeof s === "object" &&
    !Array.isArray(s) &&
    ["zh", "en", "ja"].every(
      (l) => typeof (s as Record<string, unknown>)[l] === "string",
    );
  if (
    !hash(sourceHash) ||
    v.sourceHash !== sourceHash ||
    !hash(v.targetHash) ||
    typeof v.token !== "string" ||
    !/^battle-template:\d+$/.test(v.token) ||
    !v.target ||
    ![
      "kind",
      "box",
      "slot",
      "fileName",
      "inputEncrypted",
      "useFileFormat",
    ].every(
      (k) =>
        v.target[k as keyof BattleTemplateTarget] ===
        target[k as keyof BattleTemplateTarget],
    ) ||
    !text(v.before) ||
    !text(v.result) ||
    !text(v.parsed) ||
    !Array.isArray(v.issues) ||
    !v.issues.every(text) ||
    !Number.isSafeInteger(v.changedBytes) ||
    v.changedBytes < 0 ||
    v.changedBytes > 64 * 1024 * 1024 ||
    ![
      v.beforePid,
      v.resultPid,
      v.beforeEncryptionConstant,
      v.resultEncryptionConstant,
    ].every((s) => typeof s === "string" && /^[A-F0-9]{8}$/.test(s))
  )
    throw new Error("Battle template preview source or shape mismatch.");
  return v;
}
export const battleImportWords = {
  zh: {
    title: "导入对战文本",
    input: "对战文本内容",
    note: "粘贴本地文本，只读取第一组宝可梦数据。先预览，再更新选定格位或独立文件的工作副本。不会自动访问文本中的网址。",
    box: "目标箱子",
    slot: "目标格位",
    party: "队伍",
    empty: "空格位",
    preview: "预览导入",
    apply: "应用到工作副本",
    discard: "取消预览",
    before: "当前数据",
    parsed: "解析内容",
    result: "导入结果",
    issues: "解析问题",
    ack: "我已查看解析问题，仍应用可识别的内容",
    bytes: "变化字节数",
    pid: "性格值（PID）",
    ec: "加密常量",
    failed: "导入未完成，请重新预览。",
    applied: "已更新工作副本。",
    random: "PID／加密常量等随机结果已在预览时冻结，确认时不会重新生成。",
  },
  en: {
    title: "Import battle text",
    input: "Battle text",
    note: "Paste local text. Only the first Pokémon set is used. Preview before updating the selected slot or independent file working copy. URLs in the text are never fetched automatically.",
    box: "Target box",
    slot: "Target slot",
    party: "Party",
    empty: "Empty slot",
    preview: "Preview import",
    apply: "Apply to working copy",
    discard: "Discard preview",
    before: "Current data",
    parsed: "Parsed set",
    result: "Import result",
    issues: "Parse issues",
    ack: "I have reviewed the issues and want to apply the recognized data",
    bytes: "Changed bytes",
    pid: "Personality value (PID)",
    ec: "Encryption constant",
    failed: "Import did not finish. Preview again.",
    applied: "Working copy updated.",
    random:
      "Random PID/encryption constant results are frozen during preview and are not regenerated on confirmation.",
  },
  ja: {
    title: "対戦テキストを読み込む",
    input: "対戦テキスト",
    note: "ローカルのテキストを貼り付けます。最初のポケモン1匹だけを読み込みます。プレビュー後、選択したスロットまたは単体ファイルの作業コピーを更新します。テキスト内の URL には自動アクセスしません。",
    box: "対象ボックス",
    slot: "対象スロット",
    party: "手持ち",
    empty: "空きスロット",
    preview: "読み込みをプレビュー",
    apply: "作業コピーに適用",
    discard: "プレビューを破棄",
    before: "現在のデータ",
    parsed: "解析内容",
    result: "読み込み結果",
    issues: "解析の問題",
    ack: "解析の問題を確認し、認識できた内容を適用します",
    bytes: "変更バイト数",
    pid: "性格値（PID）",
    ec: "暗号化定数",
    failed: "読み込みが完了しませんでした。再度プレビューしてください。",
    applied: "作業コピーを更新しました。",
    random:
      "PID や暗号化定数などのランダムな結果はプレビュー時に固定され、確認時には再生成されません。",
  },
} as const;
