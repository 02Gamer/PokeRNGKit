// SPDX-License-Identifier: GPL-3.0-or-later
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

export const pokemonDraftWords = {
  zh: "请先修正宝可梦表单中的无效输入。合法性检查读取已应用的工作副本；修改后请先应用。",
  en: "Correct invalid Pokémon form inputs first. Legality checks read the applied working copy; apply your edits before checking.",
  ja: "ポケモンの入力エラーを修正してください。合法性チェックは適用済みの作業コピーを読み取るため、変更を先に適用してください。",
};
