// SPDX-License-Identifier: GPL-3.0-or-later
// PKHeX.Core BoxExportSettings enum bounds; all source defaults are zero.
export const boxExportLimits = {
  scope: 1,
  folderCreation: 1,
  folderPrefix: 2,
  emptySlots: 1,
  fileIndexPrefix: 3,
  notify: 1,
} as const;
export interface BoxExportDefaults {
  scope: 0 | 1;
  folderCreation: 0 | 1;
  folderPrefix: 0 | 1 | 2;
  emptySlots: 0 | 1;
  fileIndexPrefix: 0 | 1 | 2 | 3;
  notify: 0 | 1;
}
export function parseBoxExportOptions(value?: unknown): BoxExportDefaults {
  if (value === undefined)
    return {
      scope: 0,
      folderCreation: 0,
      folderPrefix: 0,
      emptySlots: 0,
      fileIndexPrefix: 0,
      notify: 0,
    };
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid box export defaults.");
  const source = value as Record<string, unknown>;
  for (const [name, max] of Object.entries(boxExportLimits)) {
    const item = source[name];
    if (
      typeof item !== "number" ||
      !Number.isInteger(item) ||
      item < 0 ||
      item > max
    )
      throw new Error("Invalid box export defaults.");
  }
  return Object.fromEntries(
    Object.keys(boxExportLimits).map((name) => [name, source[name]]),
  ) as unknown as BoxExportDefaults;
}
