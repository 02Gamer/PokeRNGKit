// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, expect, it, vi } from "vitest";
import {
  boxBackgroundDragOver,
  boxBackgroundDrop,
  recognizedBoxDrop,
} from "./boxDropFeedback";
import { BOX_SLOT_DRAG_TYPE } from "./boxGallery";
import { playSaveSound } from "./saveSound";
vi.mock("./saveSound", () => ({ playSaveSound: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
function event(types: string[]) {
  const dataTransfer = {
    types,
    dropEffect: "none",
    getData: vi.fn(() => {
      throw Error("Background must not consume a file or slot payload");
    }),
  };
  return { dataTransfer, preventDefault: vi.fn(), stopPropagation: vi.fn() };
}
it.each([
  ["Files", "copy"],
  [BOX_SLOT_DRAG_TYPE, "move"],
])(
  "stops a source background %s drop without importing or moving",
  (type, effect) => {
    const e = event([type]),
      typed = e as unknown as Parameters<typeof boxBackgroundDrop>[0];
    expect(recognizedBoxDrop(e.dataTransfer.types)).toBe(true);
    boxBackgroundDragOver(typed);
    expect(e.dataTransfer.dropEffect).toBe(effect);
    expect(playSaveSound).not.toHaveBeenCalled();
    boxBackgroundDrop(typed);
    expect(e.preventDefault).toHaveBeenCalledTimes(2);
    expect(e.stopPropagation).toHaveBeenCalledTimes(2);
    expect(e.dataTransfer.getData).not.toHaveBeenCalled();
    expect(playSaveSound).toHaveBeenCalledExactlyOnceWith("other");
  },
);
it.each([
  { types: [] },
  { types: ["text/plain"] },
  { types: ["text/html"] },
  { types: ["text/uri-list"] },
])("leaves unrelated drags alone: $types", ({ types }) => {
  const e = event(types),
    typed = e as unknown as Parameters<typeof boxBackgroundDrop>[0];
  boxBackgroundDragOver(typed);
  boxBackgroundDrop(typed);
  expect(e.preventDefault).not.toHaveBeenCalled();
  expect(e.stopPropagation).not.toHaveBeenCalled();
  expect(playSaveSound).not.toHaveBeenCalled();
});
