import { describe, expect, it } from "vitest";
import {
  exportSaveName,
  saveGameChoices,
  trainerDraft,
  validateTrainer,
  type SaveReport,
} from "./domain";

export const emeraldReport: SaveReport = {
  apiVersion: 2,
  format: "SAV3E",
  generation: 3,
  version: "E",
  ot: "TEST",
  tid: 12345,
  sid: 54321,
  displayTid: 12345,
  displaySid: 54321,
  language: 2,
  gender: 0,
  money: 10,
  maxMoney: 999999,
  maxNameLength: 7,
  boxCount: 14,
  partyCount: 1,
  playTime: "1:00:00",
  checksumsValid: true,
  canEdit: true,
  extension: ".sav",
  nationalDex: null,
  pokemon: [],
};

describe("save editor boundaries", () => {
  it("rejects blanks, exponent notation, overflow and negative IDs", () => {
    for (const value of ["", "65536", "-1", "1e3", "12.5", " 1"]) {
      expect(() =>
        validateTrainer(
          { ...trainerDraft(emeraldReport), tid: value },
          emeraldReport,
        ),
      ).toThrow();
    }
    expect(
      validateTrainer(
        { ...trainerDraft(emeraldReport), tid: "65535", sid: "0" },
        emeraldReport,
      ),
    ).toMatchObject({ tid: 65535, sid: 0 });
  });
  it("uses per-save money and name limits", () => {
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), money: "1000000" },
        emeraldReport,
      ),
    ).toThrow();
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), ot: "ABCDEFGH" },
        emeraldReport,
      ),
    ).toThrow();
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), ot: "A\nB" },
        emeraldReport,
      ),
    ).toThrow();
    expect(() =>
      validateTrainer(trainerDraft(emeraldReport), {
        ...emeraldReport,
        canEdit: false,
      }),
    ).toThrow();
  });
  it("does not silently choose a game for grouped save versions", () => {
    expect(saveGameChoices({ ...emeraldReport, version: "RS" })).toEqual([
      "ruby",
      "sapphire",
    ]);
    expect(
      saveGameChoices({ ...emeraldReport, format: "SAV3XD", version: "CXD" }),
    ).toEqual(["xd"]);
    expect(saveGameChoices({ ...emeraldReport, version: "SL" })).toEqual([]);
  });
  it("always exports a distinct filename", () => {
    expect(exportSaveName("main")).toBe("edited-main");
    expect(exportSaveName("../trainer.sav")).toBe("edited-.._trainer.sav");
  });
});
