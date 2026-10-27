// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import {
  beginBoxPointerGesture,
  moveBoxPointerGesture,
  finishBoxPointerGesture,
} from "./boxPointerGesture";

const source = { scope: "save-A", revision: 7, position: { box: 2, slot: 12 } };
const press = {
  pointerId: 1,
  pointerType: "mouse",
  isPrimary: true,
  button: 0,
  buttons: 1,
  clientX: 100,
  clientY: 200,
};
const release = { ...press, buttons: 0 };

it("waits at the exact L1 boundary, starts beyond it and stays dragging when moving back", () => {
  const armed = beginBoxPointerGesture(press, 4, source)!;
  const boundary = moveBoxPointerGesture(
    armed,
    { ...press, clientX: 102, clientY: 202 },
    source,
  )!;
  expect(boundary.dragging).toBe(false);
  const started = moveBoxPointerGesture(
    boundary,
    { ...press, clientX: 103, clientY: 202 },
    source,
  )!;
  expect(started.dragging).toBe(true);
  const back = moveBoxPointerGesture(started, press, source)!;
  expect(back.dragging).toBe(true);
  expect(
    finishBoxPointerGesture(
      back,
      { ...release, clientX: 350, clientY: 250 },
      source,
    ),
  ).toEqual({ source, point: { x: 350, y: 250 } });
  expect(armed.dragging).toBe(false);
});

it("keeps clicks below the threshold and does not start on mouse-up alone", () => {
  const armed = beginBoxPointerGesture(press, 0, source)!;
  expect(moveBoxPointerGesture(armed, press, source)?.dragging).toBe(false);
  expect(
    finishBoxPointerGesture(armed, { ...release, clientX: 600 }, source),
  ).toBeUndefined();
  expect(
    moveBoxPointerGesture(armed, { ...press, clientX: 100.5 }, source)
      ?.dragging,
  ).toBe(true);
});

it("uses origin distance rather than accumulating back-and-forth movement", () => {
  let gesture = beginBoxPointerGesture(press, 4, source)!;
  for (const x of [103, 97, 102, 98, 101, 100]) {
    gesture = moveBoxPointerGesture(gesture, { ...press, clientX: x }, source)!;
    expect(gesture.dragging).toBe(false);
  }
});

it("accepts the full signed setting range and rejects invalid settings", () => {
  for (const threshold of [-2147483648, -1]) {
    expect(
      moveBoxPointerGesture(
        beginBoxPointerGesture(press, threshold, source)!,
        press,
        source,
      )?.dragging,
    ).toBe(true);
  }
  expect(
    moveBoxPointerGesture(
      beginBoxPointerGesture(press, 2147483647, source)!,
      { ...press, clientX: 1000000 },
      source,
    )?.dragging,
  ).toBe(false);
  for (const threshold of [-2147483649, 2147483648, 0.5, NaN, Infinity]) {
    expect(beginBoxPointerGesture(press, threshold, source)).toBeUndefined();
  }
});

it("ignores other pointers and cancels when the left button is lost", () => {
  const armed = beginBoxPointerGesture(press, 0, source)!;
  const started = moveBoxPointerGesture(
    armed,
    { ...press, clientX: 110 },
    source,
  )!;
  expect(
    moveBoxPointerGesture(started, { ...release, pointerId: 2 }, source),
  ).toBe(started);
  expect(
    finishBoxPointerGesture(started, { ...release, pointerId: 2 }, source),
  ).toBeUndefined();
  expect(moveBoxPointerGesture(started, release, source)).toBeUndefined();
  expect(
    finishBoxPointerGesture(started, { ...release, button: 2 }, source),
  ).toBeUndefined();
});

it("rejects stale or foreign sources throughout the gesture and owns its captured position", () => {
  const mutable = structuredClone(source);
  const armed = beginBoxPointerGesture(press, 0, mutable)!;
  const started = moveBoxPointerGesture(
    armed,
    { ...press, clientX: 110 },
    source,
  )!;
  mutable.position.slot = 13;
  expect(armed.source.position.slot).toBe(12);
  for (const changed of [
    { ...source, revision: 8 },
    { ...source, scope: "save-B" },
    mutable,
  ]) {
    expect(moveBoxPointerGesture(started, press, changed)).toBeUndefined();
    expect(finishBoxPointerGesture(started, release, changed)).toBeUndefined();
  }
  const finished = finishBoxPointerGesture(started, release, source)!;
  finished.source.position.slot = 29;
  expect(started.source.position.slot).toBe(12);
});

it("leaves touch, pen, secondary presses and invalid coordinates outside mouse dragging", () => {
  for (const change of [
    { pointerType: "touch" },
    { pointerType: "pen" },
    { isPrimary: false },
    { button: 2 },
    { buttons: 0 },
    { clientX: NaN },
  ]) {
    expect(
      beginBoxPointerGesture({ ...press, ...change }, 0, source),
    ).toBeUndefined();
  }
  const armed = beginBoxPointerGesture(press, 0, source)!;
  expect(
    moveBoxPointerGesture(armed, { ...press, clientY: Infinity }, source),
  ).toBeUndefined();
  expect(
    finishBoxPointerGesture(
      moveBoxPointerGesture(armed, { ...press, clientX: 101 }, source)!,
      { ...release, clientY: NaN },
      source,
    ),
  ).toBeUndefined();
});
