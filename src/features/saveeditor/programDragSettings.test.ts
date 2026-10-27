// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { programDragThreshold } from "./programDragSettings";
it("uses the upstream zero default and full signed Int32 setting", () => {
  expect(programDragThreshold("")).toBe(0);
  for (const threshold of [-2147483648, -1, 0, 4, 2147483647]) {
    expect(
      programDragThreshold(
        JSON.stringify({ advanced: { dragStartThreshold: threshold } }),
      ),
    ).toBe(threshold);
  }
});
it("rejects corrupt settings instead of substituting a permissive threshold", () => {
  for (const value of [
    "{",
    "null",
    "{}",
    '{"advanced":{}}',
    ...[null, "4", true, 0.5, -2147483649, 2147483648].map(
      (dragStartThreshold) =>
        JSON.stringify({ advanced: { dragStartThreshold } }),
    ),
  ]) {
    expect(() => programDragThreshold(value)).toThrow();
  }
});
