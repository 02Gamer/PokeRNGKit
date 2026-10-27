// SPDX-License-Identifier: GPL-3.0-or-later
// AdvancedSettings.DragStartThreshold: Int32, default zero, no Range attribute.
export function programDragThreshold(json: string): number {
  if (!json) return 0;
  const threshold: unknown = JSON.parse(json).advanced?.dragStartThreshold;
  if (
    typeof threshold !== "number" ||
    !Number.isInteger(threshold) ||
    threshold < -2147483648 ||
    threshold > 2147483647
  )
    throw Error("Invalid box drag threshold.");
  return threshold;
}
