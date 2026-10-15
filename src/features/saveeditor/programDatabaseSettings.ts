// SPDX-License-Identifier: GPL-3.0-or-later
import { readSaveSettings } from "./settingsRepository";
import type { DatabaseOptions } from "./databaseProtocol";
import type { EncounterOptions } from "./encounterProtocol";
import type { MysteryGiftDatabaseOptions } from "./mysteryGiftDatabaseProtocol";
type Group = "entityDb" | "encounterDb" | "mysteryDb";
function stored(group: Group): Record<string, unknown> | undefined {
  let snapshot;
  try {
    snapshot = readSaveSettings();
  } catch {
    // Keep the existing legacy/default read fallback for restricted storage.
    // The request client independently refuses invalid complete settings.
    return;
  }
  if (!snapshot?.databaseSettingsUnified) return;
  const value = JSON.parse(snapshot.json)[group];
  if (!value || typeof value !== "object")
    throw new Error("Invalid database settings.");
  return value;
}
function rows(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 5 ||
    value > 20
  )
    throw new Error("Invalid database row count.");
  return value;
}
function flag(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Invalid database flag.");
  return value;
}
export function unifiedEntityOptions(): DatabaseOptions | undefined {
  const value = stored("entityDb");
  if (!value) return;
  if (
    value.initialSortMode !== 0 &&
    value.initialSortMode !== 1 &&
    value.initialSortMode !== 2
  )
    throw new Error("Invalid database sort.");
  return {
    filterUnavailableSpecies: flag(value.filterUnavailableSpecies),
    sort: value.initialSortMode,
    gridRows: rows(value.resultsGridRowCount),
  };
}
export function unifiedEncounterOptions(): EncounterOptions | undefined {
  const value = stored("encounterDb");
  if (!value) return;
  return {
    returnNoneIfEmptySearch: flag(value.returnNoneIfEmptySearch),
    filterUnavailableSpecies: flag(value.filterUnavailableSpecies),
    useTabsAsCriteria: flag(value.useTabsAsCriteria),
    useTabsAsCriteriaAnySpecies: flag(value.useTabsAsCriteriaAnySpecies),
    gridRows: rows(value.resultsGridRowCount),
  };
}
export function unifiedMysteryOptions():
  MysteryGiftDatabaseOptions | undefined {
  const value = stored("mysteryDb");
  if (!value) return;
  return {
    filterUnavailableSpecies: flag(value.filterUnavailableSpecies),
    gridRows: rows(value.resultsGridRowCount),
  };
}
// Reading legacy values only hydrates a draft. The caller validates the complete
// model in Core and commits the migration marker atomically with the JSON.
export function hydrateDatabaseSettings(
  json: string,
  legacy: {
    entity: DatabaseOptions;
    encounter: EncounterOptions;
    mystery: MysteryGiftDatabaseOptions;
  },
) {
  const root = JSON.parse(json);
  Object.assign(root.entityDb, {
    initialSortMode: legacy.entity.sort,
    filterUnavailableSpecies: legacy.entity.filterUnavailableSpecies,
    resultsGridRowCount: legacy.entity.gridRows,
  });
  const { gridRows, ...encounter } = legacy.encounter;
  Object.assign(root.encounterDb, encounter, { resultsGridRowCount: gridRows });
  Object.assign(root.mysteryDb, {
    filterUnavailableSpecies: legacy.mystery.filterUnavailableSpecies,
    resultsGridRowCount: legacy.mystery.gridRows,
  });
  return JSON.stringify(root);
}
