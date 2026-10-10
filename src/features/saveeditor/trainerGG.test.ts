import { describe, expect, it } from "vitest";
import { localizeSaveError, saveEditorResources } from "./locales";
import { trainerGGWords } from "./trainerGGWords";
import {
  ggAction,
  ggChangedParkSlots,
  ggDelete,
  ggFrozen,
  ggIds,
  ggImport,
  ggPatch,
  ggPosition,
  ggTrash,
  supportsTrainerGG,
  type TrGGCatalog,
} from "./trainerGG";
const name = { zh: "训练家", en: "Trainer", ja: "トレーナー" };
function catalog(): TrGGCatalog {
  return {
    canEdit: true,
    sourceHash: "A".repeat(64),
    fields: [
      {
        key: "money",
        name,
        value: "1",
        kind: "number",
        maxLength: 7,
        min: "0",
        max: "9999999",
        choices: [],
        editable: true,
      },
      {
        key: "hours",
        name,
        value: "1",
        kind: "number",
        maxLength: 5,
        min: "0",
        max: "65535",
        choices: [],
        editable: true,
      },
      {
        key: "rival",
        name,
        value: "RIVAL",
        kind: "text",
        maxLength: 12,
        min: "",
        max: "",
        choices: [],
        editable: true,
      },
      {
        key: "started",
        name,
        value: "2020-01-01T00:00:00",
        kind: "date",
        maxLength: 19,
        min: "2000-01-01T00:00:00",
        max: "2099-12-31T23:59:59",
        choices: [],
        editable: true,
      },
    ],
    ids: { tid: 1, sid: 2, id32: 2000001, tsv: 1 },
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
    nameTrash: "00".repeat(26),
    rivalTrash: "00".repeat(26),
    characters: [65],
    trashSpecies: [{ id: 25, name }],
    trashLanguages: [{ id: 2, name }],
    park: [],
    titleCount: 0,
  };
}
describe("TrainerGG input and frozen operations", () => {
  it("uses active-language messages for new operations", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveError("TrainerGG invalid", saveEditorResources[lang]),
      ).toBe(trainerGGWords[lang].invalid);
      expect(
        localizeSaveError("TrainerGG preview stale", saveEditorResources[lang]),
      ).toBe(trainerGGWords[lang].stale);
    }
  });
  it("includes raw-only GP1 changes and excludes adjacent blocks/checksums", () => {
    expect(
      ggChangedParkSlots([
        0x4e1ff,
        0x4e200,
        0x4e201,
        0x4e200 + 432,
        0x4e200 + 432000 - 1,
        0x4e200 + 432000,
        0xb8600,
      ]),
    ).toEqual([0, 1, 999]);
  });
  it("uses the actual LGPE container", () => {
    expect(supportsTrainerGG("SAV7b")).toBe(true);
    expect(supportsTrainerGG("SAV7SM")).toBe(false);
  });
  it("keeps money empty zero but rejects empty hours and excessive mask width", () => {
    const c = catalog();
    expect(ggPatch(c, [{ key: "money", value: "" }]).fields?.[0].value).toBe(
      "",
    );
    for (const row of [
      { key: "hours", value: "" },
      { key: "money", value: "10000000" },
      { key: "money", value: "1.5" },
    ])
      expect(() => ggPatch(c, [row])).toThrow();
  });
  it("checks exact calendar dates without local timezone conversion", () => {
    const c = catalog();
    expect(() =>
      ggPatch(c, [{ key: "started", value: "2099-12-31T23:59:59" }]),
    ).not.toThrow();
    for (const value of [
      "2023-02-29T00:00:00",
      "2020-13-01T00:00:00",
      "2100-01-01T00:00:00",
    ])
      expect(() => ggPatch(c, [{ key: "started", value }])).toThrow();
  });
  it("retains full UInt64 coordinate text", () => {
    const c = catalog();
    expect(
      ggPosition(c, [{ key: "map", value: "18446744073709551615" }], "ja")
        .fields?.[0].value,
    ).toBe("18446744073709551615");
    expect(() =>
      ggPosition(
        { ...c, position: { ...c.position, canEdit: false } },
        [{ key: "map", value: "0" }],
        "en",
      ),
    ).toThrow();
  });
  it("keeps source six/four digit ID masks", () => {
    const c = catalog();
    expect(ggIds(c, "999999", "4294").fields).toHaveLength(2);
    expect(() => ggIds(c, "1000000", "0")).toThrow();
  });
  it("bounds all 1000 GP1 slots and separates single/batch actions", () => {
    const c = catalog(),
      files = [{ name: "a.gp1", data: "AA==" }];
    expect(ggDelete(c, 999).index).toBe(999);
    expect(() => ggDelete(c, 1000)).toThrow();
    expect(ggImport(c, 0, files, true).action).toBe("parkBatch");
    expect(() => ggImport(c, 0, [...files, ...files])).toThrow();
    expect(() => ggImport(c, -1, files)).toThrow();
  });
  it("owns both name trash targets and checks raw widths", () => {
    const c = catalog();
    expect(ggTrash(c, "rival", { action: "text", text: "" }).nameTarget).toBe(
      "rival",
    );
    expect(() => ggTrash(c, "name", { action: "hex", hex: "00" })).toThrow();
    expect(() => ggTrash(c, "rival", { action: "clear", text: "x" })).toThrow();
  });
  it("freezes exact source and target", () => {
    const c = catalog(),
      target = "B".repeat(64),
      request = { ...ggAction(c, "titles"), targetHash: target };
    expect(
      ggFrozen(c, {
        request,
        result: { ...c, sourceHash: target },
        changedOffsets: [1],
        ignoredFields: [],
        receipt: null,
      }),
    ).toEqual(request);
    expect(() =>
      ggFrozen(c, {
        request,
        result: c,
        changedOffsets: [],
        ignoredFields: [],
        receipt: null,
      }),
    ).toThrow();
    expect(() => ggAction({ ...c, canEdit: false }, "fashion")).toThrow();
  });
});
