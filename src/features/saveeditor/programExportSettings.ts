// SPDX-License-Identifier: GPL-3.0-or-later
import { readSaveSettings } from "./settingsRepository";
import { parseBoxExportOptions } from "./boxExportOptions";
export type { BoxExportDefaults } from "./boxExportOptions";
export interface ReportSettings {
  extra: string[];
  hidden: string[];
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
export function loadBoxExportDefaults() {
  return parseBoxExportOptions(
    (root()?.slotExport as { boxExport?: unknown } | undefined)?.boxExport,
  );
}
export function reportHiddenIndices(columns: readonly { visible: boolean }[]) {
  return columns.flatMap((column, index) => (column.visible ? [] : [index]));
}
