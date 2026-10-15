// SPDX-License-Identifier: GPL-3.0-or-later
import {
  defaultDatabaseOptions,
  type DatabaseOptions,
} from "./databaseProtocol";
import { unifiedEntityOptions } from "./programDatabaseSettings";
const KEY = "pokerngkit-pokemon-database-options-v1";
export function loadLegacyDatabaseOptions(): DatabaseOptions {
  try {
    const value = JSON.parse(
      localStorage.getItem(KEY) ?? "null",
    ) as DatabaseOptions | null;
    if (
      value &&
      typeof value.filterUnavailableSpecies === "boolean" &&
      Number.isInteger(value.sort) &&
      value.sort >= 0 &&
      value.sort <= 2 &&
      Number.isInteger(value.gridRows) &&
      value.gridRows >= 5 &&
      value.gridRows <= 20
    )
      return {
        filterUnavailableSpecies: value.filterUnavailableSpecies,
        sort: value.sort,
        gridRows: value.gridRows,
      };
  } catch {
    /* Restricted or damaged settings use source defaults. */
  }
  return defaultDatabaseOptions();
}
export function loadDatabaseOptions(): DatabaseOptions {
  return unifiedEntityOptions() ?? loadLegacyDatabaseOptions();
}
export function saveDatabaseOptions(options: DatabaseOptions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(options));
    return true;
  } catch {
    return false;
  }
}
