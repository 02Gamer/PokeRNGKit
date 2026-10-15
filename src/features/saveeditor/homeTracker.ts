// SPDX-License-Identifier: GPL-3.0-or-later
// Matches PKHeX PKMEditor.Update_ID64 and Util.GetHexValue64; strings keep all 64 bits.
export function normalizeHomeTracker(value: string): string {
  if (value.length > 16)
    throw new Error("HOME tracker accepts at most 16 characters.");
  return value
    .replace(/[^0-9a-f]/gi, "")
    .toUpperCase()
    .padStart(16, "0");
}
