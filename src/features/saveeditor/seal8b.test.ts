import { describe, it, expect } from "vitest";
import {
  seal8bInteger,
  seal8bRequest,
  seal8bFrozen,
  supportsSeal8b,
  type Seal8bCatalog,
} from "./seal8b";
import { seal8bWords } from "./seal8bWords";
const c: Seal8bCatalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  entries: [
    {
      index: 1,
      name: { zh: "贴纸", en: "Sticker", ja: "シール" },
      count: 4,
      total: 8,
      obtained: true,
      rawObtained: 1,
    },
  ],
  rawObtained: Array(200).fill(0),
};
describe("BDSP seals source semantics", () => {
  it("parses full signed decimal Int32 and source fallback", () => {
    for (const [s, n] of [
      ["-2147483648", -2147483648],
      ["+2147483647", 2147483647],
      ["  +001 ", 1],
      ["", 0],
      ["2147483648", 0],
      ["-2147483649", 0],
      ["1e2", 0],
      ["1.0", 0],
      ["0x99", 0],
      ["1,000", 0],
    ] as const)
      expect(seal8bInteger(s)).toBe(n);
  });
  it("accepts source drafts before all/none/resave without artificial 99 cap", () => {
    for (const action of ["patch", "all", "none", "resave"] as const)
      expect(
        seal8bRequest(c, action, [
          { index: 1, count: -2147483648, total: 2147483647 },
        ]).entries?.[0].count,
      ).toBe(-2147483648);
    expect(supportsSeal8b("SAV8BS")).toBe(true);
    expect(supportsSeal8b("SAV8SWSH")).toBe(false);
  });
  it("rejects hidden rows, duplicates, invalid integers and readonly", () => {
    for (const entries of [
      [{ index: 0, count: 1 }],
      [{ index: 1 }],
      [{ index: 1, count: 2147483648 }],
      [{ index: 1, total: 1.5 }],
      [
        { index: 1, count: 1 },
        { index: 1, count: 2 },
      ],
    ])
      expect(() => seal8bRequest(c, "patch", entries)).toThrow();
    expect(() => seal8bRequest({ ...c, canEdit: false }, "all")).toThrow();
    expect(() => seal8bRequest(c, "patch")).toThrow();
  });
  it("binds frozen full source and target", () => {
    const request = { ...seal8bRequest(c, "all"), targetHash: "B".repeat(64) },
      p = {
        request,
        result: { ...c, sourceHash: request.targetHash },
        changedOffsets: [1],
      };
    expect(seal8bFrozen(c, p)).toEqual(request);
    expect(() =>
      seal8bFrozen({ ...c, sourceHash: "C".repeat(64) }, p),
    ).toThrow();
    expect(() => seal8bFrozen(c, { ...p, result: c })).toThrow();
  });
  it("provides all operations in three languages", () => {
    for (const l of ["zh", "en", "ja"] as const)
      for (const k of [
        "all",
        "none",
        "resave",
        "patch",
        "range",
        "normalization",
      ] as const)
        expect(seal8bWords[l][k].length).toBeGreaterThan(0);
  });
});
