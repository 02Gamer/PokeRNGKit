// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { PokemonDraftRegistry } from "./pokemonDraftRegistry";

it("collects every failing section without stopping at the first failure", () => {
  const registry = new PokemonDraftRegistry();
  const valid = vi.fn();
  registry.register("basic", () => {
    throw Error("EV total");
  });
  registry.register("raw", valid);
  registry.register("origin", () => {
    throw undefined;
  });
  expect(registry.check()).toEqual(["basic", "origin"]);
  expect(valid).toHaveBeenCalledOnce();
});

it("keeps replacement validators when an older render releases its lease", () => {
  const registry = new PokemonDraftRegistry();
  const removeOld = registry.register("basic", () => {});
  const removeCurrent = registry.register("basic", () => {
    throw Error("new draft");
  });
  removeOld();
  expect(registry.check()).toEqual(["basic"]);
  removeCurrent();
  expect(registry.check()).toEqual([]);
});

it("isolates revisions and positions, including late cleanup", () => {
  const old = new PokemonDraftRegistry(),
    current = new PokemonDraftRegistry();
  const cleanup = old.register("basic", () => {
    throw Error("old draft");
  });
  current.register("basic", () => {});
  expect(current.check()).toEqual([]);
  expect(old.check()).toEqual(["basic"]);
  cleanup();
  expect(current.check()).toEqual([]);
});

it.each(Array.from({ length: 16 }, (_, mask) => mask))(
  "permits only the exact source modifier combination (%i)",
  (mask) => {
    const registry = new PokemonDraftRegistry();
    const validate = vi.fn(() => {
      throw Error("invalid");
    });
    registry.register("basic", validate);
    const invalid = registry.check({
      ctrlKey: !!(mask & 1),
      shiftKey: !!(mask & 2),
      altKey: !!(mask & 4),
      metaKey: !!(mask & 8),
    });
    expect(invalid).toEqual(mask === 7 ? [] : ["basic"]);
    expect(validate).toHaveBeenCalledTimes(mask === 7 ? 0 : 1);
  },
);
