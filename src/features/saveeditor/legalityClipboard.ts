// SPDX-License-Identifier: GPL-3.0-or-later
export async function copyLegalityReport(
  text: string,
  isCurrent: () => boolean,
  write: (text: string) => Promise<void> = (value) =>
    navigator.clipboard.writeText(value),
): Promise<"copied" | "failed" | "stale"> {
  if (!isCurrent()) return "stale";
  try {
    await write(text);
    return isCurrent() ? "copied" : "stale";
  } catch {
    return isCurrent() ? "failed" : "stale";
  }
}
