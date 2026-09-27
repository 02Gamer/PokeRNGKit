import { describe, expect, it } from "vitest";
import {
  boxImportHasSkipped,
  boxImportWords,
  type BoxImportTicket,
} from "./boxImport";
import { localizeSaveError, saveEditorResources } from "./locales";

describe("box import confirmation", () => {
  const ticket: BoxImportTicket = {
    token: "import:1",
    sources: [{ file: 0, entry: 0 }],
    files: [{ file: 0, path: "one.pk3", status: "ready", entities: 1 }],
    summary: {
      written: 1,
      deleted: 0,
      overwritten: 0,
      outcomes: [
        { source: 0, box: 0, slot: 0, status: "protected" },
        { source: 0, box: 0, slot: 1, status: "written" },
      ],
    },
  };
  it("does not count a protected slot as a lost input when its entity is written elsewhere", () => {
    expect(boxImportHasSkipped(ticket)).toBe(false);
  });
  it("requires confirmation for either a file failure or an entity that could not fit", () => {
    expect(
      boxImportHasSkipped({
        ...ticket,
        files: [{ ...ticket.files[0], status: "decodeFailed" }],
      }),
    ).toBe(true);
    expect(
      boxImportHasSkipped({
        ...ticket,
        summary: {
          ...ticket.summary,
          outcomes: [{ source: 0, box: -1, slot: -1, status: "full" }],
        },
      }),
    ).toBe(true);
  });
  it("provides matching three-language states and localized session errors", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(Object.keys(boxImportWords[lang].states)).toEqual(
        Object.keys(boxImportWords.en.states),
      );
      expect(
        localizeSaveError(
          "Box import preview is missing or replaced.",
          saveEditorResources[lang],
        ),
      ).toBe(boxImportWords[lang].error);
    }
  });
});
