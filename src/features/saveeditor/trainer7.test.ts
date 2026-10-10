import { describe, expect, it } from "vitest";
import {
  supportsTrainer7,
  tr7Action,
  tr7Fashion,
  tr7Frozen,
  tr7Ids,
  tr7Patch,
  tr7Position,
  tr7Trash,
  type Tr7Catalog,
} from "./trainer7";
import { localizeSaveError, saveEditorResources } from "./locales";
import { trainer7Words } from "./trainer7Words";
const name = { zh: "训练家", en: "Trainer", ja: "トレーナー" };
const hash = "A".repeat(64);
function catalog(): Tr7Catalog {
  return {
    canEdit: true,
    sourceHash: hash,
    existing: {} as Tr7Catalog["existing"],
    basics: { name: "TEST", tid: 1, sid: 2, money: 3, gender: 0 },
    nameTrash: "00".repeat(26),
    characters: [65],
    trashSpecies: [{ id: 25, name }],
    trashLanguages: [{ id: 2, name }],
    ids: { tid: 1, sid: 2, id32: 2000001, tsv: 1 },
    position: {
      canEdit: true,
      fields: [
        {
          key: "x",
          value: "1",
          display: "1.000000",
          min: "-99999999",
          max: "99999999",
          places: 6,
        },
      ],
    },
    fields: [
      {
        key: "SnapCount",
        group: "finder",
        name,
        value: "0",
        kind: "number",
        min: 0,
        max: 9999999,
        maxLength: 32767,
        choices: [],
        editable: true,
      },
      {
        key: "Skin",
        group: "appearance",
        name,
        value: "0",
        kind: "choice",
        min: 0,
        max: 7,
        maxLength: 32767,
        choices: [0, 1, 2].map((id) => ({ id, name })),
        editable: true,
      },
      {
        key: "PlazaName",
        group: "other",
        name,
        value: "",
        kind: "text",
        min: 0,
        max: 0,
        maxLength: 20,
        choices: [],
        editable: true,
      },
      {
        key: "AlolaTime",
        group: "other",
        name,
        value: "9999999",
        kind: "choice",
        min: 3600,
        max: 86400,
        maxLength: 32767,
        choices: [{ id: 86400, name }],
        editable: false,
      },
    ],
  };
}
describe("Trainer7", () => {
  it("gates by physical layout", () => {
    expect(supportsTrainer7("SAV7SM")).toBe(true);
    expect(supportsTrainer7("SAV7USUM")).toBe(true);
    expect(supportsTrainer7("SAV7b")).toBe(false);
  });
  it("rejects stale, unknown, duplicate, hidden and out of range patches", () => {
    const c = catalog();
    for (const fields of [
      [{ key: "bad", value: "1" }],
      [{ key: "SnapCount", value: "10000000" }],
      [{ key: "SnapCount", value: "1.5" }],
      [{ key: "AlolaTime", value: "86400" }],
      [
        { key: "SnapCount", value: "1" },
        { key: "SnapCount", value: "2" },
      ],
    ])
      expect(() => tr7Patch(c, fields)).toThrow();
    expect(() =>
      tr7Patch({ ...c, canEdit: false }, [{ key: "SnapCount", value: "0" }]),
    ).toThrow();
    expect(
      tr7Patch(c, [{ key: "SnapCount", value: "9999999" }]).fields?.[0].value,
    ).toBe("9999999");
  });
  it("requires explicit changed gender/skin mismatch confirmation", () => {
    const c = catalog();
    expect(() => tr7Patch(c, [{ key: "Skin", value: "1" }])).toThrow();
    expect(
      tr7Patch(c, [{ key: "Skin", value: "1" }], true).allowMismatchedSkin,
    ).toBe(true);
    c.fields[1].value = "1";
    expect(() => tr7Patch(c, [{ key: "Skin", value: "1" }])).not.toThrow();
  });
  it("preserves empty text and protects text width", () => {
    const c = catalog();
    expect(
      tr7Patch(c, [{ key: "PlazaName", value: "" }]).fields?.[0].value,
    ).toBe("");
    expect(() =>
      tr7Patch(c, [{ key: "PlazaName", value: "a".repeat(21) }]),
    ).toThrow();
    expect(() => tr7Patch(c, [{ key: "PlazaName", value: "\n" }])).toThrow();
  });
  it("retains source ID mask strings, including empty and overflowing pairs", () => {
    const c = catalog();
    for (const [tid, sid] of [
      ["", ""],
      ["999999", "9999"],
      ["967296", "4294"],
    ])
      expect(tr7Ids(c, tid, sid).fields).toEqual([
        { key: "tid", value: tid },
        { key: "sid", value: sid },
      ]);
    for (const [tid, sid] of [
      ["1000000", "0"],
      ["0", "10000"],
      ["-1", "0"],
    ])
      expect(() => tr7Ids(c, tid, sid)).toThrow();
  });
  it("sends coordinate raw text to source parser and rejects unknown or disabled fields", () => {
    const c = catalog();
    expect(
      tr7Position(c, "ja", [{ key: "x", value: "" }]).fields?.[0].value,
    ).toBe("");
    expect(() => tr7Position(c, "en", [{ key: "z", value: "1" }])).toThrow();
    expect(() =>
      tr7Position({ ...c, position: { ...c.position, canEdit: false } }, "zh", [
        { key: "x", value: "1" },
      ]),
    ).toThrow();
  });
  it("validates trash layer source choices and action ownership", () => {
    const c = catalog();
    expect(tr7Trash(c, { action: "text", text: "" }).trash?.text).toBe("");
    expect(() =>
      tr7Trash(c, {
        action: "layer",
        species: 25,
        language: 2,
        generation: 7,
        uiLanguage: "ja",
      }),
    ).not.toThrow();
    expect(() =>
      tr7Trash(c, {
        action: "layer",
        species: 999,
        language: 2,
        generation: 7,
        uiLanguage: "ja",
      }),
    ).toThrow();
    expect(() => tr7Trash(c, { action: "clear", text: "X" })).toThrow();
  });
  it("freezes complete target and gates fashion by gender", () => {
    const c = catalog(),
      target = "B".repeat(64);
    const request = { ...tr7Action(c, "resave"), targetHash: target };
    expect(
      tr7Frozen(c, {
        request,
        result: { ...c, sourceHash: target },
        changedOffsets: [1],
        ignoredFields: [],
      }),
    ).toEqual(request);
    expect(() =>
      tr7Frozen(c, {
        request,
        result: c,
        changedOffsets: [],
        ignoredFields: [],
      }),
    ).toThrow();
    expect(tr7Fashion(c, "legal").fashion).toBe("legal");
    expect(() =>
      tr7Fashion({ ...c, basics: { ...c.basics, gender: 255 } }, "all"),
    ).toThrow();
  });
  it("localizes errors in all UI languages", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveError("Trainer7 invalid", saveEditorResources[lang]),
      ).toBe(trainer7Words[lang].invalid);
      expect(
        localizeSaveError("Trainer7 preview stale", saveEditorResources[lang]),
      ).toBe(trainer7Words[lang].stale);
    }
  });
});
