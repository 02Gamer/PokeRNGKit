// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  textTrashConfirmation,
  validateTextTrashCatalog,
  validateTextTrashRequest,
  type TextTrashCatalog,
  type TextTrashTarget,
  type TextTrashTicket,
} from "./textTrash";
import { textTrashCharacterLabel } from "./textTrashWords";

const sourceHash = "A".repeat(64),
  targetHash = "B".repeat(64);
function catalog(): TextTrashCatalog {
  return {
    sourceHash,
    format: "PK6",
    generation: 6,
    canEdit: true,
    field: "nickname",
    storedText: "A",
    storedHex: "41000000",
    draft: {
      field: "nickname",
      initialText: "A",
      text: "A",
      hex: "41000000",
      maxLength: 12,
      characters: [0xe08d],
    },
    species: [
      { id: 25, name: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" } },
    ],
    languages: [{ id: 2, name: { zh: "英语", en: "English", ja: "英語" } }],
  };
}
const target: TextTrashTarget = {
  kind: "file",
  field: "nickname",
  box: 0,
  slot: 0,
  fileName: "entity.pk6",
  inputEncrypted: false,
  useFileFormat: true,
};
function ticket(): TextTrashTicket {
  const before = catalog(),
    result = structuredClone(before);
  result.sourceHash = targetHash;
  result.storedText = "B";
  result.storedHex = "42000000";
  result.draft.text = "B";
  result.draft.hex = result.storedHex;
  return {
    token: "text-trash:1",
    sourceHash,
    targetHash,
    target: structuredClone(target),
    before,
    result,
    changedNameBytes: [0],
    changedBytes: 3,
  };
}
describe("name byte source requests and frozen confirmation", () => {
  it("keeps legacy glyph codes distinct while displaying source meanings in each language", () => {
    expect(textTrashCharacterLabel(0xe081, 6, "zh")).toBe("全宽平静");
    expect(textTrashCharacterLabel(0xe081, 7, "zh")).toBe("全宽开心");
    expect(textTrashCharacterLabel(0x2460, 5, "en")).toBe("Full Neutral");
    expect(textTrashCharacterLabel(0xe09f, 6, "ja")).toBe("半角平常");
    expect(textTrashCharacterLabel(0xe08d, 6, "zh")).toBe("…");
    expect(textTrashCharacterLabel(0xe09e, 7, "ja")).toBe("☃");
  });
  it("keeps source events ordered and copies every mutable input", () => {
    const c = catalog(),
      events = [
        { kind: "text", text: "B" },
        { kind: "byte", index: 3, value: 255 },
        {
          kind: "layer",
          species: 25,
          language: 2,
          generation: 100,
          uiLanguage: "zh",
        },
      ] as const;
    const request = validateTextTrashRequest(c, target, "A", [...events]);
    expect(request.events.map((v) => v.kind)).toEqual([
      "text",
      "byte",
      "layer",
    ]);
    expect(request.target).not.toBe(target);
    expect(request.events[0]).not.toBe(events[0]);
    expect(c).toEqual(catalog());
  });
  it("rejects byte/resource/character/layer/text limits before JSON encoding", () => {
    const c = catalog();
    expect(() =>
      validateTextTrashRequest({ ...c, canEdit: false }, target, "A", []),
    ).toThrow();
    for (const event of [
      { kind: "byte", index: -1, value: 0 },
      { kind: "byte", index: 4, value: 0 },
      { kind: "byte", index: 0, value: NaN },
      { kind: "character", value: 0 },
      {
        kind: "layer",
        species: 25,
        language: 2,
        generation: 101,
        uiLanguage: "zh",
      },
      { kind: "text", text: "A".repeat(13) },
    ] as const)
      expect(() => validateTextTrashRequest(c, target, "A", [event])).toThrow();
    expect(() =>
      validateTextTrashRequest(
        c,
        target,
        "A",
        Array.from({ length: 513 }, () => ({ kind: "clear" })),
      ),
    ).toThrow();
    expect(() =>
      validateTextTrashCatalog({ ...c, draft: { ...c.draft, hex: "41" } }),
    ).toThrow();
  });
  it("requires complete stored-byte differences and binds all seven target fields", () => {
    const c = catalog(),
      t = ticket();
    expect(textTrashConfirmation(c, target, t).target).toEqual(target);
    for (const changed of [
      { kind: "save" },
      { field: "originalTrainer" },
      { box: 1 },
      { slot: 1 },
      { fileName: "other.pk6" },
      { inputEncrypted: true },
      { useFileFormat: false },
    ] as const)
      expect(() =>
        textTrashConfirmation(c, target, {
          ...t,
          target: { ...target, ...changed },
        }),
      ).toThrow();
    for (const changed of [
      { sourceHash: targetHash },
      { targetHash: sourceHash },
      { changedNameBytes: [] },
      { changedNameBytes: [0, 0] },
      { changedBytes: -1 },
    ])
      expect(() =>
        textTrashConfirmation(c, target, { ...t, ...changed }),
      ).toThrow();
  });
});
