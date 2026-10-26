// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, expect, it, vi } from "vitest";
import {
  boxBackgroundDragOver,
  boxBackgroundDrop,
  boxSlotDragOver,
  recognizedBoxDrop,
} from "./boxDropFeedback";
import { BOX_SLOT_DRAG_TYPE, type GalleryDropMode } from "./boxGallery";
import { playSaveSound } from "./saveSound";
vi.mock("./saveSound", () => ({ playSaveSound: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
function event(types: string[]) {
  const dataTransfer = {
    types,
    effectAllowed: "copyMove",
    dropEffect: "none",
    getData: vi.fn(() => {
      throw Error("Background must not consume a file or slot payload");
    }),
  };
  return {
    dataTransfer,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}
const slotEvent = (types: string[]) => {
  const e = event(types);
  Object.defineProperty(e.dataTransfer, "files", {
    get: () => {
      throw Error("Drag-over must not read file data");
    },
  });
  return e;
};
it.each(["auto", "copy", "overwrite"] as const)(
  "aligns %s slot feedback with exact modifier actions, including combined keys",
  (mode) => {
    for (let mask = 0; mask < 16; mask++) {
      const e = slotEvent([BOX_SLOT_DRAG_TYPE]);
      e.shiftKey = Boolean(mask & 1);
      e.altKey = Boolean(mask & 2);
      e.ctrlKey = Boolean(mask & 4);
      e.metaKey = Boolean(mask & 8);
      boxSlotDragOver(
        e as unknown as Parameters<typeof boxSlotDragOver>[0],
        true,
        mode,
      );
      const expected =
        mask === 1
          ? "copy"
          : mask === 2
            ? "move"
            : mode === "copy"
              ? "copy"
              : "move";
      expect(e.dataTransfer.dropEffect, `${mode}, keys=${mask}`).toBe(expected);
      expect(e.preventDefault).toHaveBeenCalledOnce();
      expect(e.stopPropagation).toHaveBeenCalledOnce();
      expect(e.dataTransfer.getData).not.toHaveBeenCalled();
    }
  },
);
it.each(["auto", "copy", "overwrite"] as const)(
  "uses copy for external files in %s mode without requesting source deletion",
  (mode) => {
    for (let mask = 0; mask < 16; mask++) {
      const e = slotEvent(["Files"]);
      e.dataTransfer.effectAllowed = "copy";
      e.shiftKey = Boolean(mask & 1);
      e.altKey = Boolean(mask & 2);
      e.ctrlKey = Boolean(mask & 4);
      e.metaKey = Boolean(mask & 8);
      boxSlotDragOver(
        e as unknown as Parameters<typeof boxSlotDragOver>[0],
        true,
        mode,
      );
      expect(e.dataTransfer.dropEffect).toBe("copy");
      expect(e.dataTransfer.getData).not.toHaveBeenCalled();
    }
  },
);
it.each([
  ["none", "none", "none"],
  ["copy", "copy", "none"],
  ["move", "none", "move"],
  ["link", "none", "none"],
  ["copyLink", "copy", "none"],
  ["linkMove", "none", "move"],
  ["copyMove", "copy", "move"],
  ["all", "copy", "move"],
  ["uninitialized", "copy", "move"],
])("respects source permissions %s", (allowed, copy, move) => {
  for (const [mode, expected] of [
    ["copy", copy],
    ["auto", move],
  ] as const) {
    const e = slotEvent([BOX_SLOT_DRAG_TYPE]);
    e.dataTransfer.effectAllowed = allowed;
    boxSlotDragOver(
      e as unknown as Parameters<typeof boxSlotDragOver>[0],
      true,
      mode as GalleryDropMode,
    );
    expect(e.dataTransfer.dropEffect).toBe(expected);
  }
});
it("prioritizes slot data just like the drop handler, and rejects busy or read-only destinations", () => {
  for (const writable of [true, false]) {
    const e = slotEvent([BOX_SLOT_DRAG_TYPE, "Files"]);
    boxSlotDragOver(
      e as unknown as Parameters<typeof boxSlotDragOver>[0],
      writable,
      "auto",
    );
    expect(e.dataTransfer.dropEffect).toBe(writable ? "move" : "none");
    expect(e.dataTransfer.getData).not.toHaveBeenCalled();
  }
  const e = slotEvent(["Files"]);
  boxSlotDragOver(
    e as unknown as Parameters<typeof boxSlotDragOver>[0],
    false,
    "copy",
  );
  expect(e.dataTransfer.dropEffect).toBe("none");
});
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
  boxSlotDragOver(
    e as unknown as Parameters<typeof boxSlotDragOver>[0],
    true,
    "auto",
  );
  expect(e.preventDefault).not.toHaveBeenCalled();
  expect(e.stopPropagation).not.toHaveBeenCalled();
  expect(playSaveSound).not.toHaveBeenCalled();
});
