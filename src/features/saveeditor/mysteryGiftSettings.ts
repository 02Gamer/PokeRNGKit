// SPDX-License-Identifier: GPL-3.0-or-later
import type { MysteryGiftDatabaseOptions } from "./mysteryGiftDatabaseProtocol";
import { unifiedMysteryOptions } from "./programDatabaseSettings";
const key = "pokerngkit-mystery-gift-settings";
export function loadLegacyMysterySettings(): MysteryGiftDatabaseOptions {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      value &&
      typeof value.filterUnavailableSpecies === "boolean" &&
      Number.isInteger(value.gridRows) &&
      value.gridRows >= 5 &&
      value.gridRows <= 20
    )
      return {
        filterUnavailableSpecies: value.filterUnavailableSpecies,
        gridRows: value.gridRows,
      };
  } catch {
    /* Preserve the source defaults when legacy storage is unavailable. */
  }
  return { filterUnavailableSpecies: true, gridRows: 9 };
}
export const loadMysterySettings = () =>
  unifiedMysteryOptions() ?? loadLegacyMysterySettings();
