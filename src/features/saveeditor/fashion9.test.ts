import { describe, expect, it } from "vitest";
import {
  fashion9Frozen,
  fashion9Import,
  fashion9Query,
  fashion9Request,
  supportsFashion9,
  isFashion9Page,
  type F9Catalog,
  type F9Operation,
  type F9Ticket,
} from "./fashion9";

const catalog: F9Catalog = {
  canEdit: true,
  canOwn: true,
  sourceHash: "A".repeat(64),
  groups: [
    {
      id: "Tops",
      key: "D4BCE690",
      kind: "za",
      available: true,
      count: 3,
      bytes: 24,
      rows: [],
    },
    {
      id: "HairMake00StyleHair",
      key: "8E466865",
      kind: "hair",
      available: true,
      count: 2,
      bytes: 16,
      rows: [],
    },
  ],
};
describe("Fashion9 ordered operations", () => {
  it("guards the complete bounded page payload and source-specific flags", () => {
    const groups = Array.from({ length: 8 }, (_, i) => ({
      id: "SV" + i,
      key: i.toString(16).padStart(8, "0").toUpperCase(),
      kind: "sv",
      available: true,
      count: 2,
      bytes: 16,
      rows: [],
    }));
    const row = {
      index: 1,
      value: "4294967295",
      isNew: true,
      isNewShop: null,
      isNewGroup: null,
      isEquipped: null,
      isOwned: null,
      raw: "FFFFFFFF01000000",
    };
    const page = {
      canEdit: true,
      canOwn: false,
      sourceHash: catalog.sourceHash,
      groups,
      group: "SV0",
      filter: "",
      offset: 0,
      limit: 50,
      total: 2,
      rows: [row],
    };
    expect(isFashion9Page(page)).toBe(true);
    expect(isFashion9Page({ ...page, limit: undefined })).toBe(false);
    expect(
      isFashion9Page({ ...page, rows: [{ ...row, isOwned: false }] }),
    ).toBe(false);
    expect(
      isFashion9Page({ ...page, rows: [{ ...row, value: "4294967296" }] }),
    ).toBe(false);
    expect(isFashion9Page({ ...page, rows: [{ ...row, index: 2 }] })).toBe(
      false,
    );
    expect(isFashion9Page({ ...page, rows: [row, row] })).toBe(false);
  });
  it("keeps import/rows/own order and immutable snapshots", () => {
    const imported = fashion9Import(
      catalog.groups[0],
      new Uint8Array(24).fill(31),
    );
    const ops: F9Operation[] = [
      {
        action: "rows",
        group: "Tops",
        changes: [{ index: 0, value: "invalid", isOwned: false }],
      },
      imported,
      { action: "owned", group: "Tops", owned: true, all: true },
    ];
    const edit = fashion9Request(catalog, ops);
    expect(edit.operations.map((o) => o.action)).toEqual([
      "rows",
      "import",
      "owned",
    ]);
    ops.reverse();
    imported.data = "00";
    expect(edit.operations[1]).toMatchObject({ data: "1F".repeat(24) });
    expect(edit.operations[0]).toMatchObject({
      changes: [{ value: "invalid" }],
    });
  });
  it("rejects physical bounds and only the unsupported flag fields", () => {
    const patch = (index: number, value: string) =>
      fashion9Request(catalog, [
        { action: "rows", group: "Tops", changes: [{ index, value }] },
      ]);
    expect(() => patch(3, "1")).toThrow();
    expect(() => patch(0, "1".repeat(32768))).toThrow();
    expect(() => patch(2, "4294967296")).not.toThrow();
    expect(() =>
      fashion9Request(catalog, [
        {
          action: "rows",
          group: "HairMake00StyleHair",
          changes: [{ index: 0, isOwned: false }],
        },
      ]),
    ).toThrow();
    expect(() =>
      fashion9Request(catalog, [
        {
          action: "owned",
          group: "HairMake00StyleHair",
          owned: false,
          all: false,
        },
      ]),
    ).not.toThrow();
    expect(() =>
      fashion9Request({ ...catalog, canOwn: false }, [
        { action: "owned", group: "Tops", owned: true, all: false },
      ]),
    ).toThrow();
  });
  it("validates exact file size and bounded pages", () => {
    expect(() =>
      fashion9Import(catalog.groups[0], new Uint8Array(23)),
    ).toThrow();
    expect(() =>
      fashion9Import(
        { ...catalog.groups[0], bytes: 65537 },
        new Uint8Array(65537),
      ),
    ).toThrow();
    expect(fashion9Query("Tops", "65535", 2, 200)).toEqual({
      group: "Tops",
      filter: "65535",
      offset: 2,
      limit: 200,
    });
    expect(() => fashion9Query("Tops", "", 0, 201)).toThrow();
    expect(() => fashion9Query("Tops", "", -1)).toThrow();
    expect(supportsFashion9("SAV9ZA")).toBe(true);
    expect(supportsFashion9("SAV9SV")).toBe(true);
    expect(supportsFashion9("SAV8SWSH")).toBe(false);
  });
  it("binds a complete frozen output to the source and target", () => {
    const ticket = {
      token: "fashion9:1",
      sourceHash: catalog.sourceHash,
      targetHash: "B".repeat(64),
      result: { ...catalog, sourceHash: "B".repeat(64) },
    } as F9Ticket;
    expect(fashion9Frozen(catalog, ticket).targetHash).toBe("B".repeat(64));
    expect(() =>
      fashion9Frozen(catalog, { ...ticket, sourceHash: "C".repeat(64) }),
    ).toThrow();
    expect(() =>
      fashion9Frozen(catalog, { ...ticket, targetHash: "D".repeat(64) }),
    ).toThrow();
    expect(() => fashion9Request({ ...catalog, canEdit: false }, [])).toThrow();
  });
  it("bounds the ordered queue and complete serialized request", () => {
    expect(() =>
      fashion9Request(
        catalog,
        Array.from({ length: 513 }, () => ({
          action: "resave" as const,
          group: "Tops",
        })),
      ),
    ).toThrow();
    const large = {
      ...catalog,
      groups: [{ ...catalog.groups[0], bytes: 65536, count: 8192 }],
    };
    const imported = fashion9Import(large.groups[0], new Uint8Array(65536));
    expect(() =>
      fashion9Request(
        large,
        Array.from({ length: 64 }, () => imported),
      ),
    ).toThrow("too large");
  });
});
