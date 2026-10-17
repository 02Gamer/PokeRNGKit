// SPDX-License-Identifier: GPL-3.0-or-later
import { SAVE_EDITOR_API_VERSION } from "./domain";
import type { AutomaticHints } from "./PokemonAutomaticHints";
export interface PokemonHintsPreview {
  apiVersion: number;
  sourceHash: string;
  requestHash: string;
  hints: AutomaticHints | null;
}
export function parsePokemonHintsPreview(
  value: PokemonHintsPreview | undefined,
  sourceHash: string,
  requestHash: string,
) {
  if (
    !value ||
    value.apiVersion !== SAVE_EDITOR_API_VERSION ||
    value.sourceHash !== sourceHash ||
    value.requestHash !== requestHash
  )
    throw Error("Stale Pokemon hints");
  const h = value.hints;
  if (
    h !== null &&
    (!h ||
      typeof h.parsed !== "boolean" ||
      typeof h.valid !== "boolean" ||
      !Array.isArray(h.moves) ||
      !Array.isArray(h.relearn) ||
      !Array.isArray(h.learnableMoves) ||
      h.moves.length !== (h.parsed ? 4 : 0) ||
      ![0, 4].includes(h.relearn.length) ||
      [...h.moves, ...h.relearn].some((v) => typeof v !== "boolean") ||
      h.learnableMoves.length > 65535 ||
      h.learnableMoves.some(
        (v) => !Number.isSafeInteger(v) || v < 1 || v > 65535,
      ) ||
      new Set(h.learnableMoves).size !== h.learnableMoves.length ||
      (!h.parsed &&
        (h.valid || h.relearn.length > 0 || h.learnableMoves.length > 0)))
  )
    throw Error("Invalid Pokemon hints");
  return structuredClone(value);
}
/** Serialize reads and discard superseded work, without restarting Wasm per keystroke. */
export class LatestHintQueue {
  private revision = 0;
  private tail: Promise<unknown> = Promise.resolve();
  invalidate() {
    this.revision++;
  }
  request<T>(read: () => Promise<T>): Promise<T | undefined> {
    const id = ++this.revision;
    const run = async () => {
      if (id !== this.revision) return;
      const result = await read();
      return id === this.revision ? result : undefined;
    };
    const result = this.tail.then(run, run);
    this.tail = result.catch(() => undefined);
    return result;
  }
}
export const moveHintWords = {
  zh: {
    learnable: "可学习招式",
    other: "其他招式",
    pending: "正在检查当前输入的招式候选…",
    invalid: "修正无效输入后将更新招式提示。",
    failed: "未能更新招式提示，修改输入后会重试。",
    appliedReport: "完整报告检查已应用的内容；修改后请先应用。",
    boundContext:
      "检查使用当前存档上下文；放入目标格位后仍需检查该格位的限制。",
  },
  en: {
    learnable: "Learnable moves",
    other: "Other moves",
    pending: "Checking move candidates for the current inputs…",
    invalid: "Correct invalid inputs to update move hints.",
    failed: "Could not update move hints. Editing the inputs will retry.",
    appliedReport:
      "Full reports check applied edits. Apply changes before requesting a full report.",
    boundContext:
      "Checks use the current save context. Check the destination slot's restrictions after placement.",
  },
  ja: {
    learnable: "習得可能な技",
    other: "その他の技",
    pending: "現在の入力の技候補を確認中…",
    invalid: "入力エラーを修正すると技のヒントを更新します。",
    failed: "技のヒントを更新できませんでした。入力を変更すると再試行します。",
    appliedReport:
      "詳細レポートは適用済みの内容を検査します。変更を先に適用してください。",
    boundContext:
      "現在のセーブのコンテキストで検査します。配置後は対象スロットの制限も確認してください。",
  },
};
