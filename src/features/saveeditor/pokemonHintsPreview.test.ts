// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { SAVE_EDITOR_API_VERSION } from "./domain";
import {
  LatestHintQueue,
  parsePokemonHintsPreview,
} from "./pokemonHintsPreview";
const source = "A".repeat(64),
  request = "B".repeat(64);
const preview = {
  apiVersion: SAVE_EDITOR_API_VERSION,
  sourceHash: source,
  requestHash: request,
  hints: {
    parsed: true,
    valid: false,
    moves: [true, false, true, true],
    relearn: [],
    learnableMoves: [85, 150],
  },
};
it("binds both source and full request, validates Core flags, and clones the response", () => {
  expect(() =>
    parsePokemonHintsPreview(preview, source, "C".repeat(64)),
  ).toThrow();
  expect(() =>
    parsePokemonHintsPreview(preview, "C".repeat(64), request),
  ).toThrow();
  expect(() =>
    parsePokemonHintsPreview(
      { ...preview, apiVersion: SAVE_EDITOR_API_VERSION - 1 },
      source,
      request,
    ),
  ).toThrow();
  for (const patch of [
    { moves: [] },
    { learnableMoves: [0] },
    { learnableMoves: [1, 1] },
    { learnableMoves: [65536] },
    { parsed: false },
  ])
    expect(() =>
      parsePokemonHintsPreview(
        { ...preview, hints: { ...preview.hints, ...patch } },
        source,
        request,
      ),
    ).toThrow();
  const copy = parsePokemonHintsPreview(preview, source, request);
  copy.hints!.learnableMoves!.push(1);
  expect(preview.hints.learnableMoves).toEqual([85, 150]);
  expect(
    parsePokemonHintsPreview({ ...preview, hints: null }, source, request)
      .hints,
  ).toBeNull();
});
it("serializes reads, drops obsolete queued work and rejects late results", async () => {
  const queue = new LatestHintQueue();
  let release!: (value: number) => void;
  const first = queue.request(
    () =>
      new Promise<number>((resolve) => {
        release = resolve;
      }),
  );
  await Promise.resolve();
  const skipped = vi.fn(async () => 2),
    latest = vi.fn(async () => 3);
  const second = queue.request(skipped),
    third = queue.request(latest);
  release(1);
  expect(await first).toBeUndefined();
  expect(await second).toBeUndefined();
  expect(await third).toBe(3);
  expect(skipped).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledOnce();
});
it("recovers after failed reads and invalidates in-flight work on context disposal", async () => {
  const queue = new LatestHintQueue();
  await expect(
    queue.request(async () => {
      throw Error("bad");
    }),
  ).rejects.toThrow("bad");
  let release!: (value: number) => void;
  const next = queue.request(
    () =>
      new Promise<number>((resolve) => {
        release = resolve;
      }),
  );
  await Promise.resolve();
  await Promise.resolve();
  queue.invalidate();
  release(1);
  expect(await next).toBeUndefined();
  expect(await queue.request(async () => 4)).toBe(4);
});
