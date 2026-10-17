// SPDX-License-Identifier: GPL-3.0-or-later
export interface AutomaticHints {
  parsed: boolean;
  valid: boolean;
  moves: boolean[];
  relearn: boolean[];
}
const words = {
  zh: {
    title: "当前缓冲检查",
    valid: "PKHeX 检查通过",
    invalid: "PKHeX 检查发现问题",
    unknown: "分析未完成",
    moves: "需检查的招式格位",
    relearn: "需检查的回忆招式格位",
    note: "依据已应用的编辑内容；未应用的输入尚未计入。",
  },
  en: {
    title: "Current buffer checks",
    valid: "PKHeX checks passed",
    invalid: "PKHeX found issues",
    unknown: "Analysis incomplete",
    moves: "Move slots to review",
    relearn: "Relearn slots to review",
    note: "Checks use applied edits. Pending inputs are not included yet.",
  },
  ja: {
    title: "現在の編集バッファーの検査",
    valid: "PKHeX の検査を通過",
    invalid: "PKHeX が問題を検出",
    unknown: "解析未完了",
    moves: "確認が必要な技スロット",
    relearn: "確認が必要な思い出し技スロット",
    note: "適用済みの編集内容を検査します。未適用の入力は含まれません。",
  },
};
export function PokemonAutomaticHints({
  info,
  lang,
}: {
  info?: AutomaticHints | null;
  lang: "zh" | "en" | "ja";
}) {
  if (!info) return null;
  const w = words[lang];
  const invalid = (values: boolean[]) =>
    values.flatMap((valid, index) => (valid ? [] : [index + 1])).join(", ");
  const moves = info.parsed ? invalid(info.moves) : "",
    relearn = info.parsed ? invalid(info.relearn) : "";
  return (
    <section aria-label={w.title} className="save-record-editor">
      <p role="status">
        {info.parsed ? (info.valid ? w.valid : w.invalid) : w.unknown}
      </p>
      {moves && (
        <p className="save-editor-note">
          {w.moves}: {moves}
        </p>
      )}
      {relearn && (
        <p className="save-editor-note">
          {w.relearn}: {relearn}
        </p>
      )}
      <p className="save-editor-note">{w.note}</p>
    </section>
  );
}
