// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { suppressBoxPointerClick } from "./boxPointerClick";
const click = (detail: number) =>
  Object.defineProperty(new Event("click", { cancelable: true }), "detail", {
    value: detail,
  });

it("blocks the delayed mouse compatibility click but permits keyboard activation", () => {
  const target = new EventTarget();
  suppressBoxPointerClick(target);
  const action = vi.fn();
  target.addEventListener("click", action);
  expect(target.dispatchEvent(click(0))).toBe(true);
  expect(action).toHaveBeenCalledOnce();
  expect(target.dispatchEvent(click(1))).toBe(false);
  expect(action).toHaveBeenCalledOnce();
  expect(target.dispatchEvent(click(1))).toBe(true);
  expect(action).toHaveBeenCalledTimes(2);
});
it("clears on the next independent press, including after a cancelled drag", () => {
  const target = new EventTarget();
  suppressBoxPointerClick(target);
  target.dispatchEvent(new Event("pointerdown"));
  expect(target.dispatchEvent(click(1))).toBe(true);
});
it("supports idempotent cleanup without swallowing a future action", () => {
  const target = new EventTarget();
  const clear = suppressBoxPointerClick(target);
  clear();
  clear();
  expect(target.dispatchEvent(click(1))).toBe(true);
});
