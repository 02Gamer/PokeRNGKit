// SPDX-License-Identifier: GPL-3.0-or-later
import type { MoveChoice } from "./domain";
export function moveCandidates(
  choices: MoveChoice[],
  current: string,
  lang: "zh" | "en" | "ja",
  learnable?: number[],
) {
  const allowed = new Set(learnable);
  return choices
    .map((choice, id) => ({
      choice,
      id,
      learnable: choice.selectable !== false && allowed.has(id),
    }))
    .filter((v) => v.choice.selectable !== false || v.id === Number(current))
    .sort(
      (a, b) =>
        Number(b.learnable) - Number(a.learnable) ||
        (a.choice.name[lang] < b.choice.name[lang]
          ? -1
          : a.choice.name[lang] > b.choice.name[lang]
            ? 1
            : a.id - b.id),
    );
}
