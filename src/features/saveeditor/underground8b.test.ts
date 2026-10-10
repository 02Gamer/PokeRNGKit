import { describe, it, expect } from "vitest";
import {
  ug8bRequest,
  ug8bFrozen,
  ug8bInteger,
  supportsUnderground8b,
  type Ug8bCatalog,
} from "./underground8b";
import { underground8bWords } from "./underground8bWords";
const c: Ug8bCatalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  entries: [
    {
      index: 1,
      type: "Sphere",
      name: { zh: "玉石", en: "Sphere", ja: "タマ" },
      maximum: 999,
      count: 4,
      new: true,
      favorite: false,
      rawHideNew: 0,
      rawFavorite: 0,
    },
  ],
  rawHideNew: Array(999).fill(0),
  rawFavorite: Array(999).fill(0),
};
describe("BDSP underground source semantics", () => {
  it("allows full Int32 and source invalid text fallback", () => {
    expect(ug8bInteger("-2147483648")).toBe(-2147483648);
    expect(ug8bInteger("2147483648")).toBe(0);
    expect(ug8bInteger("")).toBe(0);
    expect(
      ug8bRequest(c, "patch", [
        { index: 1, count: 2147483647, new: false, favorite: true },
      ]).entries?.[0].count,
    ).toBe(2147483647);
  });
  it("preserves drafts in all/none/resave and rejects hidden/duplicate/noninteger values", () => {
    for (const action of ["all", "none", "resave"] as const)
      expect(
        ug8bRequest(c, action, [{ index: 1, new: false, favorite: true }])
          .entries?.length,
      ).toBe(1);
    for (const entries of [
      [{ index: 0, count: 1 }],
      [{ index: 1 }],
      [{ index: 1, count: 1.5 }],
      [
        { index: 1, count: 1 },
        { index: 1, count: 2 },
      ],
    ])
      expect(() => ug8bRequest(c, "patch", entries)).toThrow();
    expect(() => ug8bRequest({ ...c, canEdit: false }, "all")).toThrow();
  });
  it("binds full frozen source and target", () => {
    const request = { ...ug8bRequest(c, "all"), targetHash: "B".repeat(64) },
      p = {
        request,
        result: { ...c, sourceHash: request.targetHash },
        changedOffsets: [1],
      };
    expect(ug8bFrozen(c, p)).toEqual(request);
    expect(() => ug8bFrozen(c, { ...p, result: c })).toThrow();
    expect(() => ug8bFrozen({ ...c, sourceHash: "C".repeat(64) }, p)).toThrow();
  });
  it("localizes four source types and all operations", () => {
    expect(supportsUnderground8b("SAV8BS")).toBe(true);
    expect(supportsUnderground8b("SAV8LA")).toBe(false);
    for (const l of ["zh", "en", "ja"] as const) {
      expect(Object.keys(underground8bWords[l].types)).toEqual([
        "Item",
        "Sphere",
        "Statue",
        "Pedestal",
      ]);
      for (const k of [
        "all",
        "none",
        "resave",
        "normalization",
        "range",
      ] as const)
        expect(underground8bWords[l][k].length).toBeGreaterThan(0);
    }
  });
});
