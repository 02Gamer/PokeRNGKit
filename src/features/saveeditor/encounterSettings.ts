// SPDX-License-Identifier: GPL-3.0-or-later
import type { EncounterOptions, EncounterTrainer } from "./encounterProtocol";
export const encounterDefaults: EncounterOptions = {
  returnNoneIfEmptySearch: true,
  filterUnavailableSpecies: true,
  useTabsAsCriteria: true,
  useTabsAsCriteriaAnySpecies: true,
  gridRows: 9,
};
const key = "pokerngkit:encounter-settings:v1";
export function loadEncounterSettings(): {
  options: EncounterOptions;
  trainers: EncounterTrainer[];
} {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!raw || typeof raw !== "object") throw Error();
    const value = raw as {
      options: EncounterOptions;
      trainers: EncounterTrainer[];
    };
    validateEncounterSettings(value.options, value.trainers);
    return structuredClone(value);
  } catch {
    return { options: { ...encounterDefaults }, trainers: [] };
  }
}
export function validateEncounterSettings(
  options: EncounterOptions,
  trainers: EncounterTrainer[],
) {
  if (
    !options ||
    ![
      options.returnNoneIfEmptySearch,
      options.filterUnavailableSpecies,
      options.useTabsAsCriteria,
      options.useTabsAsCriteriaAnySpecies,
    ].every((v) => typeof v === "boolean") ||
    !Number.isInteger(options.gridRows) ||
    options.gridRows < 5 ||
    options.gridRows > 20 ||
    !Array.isArray(trainers) ||
    trainers.length > 1024
  )
    throw Error("Invalid encounter settings.");
  const integer = (value: number, max: number) =>
    Number.isInteger(value) && value >= 0 && value <= max;
  for (const t of trainers)
    if (
      !t ||
      typeof t.name !== "string" ||
      t.name.length > 32767 ||
      !integer(t.version, 255) ||
      t.version === 0 ||
      !integer(t.tid, 65535) ||
      !integer(t.sid, 65535) ||
      !integer(t.gender, 1) ||
      !integer(t.language, 11) ||
      t.language === 0 ||
      ![t.consoleRegion, t.country, t.region].every((v) => integer(v, 255))
    )
      throw Error("Invalid encounter trainer.");
}
export function saveEncounterSettings(
  options: EncounterOptions,
  trainers: EncounterTrainer[],
) {
  validateEncounterSettings(options, trainers);
  localStorage.setItem(key, JSON.stringify({ options, trainers }));
}
