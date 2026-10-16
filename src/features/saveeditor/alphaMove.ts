// SPDX-License-Identifier: GPL-3.0-or-later
import type { MoveChoice, PokemonPosition, PokemonRawEdit } from "./domain";

export const alphaMoveWords = {
  zh: {
    title: "头目招式精通",
    note: "头目初始精通的招式。此处的修改不改变当前招式、PP 或招式商店的购买与精通记录。",
    apply: "应用招式",
    error: "请选择当前格式招式目录中的招式。",
  },
  en: {
    title: "Alpha Mastered",
    note: "The alpha's initial mastered move. Editing it leaves current moves, PP and Move Shop purchase and mastery records unchanged.",
    apply: "Apply move",
    error: "Choose a move from this format's move catalog.",
  },
  ja: {
    title: "オヤブンの皆伝技",
    note: "オヤブンの初期皆伝技です。現在の技、PP、訓練場の購入・皆伝記録は変更しません。",
    apply: "技を適用",
    error: "この形式の技一覧から選択してください。",
  },
};

export function alphaMoveEdit(
  position: PokemonPosition,
  move: number,
  choices: MoveChoice[],
): PokemonRawEdit {
  if (!isAlphaMoveSelectable(move, choices))
    throw Error("Alpha initial mastery move is outside the format catalog.");
  return { ...position, action: "alphaMove", alphaMove: move };
}

export function isAlphaMoveSelectable(move: number, choices: MoveChoice[]) {
  return (
    Number.isInteger(move) &&
    move >= 0 &&
    choices[move] !== undefined &&
    choices[move].alphaSelectable !== false
  );
}
