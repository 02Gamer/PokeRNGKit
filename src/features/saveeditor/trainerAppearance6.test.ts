import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  appearanceDraft,
  resetAppearance,
  validateAppearance,
  type TrainerAppearance6State,
} from "./trainerAppearance6";
import {
  appearanceFieldName,
  appearanceOptionName,
} from "./trainerAppearance6Labels";
import {
  trainerDraft,
  trainerDraftMatches,
  rebaseTrainerDraft,
  validateTrainer,
  type SaveReport,
} from "./domain";
import { emeraldReport } from "./domain.test";

const state: TrainerAppearance6State = {
  nickname: "Old",
  gender: 0,
  fields: [
    { key: "HairColor", value: 7, max: 7, choices: [{ id: 0, name: "Black" }] },
    {
      key: "Freckles",
      value: 0,
      max: 1,
      choices: [
        { id: 0, name: "Off" },
        { id: 1, name: "On" },
      ],
    },
    { key: "Unused2", value: 7, max: 7, choices: [] },
  ],
};
const report: SaveReport = {
  ...emeraldReport,
  format: "SAV6XY",
  trainer: { ...emeraldReport.trainer, appearance6: state },
};
describe("XY trainer appearance", () => {
  it("preserves untouched unknown enum values and validates every changed field", () => {
    const draft = appearanceDraft(state);
    expect(validateAppearance(draft, state)).toBeUndefined();
    expect(
      validateAppearance(
        { ...draft, nickname: "", "fashion.HairColor": "2" },
        state,
      ),
    ).toEqual({ gender: 0, nickname: "", fields: { HairColor: 2 } });
    expect(
      validateAppearance({ ...draft, nickname: "ABCDEFGHIJKL" }, state)
        ?.nickname,
    ).toBe("ABCDEFGHIJKL");
    for (const nickname of ["1234567890123", "A\u0000B", "A\u0085B"])
      expect(() => validateAppearance({ ...draft, nickname }, state)).toThrow(
        "Trainer nickname",
      );
    for (const value of ["", "-1", "8", "1.0", "1e0", "4294967295"])
      expect(() =>
        validateAppearance({ ...draft, "fashion.HairColor": value }, state),
      ).toThrow("Trainer appearance");
    expect(() =>
      validateAppearance({ ...draft, "fashion.Freckles": "2" }, state),
    ).toThrow();
    expect(() =>
      validateAppearance({ ...draft, "fashion.missing": "0" }, state),
    ).toThrow();
    expect(() =>
      validateAppearance({ ...draft, fashionGender: "1" }, state),
    ).toThrow("Reset");
    expect(() =>
      validateAppearance({ ...appearanceDraft(null), nickname: "A" }, null),
    ).toThrow();
    expect(validateAppearance(appearanceDraft(null), null)).toBeUndefined();
    const unusual = { ...state, nickname: "1234567890123" };
    expect(
      validateAppearance(appearanceDraft(unusual), unusual),
    ).toBeUndefined();
  });
  it("integrates appearance with trainer edits and retains stale drafts until explicitly reset", () => {
    const draft = trainerDraft(report);
    expect(
      trainerDraftMatches(
        Object.fromEntries(Object.entries(draft).reverse()) as typeof draft,
        report,
      ),
    ).toBe(true);
    expect(
      trainerDraftMatches({ ...draft, "fashion.HairColor": "2" }, report),
    ).toBe(false);
    expect(
      validateTrainer({ ...draft, "fashion.HairColor": "2" }, report)
        .appearance6?.fields,
    ).toEqual({ HairColor: 2 });
    const female: SaveReport = {
      ...report,
      gender: 1,
      trainer: {
        ...report.trainer,
        appearance6: {
          ...state,
          gender: 1,
          fields: [
            ...state.fields.filter((f) => f.key !== "Unused2"),
            { key: "Unused3", value: 16777215, max: 16777215, choices: [] },
          ],
        },
      },
    };
    const clean = rebaseTrainerDraft(draft, report, female);
    expect(clean.fashionGender).toBe("1");
    expect(clean["fashion.Unused2"]).toBeUndefined();
    expect(validateTrainer(clean, female).appearance6).toBeUndefined();
    expect(trainerDraftMatches(clean, female)).toBe(true);
    const pending = {
      ...draft,
      money: "999",
      nickname: "Pending",
      "fashion.HairColor": "2",
    };
    const stale = rebaseTrainerDraft(pending, report, female);
    expect(stale).toMatchObject({
      fashionGender: "0",
      "fashion.HairColor": "2",
      money: "999",
      nickname: "Pending",
    });
    expect(() => validateTrainer(stale, female)).toThrow("Reset");
    const stillStale = rebaseTrainerDraft(stale, female, {
      ...female,
      money: 50,
    });
    expect(stillStale["fashion.Unused2"]).toBe("7");
    expect(stillStale.fashionGender).toBe("0");
    const reset = resetAppearance(stale, female.trainer.appearance6);
    expect(reset.money).toBe("999");
    expect(reset["fashion.Unused2"]).toBeUndefined();
    expect(validateTrainer(reset, female).appearance6).toBeUndefined();
    const nicknameOnly = rebaseTrainerDraft(
      { ...draft, nickname: "Pending" },
      report,
      female,
    );
    expect(validateTrainer(nicknameOnly, female).appearance6).toMatchObject({
      gender: 1,
      nickname: "Pending",
    });
  });
  it("localizes every named Core appearance enum and property", () => {
    const source = readFileSync(
      "third_party/pkhex/PKHeX.Core/Saves/Substructures/Gen6/TrainerFashion6.cs",
      "utf8",
    );
    const names = [
      ...source.matchAll(/public enum \w+\s*\{([^}]+)\}/g),
    ].flatMap((m) =>
      m[1]
        .split("\n")
        .map((line) => line.trim().split(",")[0].split("//")[0].trim())
        .filter((name) => /^\w+$/.test(name)),
    );
    expect(names.length).toBeGreaterThan(200);
    for (const name of names)
      for (const language of ["zh", "ja"] as const) {
        const translated = appearanceOptionName(name, language);
        expect(translated, `${language}/${name}`).not.toBe(
          name.replaceAll("_", " "),
        );
        expect(translated, `${language}/${name}`).toMatch(
          /[\u3040-\u30ff\u4e00-\u9fff]/u,
        );
      }
    for (const [, key] of source.matchAll(/public \w+ (\w+)\s*\{ get =>/g))
      for (const language of ["zh", "ja"] as const)
        expect(appearanceFieldName(key, language), key).not.toBe(key);
  });
});
