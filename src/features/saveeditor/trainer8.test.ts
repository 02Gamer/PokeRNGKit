import { describe, expect, it } from "vitest";
import {
  tr8Request,
  tr8Date,
  tr8Frozen,
  supportsTrainer8,
  type Tr8Catalog,
} from "./trainer8";
const name = { zh: "字段", en: "Field", ja: "項目" };
const catalog: Tr8Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  revision: 1,
  canDiglett: true,
  savedValue: "2024-02-29T12:34:00",
  fields: [
    {
      key: "bp",
      name,
      value: "65535",
      kind: "number",
      min: "0",
      max: "9999",
      maxLength: 4,
      choices: [],
      editable: true,
    },
    {
      key: "hours",
      name,
      value: "1",
      kind: "number",
      min: "0",
      max: "65535",
      maxLength: 5,
      choices: [],
      editable: true,
    },
    {
      key: "started",
      name,
      value: "2024-02-29",
      kind: "date",
      min: "2000-01-01",
      max: "2060-12-31",
      maxLength: 10,
      choices: [],
      editable: true,
    },
    {
      key: "saved",
      name,
      value: "2024-02-29T12:34:00",
      kind: "date",
      min: "1753-01-01T00:00:00",
      max: "4095-12-31T23:59:59",
      maxLength: 19,
      choices: [],
      editable: true,
    },
  ],
  ids: { tid: 123456, sid: 1234, id32: 1234123456, tsv: 1 },
  position: {
    canEdit: true,
    fields: [
      {
        key: "map",
        value: "18446744073709551615",
        display: "18446744073709551615",
        min: "0",
        max: "18446744073709551615",
        places: 0,
      },
    ],
  },
  cardTeam: Array.from({ length: 6 }, (_, index) => ({
    index,
    species: 25,
    name,
    sprite: "b_25",
    raw: "A7".repeat(28),
    fields: [
      {
        key: "ec",
        kind: "u32" as const,
        value: "4294967295",
        min: "0",
        max: "4294967295",
      },
    ],
  })),
  titleTeam: [],
  nameTrash: "00".repeat(26),
  cardTrash: "00".repeat(26),
  statusRaw: "",
  cardRaw: "",
  coordinateRaw: "",
  playedRaw: "",
  recordRaw: "",
  fashionRaw: "",
  characters: [],
  trashSpecies: [],
  trashLanguages: [],
};
describe("Sword/Shield trainer contract", () => {
  it("uses the exact supported format and rejects readonly catalogs", () => {
    expect(supportsTrainer8("SAV8SWSH")).toBe(true);
    expect(supportsTrainer8("SAV8LA")).toBe(false);
    expect(() =>
      tr8Request({ ...catalog, canEdit: false }, { action: "resave" }),
    ).toThrow();
  });
  it("retains full UInt64 map strings and leaves invalid control text to the source Worker parser", () => {
    for (const value of ["18446744073709551615", "", "invalid"]) {
      expect(
        tr8Request(catalog, {
          action: "position",
          uiLanguage: "zh",
          fields: [{ key: "map", value }],
        }).fields?.[0].value,
      ).toBe(value);
    }
    expect(() =>
      tr8Request(
        { ...catalog, position: { ...catalog.position, canEdit: false } },
        { action: "position", fields: [{ key: "map", value: "0" }] },
      ),
    ).toThrow();
  });
  it("keeps source CLR converter forms as text and validates slot/property boundaries", () => {
    const e = tr8Request(catalog, {
      action: "team",
      uiLanguage: "en",
      team: "card",
      members: [{ index: 5, property: "ec", value: "0xFFFFFFFF" }],
    });
    expect(e.members?.[0].value).toBe("0xFFFFFFFF");
    for (const index of [-1, 6, 1.5])
      expect(() =>
        tr8Request(catalog, {
          action: "team",
          uiLanguage: "en",
          team: "card",
          members: [{ index, property: "ec", value: "1" }],
        }),
      ).toThrow();
    expect(() =>
      tr8Request(catalog, {
        action: "team",
        uiLanguage: "en",
        team: "card",
        members: [{ index: 0, property: "unknown", value: "1" }],
      }),
    ).toThrow();
  });
  it("matches source numeric controls, required hours and date-only start", () => {
    expect(
      tr8Request(catalog, {
        action: "patch",
        fields: [{ key: "bp", value: "" }],
      }).fields?.[0].value,
    ).toBe("");
    for (const fields of [
      [{ key: "bp", value: "10000" }],
      [{ key: "hours", value: "" }],
      [{ key: "hours", value: "65536" }],
      [{ key: "started", value: "2061-01-01" }],
      [{ key: "started", value: "2024-02-30" }],
    ])
      expect(() => tr8Request(catalog, { action: "patch", fields })).toThrow();
    expect(tr8Date(catalog.fields[2], "2060-12-31")).toBe("2060-12-31");
    expect(tr8Date(catalog.fields[3], "2024-02-29T12:34")).toBe(
      "2024-02-29T12:34:00",
    );
    expect(tr8Date(catalog.fields[3], "4095-12-31T23:59:59")).toBe(
      "4095-12-31T23:59:59",
    );
  });
  it("rejects unrelated payload fields and unavailable Diglett, keeping both name targets", () => {
    expect(() =>
      tr8Request(catalog, { action: "resave", team: "card" }),
    ).toThrow();
    expect(() =>
      tr8Request({ ...catalog, canDiglett: false }, { action: "diglett" }),
    ).toThrow();
    for (const nameTarget of ["name", "cardName"] as const)
      expect(
        tr8Request(catalog, {
          action: "trash",
          nameTarget,
          trash: { action: "clear" },
        }).nameTarget,
      ).toBe(nameTarget);
    expect(
      tr8Request(catalog, { action: "fashion", fashion: "legal" }).fashion,
    ).toBe("legal");
    expect(() =>
      tr8Request(catalog, {
        action: "patch",
        fields: [
          { key: "bp", value: "1" },
          { key: "bp", value: "2" },
        ],
      }),
    ).toThrow();
  });
  it("copies frozen requests and refuses stale previews without aliasing drafts", () => {
    const fields = [{ key: "bp", value: "9999" }],
      request = tr8Request(catalog, { action: "patch", fields });
    fields[0].value = "0";
    expect(request.fields?.[0].value).toBe("9999");
    const p = {
      request: { ...request, targetHash: "B".repeat(64) },
      result: { ...catalog, sourceHash: "B".repeat(64) },
      changedOffsets: [1],
      ignoredFields: [],
    };
    const frozen = tr8Frozen(catalog, p);
    p.request.fields![0].value = "1";
    expect(frozen.fields?.[0].value).toBe("9999");
    expect(() => tr8Frozen(catalog, { ...p, result: catalog })).toThrow();
  });
  it("rejects both Unicode control ranges in names without changing ordinary text", () => {
    const c = {
      ...catalog,
      fields: [
        {
          ...catalog.fields[0],
          key: "name",
          kind: "text" as const,
          maxLength: 12,
        },
      ],
    };
    for (const value of ["\n", "\u0085"])
      expect(() =>
        tr8Request(c, { action: "patch", fields: [{ key: "name", value }] }),
      ).toThrow();
    expect(
      tr8Request(c, {
        action: "patch",
        fields: [{ key: "name", value: "朋友" }],
      }).fields?.[0].value,
    ).toBe("朋友");
  });
});
