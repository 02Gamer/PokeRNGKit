import { describe, it, expect } from "vitest";
import {
  raid8Hex,
  raid8Request,
  raid8Frozen,
  supportsRaid8,
  type Raid8Catalog,
} from "./raid8";
import { raid8Words } from "./raid8Words";
const c: Raid8Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  regions: [
    {
      origin: 0,
      countUsed: 100,
      countAll: 100,
      available: true,
      entries: [
        {
          index: 0,
          hash: "0".repeat(16),
          seed: "0".repeat(16),
          stars: 0,
          randRoll: 0,
          denType: 0,
          flags: 0,
          active: false,
          rare: false,
          wishingPiece: false,
          wattsHarvested: false,
          event: false,
          raw: "0".repeat(48),
        },
      ],
    },
    { origin: 1, countUsed: 90, countAll: 0, available: false, entries: [] },
  ],
};
describe("SWSH raid property editor", () => {
  it("keeps full hex UInt64 and source zero fallback", () => {
    expect(raid8Hex("0xFFFFFFFFFFFFFFFF")).toBe("FFFFFFFFFFFFFFFF");
    expect(raid8Hex("  0000abcdef  ")).toBe("0000000000ABCDEF");
    for (const s of ["", "-1", "xyz", "10000000000000000"])
      expect(raid8Hex(s)).toBe("0000000000000000");
  });
  it("keeps repeated ordered setters and full byte ranges", () => {
    const operations = [
      { origin: 0, index: 0, property: "event", value: "true" },
      { origin: 0, index: 0, property: "rare", value: "true" },
      { origin: 0, index: 0, property: "event", value: "false" },
      { origin: 0, index: 0, property: "stars", value: "255" },
    ];
    expect(raid8Request(c, operations).operations).toEqual(operations);
    expect(raid8Request(c, []).operations).toEqual([]);
  });
  it("rejects readonly fields, absent regions and invalid bytes", () => {
    for (const op of [
      { origin: 1, index: 0, property: "seed", value: "0" },
      { origin: 0, index: 100, property: "seed", value: "0" },
      { origin: 0, index: 0, property: "active", value: "true" },
      { origin: 0, index: 0, property: "flags", value: "256" },
      { origin: 0, index: 0, property: "event", value: "1" },
    ])
      expect(() => raid8Request(c, [op])).toThrow();
    expect(() => raid8Request({ ...c, canEdit: false }, [])).toThrow();
  });
  it("binds full frozen source and target and localized properties", () => {
    const request = { ...raid8Request(c, []), targetHash: "B".repeat(64) },
      p = {
        request,
        result: { ...c, sourceHash: request.targetHash },
        changedOffsets: [],
      };
    expect(raid8Frozen(c, p)).toEqual(request);
    expect(() => raid8Frozen(c, { ...p, result: c })).toThrow();
    expect(supportsRaid8("SAV8SWSH")).toBe(true);
    expect(supportsRaid8("SAV8BS")).toBe(false);
    for (const l of ["zh", "en", "ja"] as const) {
      expect(Object.keys(raid8Words[l].properties)).toHaveLength(10);
      expect(raid8Words[l].regions).toHaveLength(3);
    }
  });
});
