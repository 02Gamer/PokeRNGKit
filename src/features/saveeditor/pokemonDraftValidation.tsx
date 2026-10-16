// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonDraftStep } from "./pokemonDraftPlan";
import { createContext, useContext, useLayoutEffect } from "react";
import { PokemonDraftRegistry } from "./pokemonDraftRegistry";

export const PokemonDraftContext = createContext<PokemonDraftRegistry | null>(
  null,
);

export function usePokemonDraftValidator(
  section: string,
  validate: () => unknown,
  enabled = true,
) {
  const registry = useContext(PokemonDraftContext);
  useLayoutEffect(() => {
    if (registry && enabled) return registry.register(section, validate);
  }, [registry, section, validate, enabled]);
}

export function usePokemonDraftPreparation(
  section: string,
  prepare: () => PokemonDraftStep[],
  enabled = true,
) {
  const registry = useContext(PokemonDraftContext);
  useLayoutEffect(() => {
    if (registry && enabled)
      return registry.registerPreparation(section, prepare);
  }, [registry, section, prepare, enabled]);
}

export const pokemonDraftWords = {
  zh: "请先修正宝可梦表单中的无效输入。合法性检查读取已应用的工作副本；修改后请先应用。",
  en: "Correct invalid Pokémon form inputs first. Legality checks read the applied working copy; apply your edits before checking.",
  ja: "ポケモンの入力エラーを修正してください。合法性チェックは適用済みの作業コピーを読み取るため、変更を先に適用してください。",
};

export const preparedDraftSectionWords = {
  zh: {
    care: "亲密与友好等数值",
    memoryCare: "记忆窗口的亲密与友好等数值",
    memory: "宝可梦记忆",
    training: "华丽值与极限特训",
    encounter: "相遇记录",
    formArgument: "形态附加数据",
    ribbons: "缎带与奖章",
    markings: "宝可梦标记",
    eggCycles: "孵化周期",
    gbSpecial: "第一／二世代特殊字段",
  },
  en: {
    care: "Friendship and affection values",
    memoryCare: "Friendship and affection in memories",
    memory: "Pokémon memories",
    training: "Contest stats and Hyper Training",
    encounter: "Encounter details",
    formArgument: "Form arguments",
    ribbons: "Ribbons and marks",
    markings: "Pokémon markings",
    eggCycles: "Egg cycles",
    gbSpecial: "Generation I/II special fields",
  },
  ja: {
    care: "なつき度・なかよし度など",
    memoryCare: "思い出画面のなつき度・なかよし度など",
    memory: "ポケモンの思い出",
    training: "コンディションとすごいとっくん",
    encounter: "出会いの記録",
    formArgument: "フォルムの追加データ",
    ribbons: "リボンとあかし",
    markings: "ポケモンのマーキング",
    eggCycles: "孵化サイクル",
    gbSpecial: "第一・第二世代の追加項目",
  },
};
