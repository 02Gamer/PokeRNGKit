import { afterEach, expect, it, vi } from "vitest";
import {
  hoverPlacement,
  pokemonHoverSettings,
  PokemonHoverReader,
  hoverTargetFromData,
  hoverTargetKey,
  hoverResponseMatches,
  type PokemonHoverReport,
} from "./pokemonHover";
afterEach(() => vi.useRealTimers());
it("keeps database, group, and candidate identities separate from real positions", () => {
  expect(hoverTargetFromData({ hoverBox: "-1", hoverSlot: "2" })).toEqual({
    kind: "slot",
    box: -1,
    slot: 2,
  });
  expect(
    hoverTargetFromData({
      hoverTarget: '{"kind":"registered","group":7,"slot":2}',
    }),
  ).toEqual({ kind: "registered", group: 7, slot: 2 });
  expect(hoverTargetKey({ kind: "database", id: 2 })).not.toBe(
    hoverTargetKey({ kind: "gift", id: 2 }),
  );
  expect(
    hoverTargetFromData({ hoverTarget: '{"kind":"database","id":-1}' }),
  ).toBeUndefined();
  expect(
    hoverTargetFromData({ hoverTarget: '{"kind":"gift","id":2147483648}' }),
  ).toBeUndefined();
  expect(
    hoverTargetFromData({ hoverBox: "-2", hoverSlot: "2" }),
  ).toBeUndefined();
  expect(hoverTargetFromData({ hoverTarget: "null" })).toBeUndefined();
  expect(hoverTargetFromData({ hoverTarget: "invalid" })).toBeUndefined();
});
it("rejects stale or cross-namespace responses, retaining legacy real-slot support", () => {
  const data = {
    sourceHash: "A".repeat(64),
    text: {},
    target: { kind: "database", id: 3 },
  } as PokemonHoverReport;
  expect(hoverResponseMatches({ kind: "database", id: 3 }, data)).toBe(true);
  expect(hoverResponseMatches({ kind: "database", id: 4 }, data)).toBe(false);
  expect(hoverResponseMatches({ kind: "gift", id: 3 }, data)).toBe(false);
  expect(
    hoverResponseMatches(
      { kind: "registered", group: 3, slot: 0 },
      { ...data, box: -2, slot: 0, target: undefined },
    ),
  ).toBe(false);
  expect(
    hoverResponseMatches(
      { kind: "slot", box: -1, slot: 2 },
      { ...data, box: -1, slot: 2, target: undefined },
    ),
  ).toBe(true);
});
const report = {
  box: 0,
  slot: 1,
  sourceHash: "A".repeat(64),
  text: {},
} as PokemonHoverReport;
it("uses source preview defaults and accepts full signed cursor offsets", () => {
  expect(pokemonHoverSettings("")).toEqual({
    preview: true,
    text: true,
    cry: true,
    glow: true,
    offset: { x: 16, y: 8 },
  });
  expect(
    pokemonHoverSettings(
      JSON.stringify({
        hover: {
          hoverSlotShowPreview: false,
          hoverSlotShowText: true,
          previewCursorShift: { x: -2147483648, y: 2147483647 },
        },
      }),
    ).preview,
  ).toBe(false);
  expect(() => pokemonHoverSettings("{}")).toThrow();
  const base = {
    hoverSlotShowPreview: false,
    hoverSlotShowText: false,
    previewCursorShift: { x: 16, y: 8 },
  };
  expect(
    pokemonHoverSettings(
      JSON.stringify({ hover: { ...base, hoverSlotGlowEdges: false } }),
    ).glow,
  ).toBe(false);
  expect(() =>
    pokemonHoverSettings(
      JSON.stringify({ hover: { ...base, hoverSlotGlowEdges: "true" } }),
    ),
  ).toThrow();
  expect(() =>
    pokemonHoverSettings(
      JSON.stringify({
        hover: {
          hoverSlotShowPreview: true,
          hoverSlotShowText: true,
          previewCursorShift: { x: 2147483648, y: 8 },
        },
      }),
    ),
  ).toThrow();
});
it("clamps tooltip geometry at all viewport boundaries", () => {
  expect(hoverPlacement(2000, 1800, 360, 400, 1280, 720)).toEqual({
    left: 912,
    top: 312,
  });
  expect(hoverPlacement(-100, -50, 360, 400, 390, 800)).toEqual({
    left: 8,
    top: 8,
  });
});
it("debounces reads for 200 ms and cancels skipped slots", async () => {
  vi.useFakeTimers();
  const reader = new PokemonHoverReader(),
    read = vi.fn(async () => report),
    show = vi.fn();
  reader.start(read, show);
  await vi.advanceTimersByTimeAsync(199);
  expect(read).not.toHaveBeenCalled();
  reader.clear();
  await vi.advanceTimersByTimeAsync(1);
  expect(show).not.toHaveBeenCalled();
  reader.start(read, show);
  await vi.advanceTimersByTimeAsync(200);
  expect(show).toHaveBeenCalledWith(report);
  reader.clear();
});
it("ignores late results after leaving, switching, or unmounting", async () => {
  vi.useFakeTimers();
  let complete!: (value: PokemonHoverReport) => void;
  const reader = new PokemonHoverReader(),
    show = vi.fn();
  reader.start(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
    show,
  );
  await vi.advanceTimersByTimeAsync(200);
  reader.clear();
  complete(report);
  await Promise.resolve();
  expect(show).not.toHaveBeenCalled();
  reader.start(async () => {
    throw new Error("Worker rejected");
  }, show);
  await vi.advanceTimersByTimeAsync(200);
  expect(show).not.toHaveBeenCalled();
  reader.clear();
});
