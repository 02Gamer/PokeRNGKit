// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import {
  PokemonDraftRegistry,
  PokemonDraftCaptureError,
} from "./pokemonDraftRegistry";
import {
  basicDraftSteps,
  changedDraftKeys,
  rawDraftSteps,
  type PokemonDraftStep,
} from "./pokemonDraftPlan";
import type { PokemonEdit } from "./PokemonEditor";
const raw = (): PokemonDraftStep => ({
  kind: "raw",
  edit: { action: "values", pid: 123 },
});
it("captures a value snapshot without source positions or later UI mutations", () => {
  const r = new PokemonDraftRegistry("0:2:4");
  const payload = {
    box: 0,
    slot: 2,
    action: "relearn" as const,
    relearn: { moves: [1, 2, 3, 4] },
  };
  r.register("relearn", () => {});
  r.registerPreparation("relearn", () => rawDraftSteps(payload));
  const snapshot = r.capture("0:2:4");
  payload.relearn.moves[0] = 99;
  expect(snapshot.sections[0].steps).toEqual([
    {
      kind: "raw",
      edit: { action: "relearn", relearn: { moves: [1, 2, 3, 4] } },
    },
  ]);
  expect(payload).toHaveProperty("box", 0);
  expect(payload).toHaveProperty("slot", 2);
});
it("rejects scope changes before reading or preparing any drafts", () => {
  const r = new PokemonDraftRegistry("old"),
    callback = vi.fn(() => [raw()]);
  r.registerPreparation("raw", callback);
  expect(() => r.capture("new")).toThrow(PokemonDraftCaptureError);
  expect(callback).not.toHaveBeenCalled();
});
it("rejects invalid and missing sections together without a partial capture", () => {
  const r = new PokemonDraftRegistry("scope"),
    prepare = vi.fn(() => [raw()]);
  r.register("basic", () => {
    throw Error("EV total");
  });
  r.register("origin", () => {});
  r.registerPreparation("raw", prepare);
  try {
    r.capture("scope");
    throw Error("accepted");
  } catch (error) {
    expect(error).toBeInstanceOf(PokemonDraftCaptureError);
    expect((error as PokemonDraftCaptureError).sections).toEqual([
      "basic",
      "origin",
    ]);
  }
  expect(prepare).not.toHaveBeenCalled();
});
it("captures each preparer once, drops empty sections and retains unrelated drafts", () => {
  const r = new PokemonDraftRegistry("scope"),
    a = vi.fn(() => [raw()]),
    empty = vi.fn(() => []);
  r.registerPreparation("raw", a);
  r.registerPreparation("optional", empty);
  r.registerPreparation("care", () => [
    {
      kind: "raw",
      edit: {
        action: "care",
        care: { values: [{ key: "originalFriendship", value: 7 }] },
      },
    },
  ]);
  expect(r.capture("scope").sections.map((s) => s.section)).toEqual([
    "raw",
    "care",
  ]);
  expect(a).toHaveBeenCalledOnce();
  expect(empty).toHaveBeenCalledOnce();
});
it("does not let an old preparation lease remove a newer render", () => {
  const r = new PokemonDraftRegistry("scope"),
    old = r.registerPreparation("raw", () => [raw()]);
  const current = r.registerPreparation("raw", () => []);
  old();
  expect(r.capture("scope").sections).toEqual([]);
  r.register("raw", () => {});
  current();
  expect(() => r.capture("scope")).toThrow();
});
it("keeps preparation failures visible to legality checks and aggregates them", () => {
  const r = new PokemonDraftRegistry("scope");
  for (const section of ["care", "ribbons"])
    r.registerPreparation(section, () => {
      throw Error("invalid");
    });
  expect(r.check()).toEqual(["care", "ribbons"]);
  expect(() => r.capture("scope")).toThrow();
});
it("does not let the source UI bypass produce an unparseable payload", () => {
  const r = new PokemonDraftRegistry("scope");
  r.register("basic", () => {
    throw Error("UI");
  });
  r.registerPreparation("basic", () => {
    throw Error("parse");
  });
  const keys = { ctrlKey: true, shiftKey: true, altKey: true, metaKey: false };
  expect(r.check(keys)).toEqual([]);
  expect(() => r.capture("scope", keys)).toThrow(PokemonDraftCaptureError);
});
it("separates care inputs in the editor from those in the memories window", () => {
  const r = new PokemonDraftRegistry("scope");
  r.registerPreparation("care", () => [raw()]);
  r.registerPreparation("memoryCare", () => [
    { kind: "raw", edit: { action: "values", pid: 456 } },
  ]);
  expect(r.capture("scope").sections).toHaveLength(2);
});
it.each([33, 65])("bounds operation count %s", (count) => {
  const r = new PokemonDraftRegistry("scope");
  if (count === 33)
    r.registerPreparation("raw", () => Array.from({ length: count }, raw));
  else
    for (let i = 0; i < count; i++)
      r.registerPreparation(String(i), () => [raw()]);
  expect(() => r.capture("scope")).toThrow(PokemonDraftCaptureError);
});
it("bounds serialized payload size and refuses non-cloneable preparation values", () => {
  const r = new PokemonDraftRegistry("scope");
  r.registerPreparation("raw", () => [
    {
      kind: "raw",
      edit: { action: "values", homeTracker: "A".repeat(1024 * 1024) },
    },
  ]);
  expect(() => r.capture("scope")).toThrow();
  r.registerPreparation("raw", () => [
    (() => {}) as unknown as PokemonDraftStep,
  ]);
  expect(() => r.capture("scope")).toThrow(PokemonDraftCaptureError);
});
it("keeps a basic field mask so unchanged values cannot become implicit writes", () => {
  const edit = {
    box: 0,
    slot: 2,
    nickname: "TEST",
    nature: null,
    trainerIds: { tid: "123456", sid: "0001" },
    identity: { species: 25, form: 0, gender: 0, useSpeciesName: true },
  } as unknown as PokemonEdit;
  expect(basicDraftSteps(edit, [])).toEqual([]);
  expect(
    basicDraftSteps(edit, [
      "species",
      "gender",
      "nickname",
      "tid",
      "sid",
      "nature",
    ]),
  ).toEqual([
    {
      kind: "basic",
      fields: ["identity", "nickname", "trainerIds"],
      edit: {
        nickname: "TEST",
        nature: null,
        trainerIds: edit.trainerIds,
        identity: edit.identity,
      },
    },
  ]);
  expect(() => basicDraftSteps(edit, ["unrecognized"])).toThrow();
  const legacy = { ...edit, trainerIds: undefined, tid: 0, sid: 1 };
  expect(basicDraftSteps(legacy, ["tid", "sid"])[0]).toMatchObject({
    fields: ["tid", "sid"],
  });
});
it("finds actual state changes without modifying baseline arrays", () => {
  const original = { ivs: [1, 2, 3], ot: "OWNER", nature: "0" },
    draft = { ...original, ivs: [1, 2, 4] };
  expect(changedDraftKeys(draft, original)).toEqual(["ivs"]);
  expect(original.ivs).toEqual([1, 2, 3]);
});
