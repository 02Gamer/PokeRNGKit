// SPDX-License-Identifier: GPL-3.0-or-later
import { createContext } from "react";
import type { AutomaticHints } from "./PokemonAutomaticHints";
export type PokemonLiveHintState = {
  status: "off" | "ready" | "pending" | "invalid" | "failed";
  hints?: AutomaticHints | null;
};
export const PokemonLiveHintsContext = createContext<PokemonLiveHintState>({
  status: "off",
});
