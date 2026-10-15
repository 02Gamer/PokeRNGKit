// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { normalizeHomeTracker } from "./homeTracker";
describe("HOME tracker source input", () => {
  it("keeps all 64 bits and formats empty/filtered input like the source control", () => {
    expect(normalizeHomeTracker("FFFFFFFFFFFFFFFF")).toBe("FFFFFFFFFFFFFFFF");
    expect(normalizeHomeTracker("fedcba9876543210")).toBe("FEDCBA9876543210");
    expect(normalizeHomeTracker("")).toBe("0000000000000000");
    expect(normalizeHomeTracker("0x12-xyA")).toBe("000000000000012A");
    expect(normalizeHomeTracker("xyz")).toBe("0000000000000000");
  });
  it("enforces the source 16-character input width before normalization", () => {
    expect(() => normalizeHomeTracker("1".repeat(17))).toThrow();
    expect(() => normalizeHomeTracker(" ".repeat(17))).toThrow();
  });
});
