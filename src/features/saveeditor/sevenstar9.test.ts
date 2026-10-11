import { describe, expect, it } from "vitest";
import {
  isSevenStar9Page,
  sevenStar9Frozen,
  sevenStar9Query,
  sevenStar9Request,
  type R7Page,
  type R7Ticket,
} from "./sevenstar9";
const page = (): R7Page => ({
  canEdit: true,
  sourceHash: "A".repeat(64),
  count: 3000,
  defeatedCount: 3000,
  hasDefeatedBlock: true,
  offset: 0,
  limit: 1,
  filter: "",
  total: 3000,
  entries: [
    {
      index: 0,
      canEdit: true,
      identifier: 2147483648,
      captured: false,
      defeated: false,
      defeatedIdentifier: 2415919104,
      captureRaw: "000000800202A7A7",
      defeatedRaw: "0000009002B9B9B9",
    },
  ],
});
describe("SevenStar9", () => {
  it("preserves ordered edits and delegates property parsing to Core", () => {
    const changes = [
      {
        index: 2999,
        fields: [{ name: "Identifier" as const, value: "0xFFFFFFFF" }],
      },
      { index: 2999, fields: [{ name: "Captured" as const, value: "True" }] },
    ];
    const request = sevenStar9Request(page(), changes, "ja", {
      offset: 2990,
      limit: 50,
      filter: "",
    });
    expect(request.culture).toBe("ja-JP");
    expect(request.changes).toEqual(changes);
    changes[0].fields[0].value = "changed";
    expect(request.changes[0].fields[0].value).toBe("0xFFFFFFFF");
    expect(
      sevenStar9Request(
        page(),
        [{ index: 0, fields: [{ name: "Identifier", value: "" }] }],
        "zh",
        { offset: 0, limit: 50, filter: "" },
      ).changes[0].fields[0].value,
    ).toBe("");
  });
  it("guards exact physical bounds, paired rows and property text limits", () => {
    const p = page(),
      q = { offset: 0, limit: 50, filter: "" };
    expect(() =>
      sevenStar9Request(p, [{ index: 3000, fields: [] }], "en", q),
    ).toThrow();
    p.defeatedCount = 1;
    expect(() =>
      sevenStar9Request(
        p,
        [{ index: 1, fields: [{ name: "Captured", value: "True" }] }],
        "en",
        q,
      ),
    ).toThrow();
    expect(() =>
      sevenStar9Request(
        p,
        [
          {
            index: 0,
            fields: [{ name: "Identifier", value: "1".repeat(32768) }],
          },
        ],
        "en",
        q,
      ),
    ).toThrow();
    expect(() => sevenStar9Query({ ...q, limit: 201 })).toThrow();
  });
  it("validates paged schemas without dropping legacy or incomplete rows", () => {
    const p = page();
    expect(isSevenStar9Page(p)).toBe(true);
    p.hasDefeatedBlock = false;
    p.defeatedCount = 0;
    p.entries[0].defeatedIdentifier = null;
    p.entries[0].defeatedRaw = null;
    expect(isSevenStar9Page(p)).toBe(true);
    p.hasDefeatedBlock = true;
    p.entries[0].canEdit = false;
    p.entries[0].defeated = null;
    expect(isSevenStar9Page(p)).toBe(true);
    p.entries[0].captured = 2 as unknown as boolean;
    expect(isSevenStar9Page(p)).toBe(false);
  });
  it("requires an exact frozen source and result hash", () => {
    const p = page();
    const t = {
      token: "sevenstar9:1",
      sourceHash: p.sourceHash,
      targetHash: "B".repeat(64),
      result: { ...p, sourceHash: "B".repeat(64) },
      entries: [],
      blocks: [],
      changedOffsets: [],
    } satisfies R7Ticket;
    expect(sevenStar9Frozen(p, t).token).toBe(t.token);
    expect(() =>
      sevenStar9Frozen(p, { ...t, targetHash: "C".repeat(64) }),
    ).toThrow();
  });
});
