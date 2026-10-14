import { expect, it } from "vitest";
import { defaultMysteryGiftQuery } from "./mysteryGiftDatabaseProtocol";
it("creates independent source Any filters with four move controls", () => {
  const first = defaultMysteryGiftQuery(),
    second = defaultMysteryGiftQuery();
  expect(first).toEqual({
    species: -1,
    heldItem: -1,
    moves: [-1, -1, -1, -1],
    egg: null,
    shiny: null,
    generation: 10,
    comparison: 3,
    instructions: "",
  });
  first.moves[0] = 85;
  expect(second.moves).toEqual([-1, -1, -1, -1]);
  expect(defaultMysteryGiftQuery(6)).toMatchObject({
    generation: 6,
    comparison: 3,
  });
  expect(defaultMysteryGiftQuery(3)).toMatchObject({
    generation: 10,
    comparison: 3,
  });
});
