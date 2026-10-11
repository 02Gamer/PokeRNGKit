import { describe, expect, it } from "vitest";
import {
  donut9aFrozen,
  donut9aRequest,
  donut9aWallClock,
  supportsDonut9a,
  type Dn9aCatalog,
} from "./donut9a";
import {
  donutEffectImage,
  donutImage,
  donutProfileImage,
  donutStarImage,
  donutBerryImage,
} from "./art";
const name = { zh: "甜甜圈", en: "Donut", ja: "ドーナツ" };
const c: Dn9aCatalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  entries: [
    {
      index: 998,
      canLoad: true,
      hasMilliseconds: true,
      stars: 5,
      levelBoost: 84,
      donut: 0,
      calories: 3600,
      berries: Array(9).fill(0),
      flavors: Array(3).fill("0000000000000000"),
      date: "2024-02-29T12:34:56",
      milliseconds: "18446744073709551615",
      raw: "00".repeat(72),
      profile: [0, 0, 0, 0, 0],
      scale: [0.1, 0.1, 0.1, 0.1, 0.1],
      sprite: "donut_sweet05",
    },
  ],
  donuts: [{ id: 0, name }],
  berries: [
    { id: 0, name },
    { id: 149, name },
  ],
  flavors: [
    {
      id: 1,
      hash: "FFFFFFFFFFFFFFFF",
      name,
      sprite: "sweet_03_lv3",
      generatorAllowed: true,
    },
    {
      id: 2,
      hash: "0000000000000001",
      name,
      sprite: "bitter_03_lv3",
      generatorAllowed: false,
    },
  ],
};
describe("ZA donut contracts", () => {
  it("uses only ZA and complete writable source slots", () => {
    expect(supportsDonut9a("SAV9ZA")).toBe(true);
    expect(supportsDonut9a("SAV9SV")).toBe(false);
    expect(() =>
      donut9aRequest({ ...c, canEdit: false }, { action: "reset", index: 998 }),
    ).toThrow();
    expect(() => donut9aRequest(c, { action: "resave", index: 999 })).toThrow();
  });
  it("preserves UInt64 text and ordered duplicate time events for the source Worker", () => {
    const fields = [
      { key: "milliseconds", value: "18446744073709551615" },
      { key: "date", value: "2024-02-29T12:34:56" },
      { key: "milliseconds", value: "bad" },
    ];
    const e = donut9aRequest(c, {
      action: "patch",
      index: 998,
      fields,
      uiLanguage: "zh",
      now: "2026-01-02T03:04:05.006",
    });
    expect(e.fields).toEqual(fields);
    fields[0].value = "0";
    expect(e.fields?.[0].value).toBe("18446744073709551615");
  });
  it("enforces source generator choices and exclusive bounds, with explicit wall-clock time", () => {
    const valid = {
      action: "generate" as const,
      index: 998,
      start: 998,
      end: 999,
      flavors: [1],
      now: "2026-01-02T03:04:05.006",
    };
    expect(donut9aRequest(c, valid).end).toBe(999);
    for (const extra of [
      { start: 999 },
      { start: 998, end: 998 },
      { flavors: [] },
      { flavors: [2] },
      { flavors: [1, 1] },
      { now: undefined },
    ])
      expect(() => donut9aRequest(c, { ...valid, ...extra })).toThrow();
  });
  it("separates exact binary import from prefix clipboard semantics and validates real dates", () => {
    expect(
      donut9aRequest(c, { action: "hex", index: 998, hex: "FF GG" }).hex,
    ).toBe("FF GG");
    expect(
      donut9aRequest(c, { action: "import", index: 998, hex: "00".repeat(72) })
        .hex,
    ).toHaveLength(144);
    expect(() =>
      donut9aRequest(c, { action: "import", index: 998, hex: "00" }),
    ).toThrow();
    expect(() =>
      donut9aRequest(c, {
        action: "patch",
        index: 998,
        uiLanguage: "en",
        fields: [{ key: "date", value: "2025-02-29T00:00:00" }],
      }),
    ).toThrow();
    expect(() =>
      donut9aRequest(c, { action: "clone", index: 998, hex: "00" }),
    ).toThrow();
  });
  it("freezes token and exact source/target hashes without replaying random operations", () => {
    const t = {
      token: "donut:1",
      sourceHash: c.sourceHash,
      targetHash: "B".repeat(64),
      result: { ...c, sourceHash: "B".repeat(64) },
      changedEntries: [998],
      changedOffsets: [8],
      ignoredFields: [],
    };
    expect(donut9aFrozen(c, t)).toEqual({
      token: t.token,
      sourceHash: t.sourceHash,
      targetHash: t.targetHash,
    });
    expect(() => donut9aFrozen(c, { ...t, result: c })).toThrow();
    expect(() => donut9aFrozen(c, { ...t, token: "old" })).toThrow();
  });
  it("formats local wall-clock fields and serves only imported local PNG keys", () => {
    const date = new Date(2026, 0, 2, 3, 4, 5, 6);
    expect(donut9aWallClock(date)).toBe("2026-01-02T03:04:05.006");
    expect(donutImage("donut_uni491")).toContain("donut_uni491.png");
    expect(donutEffectImage("sweet_03_lv3")).toContain("sweet_03_lv3.png");
    expect(donutProfileImage()).toContain("flavorprofile.png");
    expect(donutStarImage()).toContain("star.png");
    expect(donutBerryImage(2676)).toContain("aitem_2676.png");
    expect(donutBerryImage(0)).toBeUndefined();
    expect(donutImage("donut_unknown")).toBeUndefined();
    expect(donutImage("../x")).toBeUndefined();
  });
});
