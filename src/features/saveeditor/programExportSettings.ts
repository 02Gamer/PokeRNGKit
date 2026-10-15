// SPDX-License-Identifier: GPL-3.0-or-later
import { readSaveSettings } from "./settingsRepository";
export interface ReportSettings {
  extra: string[];
  hidden: string[];
}
export interface BoxExportDefaults {
  scope: 0 | 1;
  folderCreation: 0 | 1;
  folderPrefix: 0 | 1 | 2;
  emptySlots: 0 | 1;
  fileIndexPrefix: 0 | 1 | 2 | 3;
  notify: 0 | 1;
}
function root(): Record<string, unknown> | undefined {
  try {
    const json = readSaveSettings()?.json;
    return json ? JSON.parse(json) : undefined;
  } catch {
    return;
  } // The request client still refuses invalid complete settings.
}
export function loadReportSettings(): ReportSettings {
  const value = root()?.report as
    { extraProperties?: unknown; hiddenProperties?: unknown } | undefined;
  if (!value) return { extra: [], hidden: [] };
  const list = (items: unknown): string[] => {
    if (
      !Array.isArray(items) ||
      items.length > 256 ||
      !items.every((item) => typeof item === "string" && item.length <= 128)
    )
      throw new Error("Invalid report properties.");
    return [...items];
  };
  return {
    extra: list(value.extraProperties),
    hidden: list(value.hiddenProperties),
  };
}
export function loadBoxExportDefaults(): BoxExportDefaults {
  const value = (
    root()?.slotExport as { boxExport?: BoxExportDefaults } | undefined
  )?.boxExport;
  const defaults: BoxExportDefaults = {
    scope: 0,
    folderCreation: 0,
    folderPrefix: 0,
    emptySlots: 0,
    fileIndexPrefix: 0,
    notify: 0,
  };
  if (!value) return defaults;
  for (const [name, max] of Object.entries({
    scope: 1,
    folderCreation: 1,
    folderPrefix: 2,
    emptySlots: 1,
    fileIndexPrefix: 3,
    notify: 1,
  })) {
    const item = value[name as keyof BoxExportDefaults];
    if (!Number.isInteger(item) || item < 0 || item > max)
      throw new Error("Invalid box export defaults.");
  }
  return { ...value };
}
export function reportHiddenIndices(columns: readonly { visible: boolean }[]) {
  return columns.flatMap((column, index) => (column.visible ? [] : [index]));
}
