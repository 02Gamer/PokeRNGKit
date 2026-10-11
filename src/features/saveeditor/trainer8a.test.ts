import { describe, it, expect } from "vitest";
import {
  tr8aDate,
  tr8aRequest,
  tr8aFrozen,
  supportsTrainer8a,
  type Tr8aCatalog,
} from "./trainer8a";
const c: Tr8aCatalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  fields: [
    {
      key: "rank",
      name: { zh: "调查队等级", en: "Rank", ja: "ランク" },
      value: "4000000000",
      kind: "number",
      maxLength: 9,
      min: "0",
      max: "999999999",
      choices: [],
      editable: true,
    },
  ],
  ids: { tid: 1, sid: 2, id32: 3, tsv: 0 },
  position: { canEdit: true, fields: [] },
  map: "map",
  nameTrash: "0".repeat(52),
  coordinateRaw: "",
  startedRaw: "",
  savedRaw: "",
  characters: [],
  trashSpecies: [],
  trashLanguages: [],
};
describe("PLA trainer source semantics", () => {
  it("uses timezone-free dates and missing zero seconds", () => {
    expect(tr8aDate("2030-05-06T07:08")).toBe("2030-05-06T07:08:00");
    expect(tr8aDate("2000-02-29T00:00:00")).toBe("2000-02-29T00:00:00");
    for (const text of [
      "2001-02-29T00:00:00",
      "1999-12-31T23:59:59",
      "2100-01-01T00:00:00",
      "2030-05-06T07:08:09Z",
    ])
      expect(() => tr8aDate(text)).toThrow();
  });
  it("allows source 999999999 rank rather than inferred game caps", () => {
    expect(
      tr8aRequest(c, "patch", [{ key: "rank", value: "999999999" }]).fields?.[0]
        .value,
    ).toBe("999999999");
    expect(() =>
      tr8aRequest(c, "patch", [{ key: "rank", value: "1000000000" }]),
    ).toThrow();
  });
  it("permits map-only preview but protects invalid coordinates and IDs", () => {
    expect(
      tr8aRequest(c, "position", [{ key: "map", value: "新地图" }]).fields
        ?.length,
    ).toBe(1);
    expect(() =>
      tr8aRequest(
        { ...c, position: { ...c.position, canEdit: false } },
        "position",
        [{ key: "x", value: "1" }],
      ),
    ).toThrow();
    expect(() =>
      tr8aRequest(c, "position", [{ key: "map", value: "a".repeat(49) }]),
    ).toThrow();
    expect(() =>
      tr8aRequest(c, "ids", [
        { key: "tid", value: "1" },
        { key: "sid", value: "abc" },
      ]),
    ).toThrow();
  });
  it("binds frozen full source/target and only PLA format", () => {
    const request = { ...tr8aRequest(c, "resave"), targetHash: "B".repeat(64) },
      p = {
        request,
        result: { ...c, sourceHash: request.targetHash },
        changedOffsets: [],
        ignoredFields: [],
      };
    expect(tr8aFrozen(c, p)).toEqual(request);
    expect(() => tr8aFrozen(c, { ...p, result: c })).toThrow();
    expect(supportsTrainer8a("SAV8LA")).toBe(true);
    expect(supportsTrainer8a("SAV8BS")).toBe(false);
  });
});
