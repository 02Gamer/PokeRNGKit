import { describe, expect, it } from "vitest";
import {
  previewDex8aTasks,
  projectedDex8aPoints,
  validateDex8a,
  type Dex8aEntry,
} from "./legendsPokedex";
const text = { zh: "研究", en: "Research", ja: "研究" };
const entry = (): Dex8aEntry => ({
  state: {
    species: 25,
    solitude: false,
    displayForm: 0,
    displayFemale: false,
    displayShiny: false,
    displayAlpha: false,
    forms: [
      {
        form: 0,
        flags: Array.from({ length: 3 }, () => Array<boolean>(8).fill(false)),
        hasMax: false,
        sizes: ["0", "0", "0", "0"],
      },
    ],
    tasks: [2, 0, 5],
  },
  number: 56,
  name: text,
  canSelectGender: true,
  forms: [
    {
      form: 0,
      name: text,
      theory: ["1", "2", "3", "4"],
      obtainedGenderMask: 3,
    },
  ],
  tasks: [
    {
      name: text,
      editable: true,
      derivedForms: false,
      thresholds: [1, 3, 5],
      reported: 1,
      reached: 1,
      points: 20,
      required: false,
    },
    {
      name: text,
      editable: false,
      derivedForms: true,
      thresholds: [1, 2],
      reported: 0,
      reached: 0,
      points: 10,
      required: false,
    },
    {
      name: text,
      editable: false,
      derivedForms: false,
      thresholds: [1],
      reported: 1,
      reached: 1,
      points: 10,
      required: true,
    },
  ],
  advanced: [],
  research: {
    updated: true,
    complete: false,
    perfect: false,
    updateIndex: 1,
    reported: 30,
    pending: 30,
  },
});
describe("Legends Arceus Pokédex", () => {
  it("copies editable state and keeps hidden/raw size text untouched", () => {
    const e = entry();
    e.state.forms[0].sizes = ["NaN", "Infinity", "-0", "invalid"];
    const result = validateDex8a(e.state, e);
    if (result.action !== "entry") throw Error("entry");
    expect(result.entry.forms[0].sizes).toEqual(e.state.forms[0].sizes);
    result.entry.forms[0].flags[0][0] = true;
    expect(e.state.forms[0].flags[0][0]).toBe(false);
  });
  it("derives obtained forms from both genders but does not change the submitted read-only task", () => {
    const e = entry(),
      state = structuredClone(e.state);
    state.forms[0].flags[1][0] = true;
    state.forms[0].flags[1][7] = true;
    expect(previewDex8aTasks(state, e)).toEqual([2, 2, 5]);
    expect(state.tasks[1]).toBe(0);
    expect(projectedDex8aPoints(state, e)).toBe(50);
    expect(() => validateDex8a(state, e)).not.toThrow();
    state.forms[0].flags[1][2] = true;
    expect(previewDex8aTasks(state, e)[1]).toBe(2);
  });
  it("retains unexposed form contributions and uses the combined-gender mask once", () => {
    const e = entry();
    e.forms[0].obtainedGenderMask = 8;
    e.state.tasks[1] = 4;
    const state = structuredClone(e.state);
    state.forms[0].flags[1][0] = true;
    state.forms[0].flags[1][1] = true;
    expect(previewDex8aTasks(state, e)[1]).toBe(5);
  });
  it("keeps previously reported points when progress decreases", () => {
    const e = entry();
    const state = { ...e.state, tasks: [0, 0, 5] };
    expect(projectedDex8aPoints(state, e)).toBe(30);
    state.tasks[0] = 5;
    expect(projectedDex8aPoints(state, e)).toBe(70);
  });
  it("enforces 60000 without normalizing unchanged uint16 originals", () => {
    const e = entry();
    expect(() =>
      validateDex8a({ ...e.state, tasks: [60000, 0, 5] }, e),
    ).not.toThrow();
    expect(() =>
      validateDex8a({ ...e.state, tasks: [60001, 0, 5] }, e),
    ).toThrow();
    e.state.tasks[0] = 65535;
    expect(() => validateDex8a(e.state, e)).not.toThrow();
    expect(() => validateDex8a({ ...e.state, tasks: [-1, 0, 5] }, e)).toThrow();
  });
  it("rejects cross-species, read-only task edits, incomplete forms and forbidden gender changes", () => {
    const e = entry();
    for (const state of [
      { ...e.state, species: 26 },
      { ...e.state, tasks: [2, 1, 5] },
      { ...e.state, forms: [] },
      { ...e.state, displayForm: 119 },
    ])
      expect(() => validateDex8a(state, e)).toThrow();
    e.canSelectGender = false;
    expect(() =>
      validateDex8a({ ...e.state, displayFemale: true }, e),
    ).toThrow();
  });
  it("preserves invalid original display forms but requires repair before changing that group", () => {
    const e = entry();
    e.state.displayForm = 255;
    expect(() => validateDex8a(e.state, e)).not.toThrow();
    expect(() =>
      validateDex8a({ ...e.state, displayShiny: true }, e),
    ).toThrow();
    expect(() =>
      validateDex8a({ ...e.state, displayForm: 0, displayShiny: true }, e),
    ).not.toThrow();
  });
});
