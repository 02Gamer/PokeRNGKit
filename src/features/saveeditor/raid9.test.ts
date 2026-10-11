import { describe, expect, it } from "vitest";
import {
  raid9Frozen,
  raid9Request,
  supportsRaid9,
  isRaid9Catalog,
  type R9Catalog,
  type R9Operation,
  type R9Ticket,
} from "./raid9";
const catalog: R9Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  regions: [
    {
      origin: "Paldea",
      available: true,
      countUsed: 72,
      countAll: 72,
      hasSeeds: true,
      currentSeed: "1".repeat(16),
      tomorrowSeed: "2".repeat(16),
      entries: [],
    },
    {
      origin: "Kitakami",
      available: true,
      countUsed: 100,
      countAll: 100,
      hasSeeds: false,
      currentSeed: null,
      tomorrowSeed: null,
      entries: [],
    },
    {
      origin: "BlueberryAcademy",
      available: true,
      countUsed: 80,
      countAll: 100,
      hasSeeds: false,
      currentSeed: null,
      tomorrowSeed: null,
      entries: [],
    },
  ],
};
describe("Raid9 source controls", () => {
  it("guards region counts, source seed width and complete physical entries", () => {
    const full = {
      ...catalog,
      regions: catalog.regions.map((r) => ({
        ...r,
        entries: Array.from({ length: r.countUsed }, (_, index) => ({
          index,
          isEnabled: true,
          areaID: 0,
          lotteryGroup: 0,
          spawnPointID: 0,
          scenePointName: "Raid_Point_0_0_0",
          seed: "FFFFFFFF",
          unused: 0,
          content: "4294967295",
          contentRaw: 4294967295,
          isClaimedLeaguePoints: false,
          raw: "FF".repeat(32),
        })),
      })),
    };
    expect(isRaid9Catalog(full)).toBe(true);
    expect(
      isRaid9Catalog({
        ...full,
        regions: full.regions.map((r) => ({ ...r, countUsed: 100 })),
      }),
    ).toBe(false);
    expect(
      isRaid9Catalog({
        ...full,
        regions: full.regions.map((r) => ({ ...r, currentSeed: "1" })),
      }),
    ).toBe(false);
    expect(
      isRaid9Catalog({
        ...full,
        regions: full.regions.map((r) => ({ ...r, entries: [] })),
      }),
    ).toBe(false);
  });
  it("preserves operation order and immutable property/seed snapshots", () => {
    const operations: R9Operation[] = [
      {
        action: "fields",
        origin: "Paldea",
        index: 0,
        fields: [{ name: "Seed", value: "invalid" }],
      },
      { action: "propagate", origin: "Paldea", index: 0, seedToo: true },
      { action: "seeds", origin: "Paldea", today: "0x1", tomorrow: "" },
    ];
    const edit = raid9Request(catalog, operations, "ja");
    operations.reverse();
    expect(edit.culture).toBe("ja-JP");
    expect(edit.operations.map((o) => o.action)).toEqual([
      "fields",
      "propagate",
      "seeds",
    ]);
    expect(edit.operations[0]).toMatchObject({
      fields: [{ value: "invalid" }],
    });
  });
  it("uses source CountUsed instead of physical storage size", () => {
    expect(() =>
      raid9Request(
        catalog,
        [
          {
            action: "fields",
            origin: "BlueberryAcademy",
            index: 80,
            fields: [],
          },
        ],
        "en",
      ),
    ).toThrow();
    expect(() =>
      raid9Request(
        catalog,
        [
          {
            action: "fields",
            origin: "BlueberryAcademy",
            index: 79,
            fields: [],
          },
        ],
        "en",
      ),
    ).not.toThrow();
    expect(() =>
      raid9Request(
        catalog,
        [{ action: "seeds", origin: "Kitakami", today: "1" }],
        "en",
      ),
    ).toThrow();
    expect(() =>
      raid9Request(
        catalog,
        [{ action: "seeds", origin: "Paldea", today: "F".repeat(17) }],
        "en",
      ),
    ).toThrow();
  });
  it("binds frozen outputs and stops unsupported or readonly formats", () => {
    const ticket = {
      token: "raid9:1",
      sourceHash: catalog.sourceHash,
      targetHash: "B".repeat(64),
      result: { ...catalog, sourceHash: "B".repeat(64) },
    } as R9Ticket;
    expect(raid9Frozen(catalog, ticket).targetHash).toBe("B".repeat(64));
    expect(() =>
      raid9Frozen(catalog, { ...ticket, targetHash: "C".repeat(64) }),
    ).toThrow();
    expect(() =>
      raid9Request({ ...catalog, canEdit: false }, [], "zh"),
    ).toThrow();
    expect(supportsRaid9("SAV9SV")).toBe(true);
    expect(supportsRaid9("SAV9ZA")).toBe(false);
  });
});
