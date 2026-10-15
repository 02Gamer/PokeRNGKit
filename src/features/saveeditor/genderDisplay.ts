// SPDX-License-Identifier: GPL-3.0-or-later
// PKHeX.Core.GameInfo.GenderSymbolUnicode / GenderSymbolASCII.
export function genderSymbols(json: string): readonly string[] {
  if (!json) return ["♂", "♀", "-"];
  const unicode = JSON.parse(json).display?.unicode;
  if (typeof unicode !== "boolean")
    throw new Error("Invalid Unicode settings.");
  return unicode ? ["♂", "♀", "-"] : ["M", "F", "-"];
}
export function formatGender(
  symbols: readonly string[],
  value: number,
  label?: string,
) {
  const symbol =
    Number.isInteger(value) && value >= 0 && value < 3
      ? (symbols[value] ?? `#${value}`)
      : `#${value}`;
  return label ? `${label} (${symbol})` : symbol;
}
