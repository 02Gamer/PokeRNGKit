// SPDX-License-Identifier: GPL-3.0-or-later
export async function copyGoParkSummary(
  summary: string,
  write: (text: string) => Promise<void> = (text) =>
    navigator.clipboard.writeText(text),
): Promise<"empty" | "copied" | "failed"> {
  if (!summary) return "empty";
  try {
    await write(summary);
    return "copied";
  } catch {
    return "failed";
  }
}
