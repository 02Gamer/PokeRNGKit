// SPDX-License-Identifier: GPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hydrateDatabaseSettings,
  unifiedEntityOptions,
  unifiedEncounterOptions,
  unifiedMysteryOptions,
} from "./programDatabaseSettings";
import { readSaveSettings, replaceSaveSettings } from "./settingsRepository";
import { loadDatabaseOptions } from "./databaseSettings";
import { loadEncounterSettings } from "./encounterSettings";
import { loadMysterySettings } from "./mysteryGiftSettings";
const base = () => ({
  privacy: { hideSecretDetails: true },
  entityDb: {
    searchBackups: false,
    searchExtraSaves: true,
    searchExtraSavesDeep: false,
    initialSortMode: 0,
    filterUnavailableSpecies: true,
    resultsGridRowCount: 9,
  },
  encounterDb: {
    returnNoneIfEmptySearch: true,
    filterUnavailableSpecies: true,
    useTabsAsCriteria: true,
    useTabsAsCriteriaAnySpecies: true,
    resultsGridRowCount: 9,
  },
  mysteryDb: { filterUnavailableSpecies: true, resultsGridRowCount: 9 },
});
function storage() {
  const values = new Map<string, string>();
  const port = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  vi.stubGlobal("localStorage", port);
  return port;
}
afterEach(() => vi.unstubAllGlobals());
describe("unified database settings", () => {
  it("hydrates legacy values in a draft and preserves unrelated settings and original storage", () => {
    const port = storage(),
      root = base(),
      json = JSON.stringify(root);
    const old = replaceSaveSettings(json, undefined, port);
    const legacy = {
      entity: {
        sort: 2 as const,
        gridRows: 12,
        filterUnavailableSpecies: false,
      },
      encounter: {
        returnNoneIfEmptySearch: false,
        filterUnavailableSpecies: false,
        useTabsAsCriteria: false,
        useTabsAsCriteriaAnySpecies: false,
        gridRows: 5,
      },
      mystery: { filterUnavailableSpecies: false, gridRows: 20 },
    };
    const hydrated = hydrateDatabaseSettings(json, legacy),
      next = JSON.parse(hydrated);
    expect(next.privacy).toEqual(root.privacy);
    expect(next.entityDb.searchBackups).toBe(false);
    expect(next.entityDb.searchExtraSavesDeep).toBe(false);
    expect(readSaveSettings(port)).toEqual(old);
    expect(unifiedEntityOptions()).toBeUndefined();
    const saved = replaceSaveSettings(hydrated, old.revision, port, true);
    expect(saved.databaseSettingsUnified).toBe(true);
    expect(saved.version).toBe(2);
    expect(unifiedEntityOptions()).toEqual(legacy.entity);
    expect(unifiedEncounterOptions()).toEqual(legacy.encounter);
    expect(unifiedMysteryOptions()).toEqual(legacy.mystery);
    expect(
      replaceSaveSettings(hydrated, saved.revision, port)
        .databaseSettingsUnified,
    ).toBe(true);
  });
  it("retains old module values until migration and keeps the encounter trainers independently", () => {
    const port = storage();
    const trainer = {
      name: "Trainer",
      version: 3,
      tid: 1,
      sid: 2,
      gender: 0,
      language: 2,
      consoleRegion: 0,
      country: 0,
      region: 0,
    };
    port.setItem(
      "pokerngkit-pokemon-database-options-v1",
      JSON.stringify({
        sort: 2,
        gridRows: 12,
        filterUnavailableSpecies: false,
      }),
    );
    port.setItem(
      "pokerngkit:encounter-settings:v1",
      JSON.stringify({
        options: {
          returnNoneIfEmptySearch: false,
          filterUnavailableSpecies: false,
          useTabsAsCriteria: false,
          useTabsAsCriteriaAnySpecies: false,
          gridRows: 5,
        },
        trainers: [trainer],
      }),
    );
    port.setItem(
      "pokerngkit-mystery-gift-settings",
      JSON.stringify({ gridRows: 20, filterUnavailableSpecies: false }),
    );
    const old = replaceSaveSettings(JSON.stringify(base()), undefined, port);
    expect(loadDatabaseOptions().gridRows).toBe(12);
    expect(loadEncounterSettings().options.gridRows).toBe(5);
    expect(loadMysterySettings().gridRows).toBe(20);
    const json = hydrateDatabaseSettings(old.json, {
      entity: loadDatabaseOptions(),
      encounter: loadEncounterSettings().options,
      mystery: loadMysterySettings(),
    });
    replaceSaveSettings(json, old.revision, port, true);
    expect(loadDatabaseOptions().gridRows).toBe(12);
    expect(loadEncounterSettings()).toMatchObject({
      options: { gridRows: 5 },
      trainers: [trainer],
    });
    expect(loadMysterySettings().gridRows).toBe(20);
    expect(port.getItem("pokerngkit:encounter-settings:v1")).toContain(
      "Trainer",
    );
  });
  it("does not publish a migration marker when storage fails and enforces source ranges", () => {
    const port = storage(),
      old = replaceSaveSettings(JSON.stringify(base()), undefined, port);
    expect(() =>
      replaceSaveSettings(
        old.json,
        old.revision,
        {
          getItem: port.getItem,
          setItem: () => {
            throw new Error("quota");
          },
        },
        true,
      ),
    ).toThrow("quota");
    expect(readSaveSettings(port)).toEqual(old);
    const root = base();
    root.entityDb.resultsGridRowCount = 21;
    replaceSaveSettings(JSON.stringify(root), old.revision, port, true);
    expect(() => unifiedEntityOptions()).toThrow("row count");
  });
});
