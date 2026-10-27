// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import {
  createBoxPointerController,
  type BoxPointerFeedback,
  type BoxPointerTarget,
} from "./boxPointerController";
import {
  boxDropMode,
  encodeBoxDrag,
  type GalleryDropMode,
  type GalleryModifiers,
} from "./boxGallery";
import type { BoxPointerSource } from "./boxPointerGesture";

const source: BoxPointerSource = {
  scope: "save-A",
  revision: 4,
  position: { box: 0, slot: 2 },
};
const none = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };
const press = {
  pointerId: 1,
  pointerType: "mouse",
  isPrimary: true,
  button: 0,
  buttons: 1,
  clientX: 20,
  clientY: 30,
  ...none,
};
const release = { ...press, buttons: 0 };
function setup(mode: GalleryDropMode = "auto") {
  let currentSource: BoxPointerSource | undefined = structuredClone(source);
  let target: BoxPointerTarget | undefined = {
    token: {},
    scope: source.scope,
    revision: 4,
    position: { box: 2, slot: 29 },
    writable: true,
    mode,
    label: "Box C / 30",
    apply: vi.fn(async () => {}),
  };
  const originalTarget = target;
  const frames: (BoxPointerFeedback | undefined)[] = [];
  const hit = vi.fn(() => target);
  const session = createBoxPointerController(press, 4, source, {
    readSource: () => currentSource,
    targetAt: hit,
    render: (frame) => frames.push(frame),
  })!;
  return {
    session,
    frames,
    hit,
    originalTarget,
    source: (value: BoxPointerSource | undefined) => {
      currentSource = value;
    },
    target: (value: BoxPointerTarget | undefined) => {
      target = value;
    },
  };
}

it("keeps a dead zone and proposes one cross-box drop using the live physical target", async () => {
  const f = setup();
  expect(f.session.move({ ...press, clientX: 22, clientY: 32 })).toBe(false);
  expect(f.frames).toHaveLength(0);
  expect(f.session.move({ ...press, clientX: 23, clientY: 32 })).toBe(true);
  expect(f.frames.at(-1)).toMatchObject({
    allowed: true,
    mode: "auto",
    target: { position: { box: 2, slot: 29 } },
  });
  const applied: { payload: string; keys: GalleryModifiers }[] = [];
  const movedTarget = {
    ...f.originalTarget,
    position: { box: 1, slot: 17 },
    apply: vi.fn(async (payload: string, keys: GalleryModifiers) => {
      applied.push({ payload, keys });
    }),
  };
  f.target(movedTarget);
  f.session.refresh();
  expect(f.frames.at(-1)?.target).toBe(movedTarget);
  const result = f.session.finish({ ...release, clientX: 450, clientY: 600 })!;
  expect(f.hit).toHaveBeenLastCalledWith({ x: 450, y: 600 });
  expect(result.target).toBe(movedTarget);
  expect(f.session.active).toBe(false);
  expect(f.session.consumed).toBe(true);
  expect(f.frames.at(-1)).toBeUndefined();
  expect(f.originalTarget.apply).not.toHaveBeenCalled();
  await result.target.apply(
    encodeBoxDrag(
      result.source.scope,
      result.source.revision,
      result.source.position,
    ),
    result.keys,
  );
  expect(movedTarget.apply).toHaveBeenCalledOnce();
  expect(JSON.parse(applied[0].payload)).toEqual({
    scope: "save-A",
    revision: 4,
    box: 0,
    slot: 2,
  });
  expect(f.session.finish(release)).toBeUndefined();
});

