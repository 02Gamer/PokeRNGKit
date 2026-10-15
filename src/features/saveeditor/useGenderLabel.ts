// SPDX-License-Identifier: GPL-3.0-or-later
import { useMemo } from "react";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { formatGender, genderSymbols } from "./genderDisplay";
export function useGenderLabel() {
  const json = useSaveSettingsJson();
  return useMemo(() => {
    let symbols: readonly string[];
    try {
      symbols = genderSymbols(json);
    } catch {
      symbols = genderSymbols("");
    }
    return (value: number, label?: string) =>
      formatGender(symbols, value, label);
  }, [json]);
}
