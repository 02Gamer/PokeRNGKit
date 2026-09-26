import { describe, expect, it } from "vitest";
import {
  exportSaveName,
  saveGameChoices,
  trainerDraft,
  rebaseTrainerDraft,
  validateTrainer,
  parsePokemonHex,
  type SaveReport,
} from "./domain";

export const emeraldReport: SaveReport = {
  apiVersion: 34,
  trainer: {
    canGender: true,
    canPlayTime: true,
    hours: 1,
    minutes: 2,
    seconds: 3,
  },
  attributeChoices: { natures: [], items: [], species: [] },
  boxSlotCount: 30,
  boxes: [],
  boxOptions: { canName: false, nameLength: 8, wallpapers: [] },
  moveChoices: [],
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
  it("parses unsigned 32-bit hexadecimal values without truncation", () => {
    expect(parsePokemonHex("00000000")).toBe(0);
    expect(parsePokemonHex("ffffffff")).toBe(4294967295);
    expect(parsePokemonHex("ABCDEF01")).toBe(0xabcdef01);
    for (const value of ["", "100000000", "-1", "0x12", " 12", "12.3", "GG"])
      expect(() => parsePokemonHex(value)).toThrow();
  });
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
  it("validates changed time fields without rewriting unusual original values", () => {
    const unusual = {
      ...emeraldReport,
      gender: 2,
      trainer: { ...emeraldReport.trainer, minutes: 255 },
    };
    expect(validateTrainer(trainerDraft(unusual), unusual)).toMatchObject({
      gender: undefined,
      minutes: undefined,
    });
    const edit = validateTrainer(
      {
        ...trainerDraft(emeraldReport),
        gender: "1",
        hours: "65535",
        minutes: "99",
        seconds: "60",
      },
      emeraldReport,
    );
    expect(edit).toMatchObject({
      gender: 1,
      hours: 65535,
      minutes: 99,
      seconds: 60,
    });
    for (const [key, value] of [
      ["gender", "2"],
      ["hours", "65536"],
      ["minutes", "100"],
      ["seconds", "-1"],
      ["hours", ""],
    ])
      expect(() =>
        validateTrainer(
          { ...trainerDraft(emeraldReport), [key]: value },
          emeraldReport,
        ),
      ).toThrow();
  });
  it("rebases applied trainer values on undo and retains independent drafts", () => {
    const changed = {
      ...emeraldReport,
      ot: "NEW",
      gender: 1,
      trainer: { ...emeraldReport.trainer, hours: 20 },
    };
    expect(
      rebaseTrainerDraft(trainerDraft(changed), changed, emeraldReport),
    ).toEqual(trainerDraft(emeraldReport));
    const pending = { ...trainerDraft(changed), money: "999", seconds: "45" };
    expect(rebaseTrainerDraft(pending, changed, emeraldReport)).toEqual({
      ...trainerDraft(emeraldReport),
      money: "999",
      seconds: "45",
    });
  });
  it("always exports a distinct filename", () => {
    expect(exportSaveName("main")).toBe("edited-main");
    expect(exportSaveName("../trainer.sav")).toBe("edited-.._trainer.sav");
  });
});