it.each(["auto", "copy", "overwrite"] as const)(
  "keeps %s feedback and final keys consistent for all modifier combinations",
  (mode) => {
    for (let mask = 0; mask < 16; mask++) {
      const f = setup(mode);
      f.session.move({ ...press, clientX: 40 });
      // Browser key flags live on the event prototype, not enumerable own keys.
      const keys: GalleryModifiers = Object.create({
        shiftKey: !!(mask & 1),
        altKey: !!(mask & 2),
        ctrlKey: !!(mask & 4),
        metaKey: !!(mask & 8),
      });
      f.session.modifiers(keys);
      expect(f.frames.at(-1)?.mode).toBe(boxDropMode(mode, keys));
      const result = f.session.finish({
        ...release,
        shiftKey: keys.shiftKey,
        altKey: keys.altKey,
        ctrlKey: keys.ctrlKey,
        metaKey: keys.metaKey,
      })!;
      expect(boxDropMode(mode, result.keys)).toBe(boxDropMode(mode, keys));
    }
  },
);

it("uses release-time modifiers rather than an earlier move's keys", () => {
  const f = setup();
  f.session.move({ ...press, clientX: 40, shiftKey: true });
  expect(f.frames.at(-1)?.mode).toBe("copy");
  const result = f.session.finish({ ...release, altKey: true })!;
  expect(boxDropMode("auto", result.keys)).toBe("overwrite");
});

it("ignores other pointers and preserves a normal click before a real drag", () => {
  const f = setup();
  expect(f.session.move({ ...press, pointerId: 2, clientX: 400 })).toBe(false);
  expect(f.session.finish({ ...release, pointerId: 2 })).toBeUndefined();
  expect(f.session.active).toBe(true);
  expect(f.session.finish({ ...release, clientX: 400 })).toBeUndefined();
  expect(f.session.consumed).toBe(false);
  expect(f.originalTarget.apply).not.toHaveBeenCalled();
});
it("preserves a captured click only when released on its still-current source before dragging", () => {
  const f = setup();
  expect(f.session.canClick(release, true)).toBe(true);
  expect(f.session.canClick(release, false)).toBe(false);
  expect(f.session.canClick({ ...release, pointerId: 2 }, true)).toBe(false);
  f.source({ ...source, revision: 5 });
  expect(f.session.canClick(release, true)).toBe(false);
  f.source(undefined);
  expect(f.session.canClick(release, true)).toBe(false);
  f.source(structuredClone(source));
  f.session.move({ ...press, clientX: 40 });
  expect(f.session.canClick(release, true)).toBe(false);
  f.session.cancel();
  expect(f.session.canClick(release, true)).toBe(false);
});

it("rejects foreign, stale, locked, absent and same-slot targets at release", () => {
  for (const target of [
    undefined,
    { scope: "save-B" },
    { revision: 5 },
    { writable: false },
    { position: source.position },
  ]) {
    const f = setup();
    f.session.move({ ...press, clientX: 40 });
    f.target(target && { ...f.originalTarget, ...target });
    f.session.refresh();
    expect(f.frames.at(-1)?.allowed).toBe(false);
    expect(f.session.finish(release)).toBeUndefined();
    expect(f.originalTarget.apply).not.toHaveBeenCalled();
  }
});

it("cancels when the source becomes unavailable or changes while a key/scroll is handled", () => {
  for (const changed of [
    undefined,
    { ...source, scope: "B" },
    { ...source, revision: 5 },
    { ...source, position: { box: 0, slot: 3 } },
  ]) {
    const f = setup();
    f.session.move({ ...press, clientX: 40 });
    f.source(changed);
    f.session.refresh();
    expect(f.session.active).toBe(false);
    expect(f.frames.at(-1)).toBeUndefined();
    expect(f.session.finish(release)).toBeUndefined();
  }
});

it("clears feedback on lost buttons and explicit cancel without producing a drop", () => {
  for (const cancel of [false, true]) {
    const f = setup();
    f.session.move({ ...press, clientX: 40 });
    if (cancel) f.session.cancel();
    else f.session.move({ ...press, buttons: 0 });
    expect(f.session.active).toBe(false);
    expect(f.session.consumed).toBe(true);
    expect(f.frames.at(-1)).toBeUndefined();
    expect(f.session.finish(release)).toBeUndefined();
    expect(f.originalTarget.apply).not.toHaveBeenCalled();
  }
});
