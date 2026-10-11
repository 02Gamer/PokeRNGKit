import { describe, expect, it } from "vitest";
import {
  event9aRequest,
  event9aFrozen,
  supportsEvent9a,
  event9aKeyCount,
  event9aReadQuery,
  type Ew9aCatalog,
  type Ew9aTicket,
} from "./event9a";

const sourceHash = "A".repeat(64),
  namesHash = "B".repeat(64);
const catalog: Ew9aCatalog = {
  canEdit: true,
  sourceHash,
  namesHash,
  groups: [
    {
      id: "Flags",
      blockKey: "ED6F46E7",
      kind: "bool",
      count: 2048,
      used: 1,
      available: true,
      rows: [],
    },
    {
      id: "Report",
      blockKey: "AF2165F0",
      kind: "tuple",
      count: 512,
      used: 0,
      available: true,
      rows: [],
    },
    {
      id: "FieldObjectInteractable",
      blockKey: "7147C953",
      kind: "hash3",
      count: 5000,
      used: 0,
      available: true,
      rows: [],
    },
  ],
};
describe("Z-A event work contract", () => {
  it("pages every group without changing source filter text or physical offsets", () => {
    expect(event9aReadQuery("", "WorkSpawn", " Name ", 18000, 200)).toEqual({
      names: "",
      group: "WorkSpawn",
      filter: " Name ",
      offset: 18000,
      limit: 200,
    });
    expect(event9aReadQuery("").limit).toBe(50);
    expect(() => event9aReadQuery("", "Missing")).toThrow();
    expect(() => event9aReadQuery("", "Flags", "", -1)).toThrow();
    expect(() => event9aReadQuery("", "Flags", "", 0, 201)).toThrow();
  });
  it("keeps whole-window resave and every physical slot beyond the first hole", () => {
    expect(event9aRequest(catalog, "", []).changes).toEqual([]);
    const rows = [{ group: "Flags", index: 2047, value: "True" }];
    const request = event9aRequest(catalog, "11\tKnown", rows);
    rows[0].value = "False";
    expect(request.changes[0].value).toBe("True");
    expect(request.names).toBe("11\tKnown");
  });
  it("passes signed and unsigned text to Core without Number conversion or discarding invalid numeric input", () => {
    const edit = event9aRequest(catalog, "", [
      {
        group: "Report",
        index: 511,
        keys: ["0000000000000011", "-9223372036854775808"],
        value: "18446744073709551615",
      },
      {
        group: "FieldObjectInteractable",
        index: 4999,
        keys: [" first ", "Second", "FFFFFFFFFFFFFFFF"],
        value: "bad",
      },
    ]);
    expect(edit.changes[0].keys?.[1]).toBe("-9223372036854775808");
    expect(edit.changes[0].value).toBe("18446744073709551615");
    expect(edit.changes[1].keys?.[0]).toBe(" first ");
    expect(edit.changes[1].value).toBe("bad");
    expect(
      event9aRequest(catalog, "", [
        {
          group: "FieldObjectInteractable",
          index: 0,
          keys: ["new", null, null],
        },
      ]).changes[0].keys,
    ).toEqual(["new", null, null]);
  });
  it("rejects duplicate addresses, missing groups, physical bounds, malformed layouts and invalid flags", () => {
    for (const rows of [
      [{ group: "Flags", index: 2048 }],
      [{ group: "Report", index: -1 }],
      [{ group: "Missing", index: 0 }],
      [{ group: "Report", index: 0, keys: ["one"] }],
      [{ group: "Flags", index: 0, value: "1" }],
      [
        { group: "Flags", index: 0 },
        { group: "Flags", index: 0 },
      ],
    ])
      expect(() => event9aRequest(catalog, "", rows)).toThrow();
    expect(() =>
      event9aRequest({ ...catalog, canEdit: false }, "", []),
    ).toThrow();
  });
  it("binds confirmation to source bytes, target bytes, names and the one cached token", () => {
    const ticket: Ew9aTicket = {
      token: "event9a:1",
      sourceHash,
      targetHash: "C".repeat(64),
      namesHash,
      result: { ...catalog, sourceHash: "C".repeat(64) },
      rows: [],
      blocks: [],
      changedOffsets: [],
      ignored: [],
    };
    expect(event9aFrozen(catalog, ticket).token).toBe("event9a:1");
    expect(() =>
      event9aFrozen(catalog, { ...ticket, namesHash: "D".repeat(64) }),
    ).toThrow();
    expect(() =>
      event9aFrozen(catalog, { ...ticket, sourceHash: "D".repeat(64) }),
    ).toThrow();
    expect(() =>
      event9aFrozen(catalog, { ...ticket, targetHash: "D".repeat(64) }),
    ).toThrow();
  });
  it("uses the exact format and all four source grid layouts", () => {
    expect(supportsEvent9a("SAV9ZA")).toBe(true);
    expect(supportsEvent9a("SAV9SV")).toBe(false);
    expect(
      ["bool", "u64", "tuple", "hash2", "hash3"].map((v) =>
        event9aKeyCount(v as (typeof catalog.groups)[number]["kind"]),
      ),
    ).toEqual([1, 1, 2, 2, 3]);
  });
});
