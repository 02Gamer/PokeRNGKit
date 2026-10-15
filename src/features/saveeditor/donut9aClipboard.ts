// SPDX-License-Identifier: GPL-3.0-or-later
// DonutPocket9a stores 0x48 bytes per entry; copy the source byte order exactly.
export function donut9aHexText(bytes: Uint8Array): string {
  if (bytes.length !== 0x48) throw new Error("Invalid donut export size.");
  return Array.from(bytes, (byte) =>
    byte.toString(16).toUpperCase().padStart(2, "0"),
  ).join(" ");
}
export async function copyDonut9aHex(
  bytes: Uint8Array,
  write: (text: string) => Promise<void> = (text) =>
    navigator.clipboard.writeText(text),
): Promise<void> {
  await write(donut9aHexText(bytes));
}
