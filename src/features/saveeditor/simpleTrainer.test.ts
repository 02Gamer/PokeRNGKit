import { describe, expect, it } from "vitest";
import {
  simpleTrainerDraft,
  validateSimpleTrainerExtra,
  type SimpleTrainerExtra,
} from "./simpleTrainer";
const state: SimpleTrainerExtra = {
  coins: 123,
  friendship: 200,
  beachScore: 456,
  hours: 12,
  minutes: 34,
  seconds: 56,
  badges: { count: 8, value: 1 },
  options: { textSpeed: 3, battleStyle: 0, sound: 0, battleEffects: 1 },
};
describe("simple trainer source bounds", () => {
  it("preserves unchanged old values and only submits supported changes", () => {
    const old = { ...state, minutes: 255, hours: 70000 };
    const draft = simpleTrainerDraft(old);
    expect(validateSimpleTrainerExtra(draft, old, 9999, 1)).toEqual({});
    expect(
      validateSimpleTrainerExtra(
        { ...draft, coins: "9999", sound: "3", minutes: "99", hours: "65535" },
        old,
        9999,
        1,
      ),
    ).toEqual({
      coins: 9999,
      hours: 65535,
      minutes: 99,
      options: { sound: 3 },
    });
    expect(old.hours).toBe(70000);
  });
  it.each([
    ["coins", "10000"],
    ["friendship", "256"],
    ["beachScore", "10000"],
    ["badges", "256"],
    ["hours", "65536"],
    ["minutes", "100"],
    ["seconds", "100"],
    ["sound", "4"],
    ["textSpeed", "8"],
    ["coins", "1e3"],
    ["coins", ""],
    ["coins", "-1"],
    ["coins", "1.1"],
    ["coins", " 1"],
  ])("rejects %s=%s without changing the original", (key, value) => {
    const snapshot = JSON.stringify(state);
    expect(() =>
      validateSimpleTrainerExtra(
        { ...simpleTrainerDraft(state), [key]: value },
        state,
        9999,
        1,
      ),
    ).toThrow();
    expect(JSON.stringify(state)).toBe(snapshot);
  });
  it("keeps Gen II's 16 badge bits, stereo index, and Yellow-only ownership", () => {
    const gold = {
      ...state,
      friendship: null,
      beachScore: null,
      badges: { count: 16, value: 0 },
    };
    const draft = simpleTrainerDraft(gold);
    expect(draft).not.toHaveProperty("friendship");
    expect(
      validateSimpleTrainerExtra(
        { ...draft, badges: "65535", sound: "1" },
        gold,
        9999,
        2,
      ),
    ).toEqual({ badges: 65535, options: { sound: 1 } });
    const invalidEdits: Record<string, string>[] = [
      { sound: "2" },
      { friendship: "1" },
      { beachScore: "1" },
      { unsupported: "1" },
    ];
    for (const edit of invalidEdits)
      expect(() =>
        validateSimpleTrainerExtra({ ...draft, ...edit }, gold, 9999, 2),
      ).toThrow();
  });
});
