import { describe, it, expect } from "vitest";
import {
  tr8bLocalDate,
  tr8bOffsetDate,
  tr8bRequest,
  tr8bFrozen,
  supportsTrainer8b,
  type Tr8bCatalog,
} from "./trainer8b";
import { emeraldReport } from "./domain.test";
const c: Tr8bCatalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  fields: [
    {
      key: "money",
      name: { zh: "金钱", en: "Money", ja: "金" },
      value: "10",
      kind: "number",
      maxLength: 7,
      min: "0",
      max: "9999999",
      choices: [],
      editable: true,
    },
  ],
  ids: { tid: 1, sid: 2, id32: 3, tsv: 0 },
  existing: emeraldReport.trainer,
  nameTrash: "0".repeat(52),
  rivalTrash: "0".repeat(52),
  startTicks: "0",
  savedTicks: "0",
  recordAddRaw: "",
  characters: [],
  trashSpecies: [],
  trashLanguages: [],
};
describe("BDSP trainer extension", () => {
  it("round trips browser local wall time with explicit timezone offset", () => {
    const local = tr8bLocalDate("2030-01-02T03:04:05Z"),
      wire = tr8bOffsetDate(local);
    expect(new Date(wire).toISOString()).toBe("2030-01-02T03:04:05.000Z");
    expect(() => tr8bOffsetDate("2030-02-31T00:00:00")).toThrow();
    expect(tr8bOffsetDate("2030-01-02T00:00")).toMatch(
      /^2030-01-02T00:00:00[+-]/,
    );
  });
  it("uses source input width and frozen full source/target", () => {
    expect(
      tr8bRequest(c, "patch", [{ key: "money", value: "9999999" }]).fields?.[0]
        .value,
    ).toBe("9999999");
    for (const fields of [
      [{ key: "money", value: "10000000" }],
      [{ key: "money", value: "-1" }],
      [{ key: "other", value: "1" }],
    ])
      expect(() => tr8bRequest(c, "patch", fields)).toThrow();
    const request = { ...tr8bRequest(c, "resave"), targetHash: "B".repeat(64) },
      p = {
        request,
        result: { ...c, sourceHash: request.targetHash },
        changedOffsets: [],
      };
    expect(tr8bFrozen(c, p)).toEqual(request);
    expect(() => tr8bFrozen(c, { ...p, result: c })).toThrow();
    expect(supportsTrainer8b("SAV8BS")).toBe(true);
    expect(supportsTrainer8b("SAV8SWSH")).toBe(false);
  });
});
