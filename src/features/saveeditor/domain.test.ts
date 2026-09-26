import { describe, expect, it } from "vitest";
import {
  exportSaveName,
  saveGameChoices,
  trainerDraft,
  rebaseTrainerDraft,
  changeTrainerCountry,
  validateTrainer,
  validateSaveRecord,
  parsePokemonHex,
  type SaveReport,
} from "./domain";

export const emeraldReport: SaveReport = {
  apiVersion: 39,
  trainer: {
    canRecords: false,
    currencies: [],
    badges: { count: 8, value: 0 },
    geography: null,
    languages: [],
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
  it("uses the save-specific language catalog and rebases language on undo", () => {
    const report = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        languages: [
          { id: 2, name: { zh: "英语", en: "English", ja: "英語" } },
          { id: 9, name: { zh: "简体中文", en: "Chinese", ja: "中国語" } },
        ],
      },
    };
    expect(
      validateTrainer({ ...trainerDraft(report), language: "9" }, report)
        .language,
    ).toBe(9);
    for (const language of ["", "6", "11", "2.5"])
      expect(() =>
        validateTrainer({ ...trainerDraft(report), language }, report),
      ).toThrow();
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), language: "9" },
        emeraldReport,
      ),
    ).toThrow();
    const unusual = { ...report, language: 0 };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).language,
    ).toBeUndefined();
    const changed = { ...report, language: 9 };
    expect(
      rebaseTrainerDraft(trainerDraft(changed), changed, report).language,
    ).toBe("2");
  });
  it("validates trainer geography and preserves coupled drafts on undo", () => {
    const choice = (id: number) => ({
      id,
      name: { zh: `Z${id}`, en: `E${id}`, ja: `J${id}` },
    });
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        geography: {
          value: { country: 1, region: 2, consoleRegion: 0 },
          countries: [0, 1, 2].map(choice),
          regions: [
            { country: 1, choices: [0, 2].map(choice) },
            { country: 2, choices: [0, 7].map(choice) },
          ],
          consoles: [0, 1, 2, 4, 5, 6].map(choice),
        },
      },
    };
    const draft = trainerDraft(report);
    const changed = changeTrainerCountry(draft, report, "2");
    expect(changed).toMatchObject({ country: "2", region: "7" });
    expect(validateTrainer(changed, report)).toMatchObject({
      country: 2,
      region: 7,
    });
    expect(changeTrainerCountry(draft, report, "0")).toMatchObject({
      country: "0",
      region: "2",
    });
    for (const patch of [
      { country: "" },
      { country: "255" },
      { region: "7" },
      { region: "256" },
      { consoleRegion: "3" },
      { consoleRegion: "1.5" },
    ])
      expect(() => validateTrainer({ ...draft, ...patch }, report)).toThrow(
        /geography/,
      );
    const unusual: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        geography: {
          ...report.trainer.geography!,
          value: { country: 255, region: 255, consoleRegion: 255 },
        },
      },
    };
    expect(validateTrainer(trainerDraft(unusual), unusual)).not.toHaveProperty(
      "country",
    );
    expect(
      validateTrainer(
        { ...trainerDraft(unusual), consoleRegion: "0" },
        unusual,
      ),
    ).toMatchObject({ consoleRegion: 0 });
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), country: "1" },
        emeraldReport,
      ),
    ).toThrow(/geography/);
    const after: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        geography: {
          ...report.trainer.geography!,
          value: { country: 2, region: 7, consoleRegion: 1 },
        },
      },
    };
    expect(rebaseTrainerDraft(draft, report, after)).toMatchObject({
      country: "2",
      region: "7",
      consoleRegion: "1",
    });
    expect(
      rebaseTrainerDraft({ ...draft, region: "0" }, report, after),
    ).toMatchObject({ country: "1", region: "0", consoleRegion: "1" });
  });
  it("validates badge masks by save format and rebases applied selections", () => {
    const draft = trainerDraft(emeraldReport);
    for (const badges of ["0", "1", "128", "255"])
      expect(() =>
        validateTrainer({ ...draft, badges }, emeraldReport),
      ).not.toThrow();
    for (const badges of ["", "-1", "1.5", "256"])
      expect(() =>
        validateTrainer({ ...draft, badges }, emeraldReport),
      ).toThrow(/badges/);
    const hg: SaveReport = {
      ...emeraldReport,
      trainer: { ...emeraldReport.trainer, badges: { count: 16, value: 0 } },
    };
    expect(
      validateTrainer({ ...trainerDraft(hg), badges: "65535" }, hg).badges,
    ).toBe(65535);
    expect(() =>
      validateTrainer({ ...trainerDraft(hg), badges: "65536" }, hg),
    ).toThrow(/badges/);
    const unsupported: SaveReport = {
      ...emeraldReport,
      trainer: { ...emeraldReport.trainer, badges: null },
    };
    expect(() =>
      validateTrainer(
        { ...trainerDraft(unsupported), badges: "0" },
        unsupported,
      ),
    ).toThrow(/badges/);
    const changed: SaveReport = {
      ...emeraldReport,
      trainer: { ...emeraldReport.trainer, badges: { count: 8, value: 128 } },
    };
    expect(
      rebaseTrainerDraft(trainerDraft(changed), changed, emeraldReport).badges,
    ).toBe("0");
    expect(
      rebaseTrainerDraft(
        { ...trainerDraft(changed), badges: "255" },
        changed,
        emeraldReport,
      ).badges,
    ).toBe("255");
  });
  it("validates supported currency fields and preserves unchanged abnormal balances", () => {
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        currencies: [
          { key: "bp", value: 5, max: 9999 },
          { key: "pokeMiles", value: 50, max: 9999999 },
        ],
      },
    };
    const draft = trainerDraft(report);
    expect(
      validateTrainer({ ...draft, bp: "9999", pokeMiles: "9999999" }, report)
        .currencies,
    ).toEqual({ bp: 9999, pokeMiles: 9999999 });
    for (const bp of ["", "-1", "2.5", "10000"])
      expect(() => validateTrainer({ ...draft, bp }, report)).toThrow(
        /currency/,
      );
    expect(() => validateTrainer({ ...draft, watts: "1" }, report)).toThrow(
      /currency/,
    );
    expect(validateTrainer(draft, report).currencies).toBeUndefined();
    const unusual: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        currencies: [{ key: "bp", value: 65535, max: 9999 }],
      },
    };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).currencies,
    ).toBeUndefined();
    expect(rebaseTrainerDraft(trainerDraft(unusual), unusual, report).bp).toBe(
      "5",
    );
    expect(
      rebaseTrainerDraft(
        { ...trainerDraft(unusual), bp: "123" },
        unusual,
        report,
      ).bp,
    ).toBe("123");
  });
  it("validates game record input using its dynamic upper boundary", () => {
    const entry = {
      index: 100,
      name: "100",
      value: 15000,
      max: 15000,
      normalMax: 9999,
      offset: 400,
      timeHint: null,
    };
    expect(validateSaveRecord(entry, "14000")).toEqual({
      index: 100,
      value: 14000,
    });
    expect(validateSaveRecord(entry, "0").value).toBe(0);
    for (const text of ["", "-1", "1.5", "15001", "9007199254740993"])
      expect(() => validateSaveRecord(entry, text)).toThrow();
  });
  it("always exports a distinct filename", () => {
    expect(exportSaveName("main")).toBe("edited-main");
    expect(exportSaveName("../trainer.sav")).toBe("edited-.._trainer.sav");
  });
});
