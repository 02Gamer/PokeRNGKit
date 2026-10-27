// SPDX-License-Identifier: GPL-3.0-or-later
import {
  boxDropMode,
  type GalleryDropMode,
  type GalleryModifiers,
} from "./boxGallery";
import {
  beginBoxPointerGesture,
  moveBoxPointerGesture,
  finishBoxPointerGesture,
  matchesBoxPointerSource,
  type BoxPointerSource,
} from "./boxPointerGesture";
import type { PokemonPosition } from "./domain";

export type BoxPointerDrop = (
  target: PokemonPosition,
  payload: string,
  keys: GalleryModifiers,
) => Promise<void>;
export interface BoxPointerTarget {
  token: object;
  scope: string;
  revision: number;
  position: PokemonPosition;
  writable: boolean;
  mode: GalleryDropMode;
  label: string;
  apply(payload: string, keys: GalleryModifiers): Promise<void>;
}
export interface BoxPointerFeedback {
  point: { x: number; y: number };
  target?: BoxPointerTarget;
  allowed: boolean;
  mode: GalleryDropMode;
}
type Press = Parameters<typeof beginBoxPointerGesture>[0] & GalleryModifiers;
type Motion = Parameters<typeof moveBoxPointerGesture>[1] & GalleryModifiers;
type Release = Parameters<typeof finishBoxPointerGesture>[1] & GalleryModifiers;
const modifiersOf = (value: GalleryModifiers): GalleryModifiers => ({
  shiftKey: value.shiftKey,
  altKey: value.altKey,
  ctrlKey: value.ctrlKey,
  metaKey: value.metaKey,
});

export function createBoxPointerController(
  press: Press,
  threshold: number,
  source: BoxPointerSource,
  ports: {
    readSource(): BoxPointerSource | undefined;
    targetAt(point: { x: number; y: number }): BoxPointerTarget | undefined;
    render(frame: BoxPointerFeedback | undefined): void;
  },
) {
  let gesture = beginBoxPointerGesture(press, threshold, source);
  if (!gesture) return undefined;
  let consumed = false;
  let keys: GalleryModifiers = {
    shiftKey: press.shiftKey,
    altKey: press.altKey,
    ctrlKey: press.ctrlKey,
    metaKey: press.metaKey,
  };
  const cancel = () => {
    gesture = undefined;
    ports.render(undefined);
  };
  const feedback = (
    point: { x: number; y: number },
    current: BoxPointerSource,
  ): BoxPointerFeedback => {
    const target = ports.targetAt(point);
    const sameSlot =
      target?.position.box === current.position.box &&
      target.position.slot === current.position.slot;
    return {
      point,
      target,
      allowed:
        !!target &&
        target.writable &&
        target.scope === current.scope &&
        target.revision === current.revision &&
        !sameSlot,
      mode: boxDropMode(target?.mode ?? "auto", keys),
    };
  };
  return {
    pointerId: press.pointerId,
    get active() {
      return !!gesture;
    },
    get consumed() {
      return consumed;
    },
    cancel,
    move(event: Motion) {
      if (!gesture) return false;
      const current = ports.readSource();
      if (!current) {
        cancel();
        return false;
      }
      gesture = moveBoxPointerGesture(gesture, event, current);
      if (!gesture) {
        cancel();
        return false;
      }
      if (event.pointerId !== gesture.pointerId) return false;
      keys = {
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      };
      if (gesture.dragging) {
        consumed = true;
        ports.render(feedback(gesture.point, current));
      }
      return gesture.dragging;
    },
    modifiers(next: GalleryModifiers) {
      if (!gesture) return;
      const current = ports.readSource();
      if (!current) {
        cancel();
        return;
      }
      // Validate the snapshot without initiating a drag on a key event.
      if (!matchesBoxPointerSource(gesture, current)) {
        cancel();
        return;
      }
      keys = modifiersOf(next);
      if (gesture.dragging) ports.render(feedback(gesture.point, current));
    },
    refresh() {
      this.modifiers(keys);
    },
    canClick(event: Release, releasedOnSource: boolean) {
      if (
        !gesture ||
        consumed ||
        !releasedOnSource ||
        event.pointerId !== gesture.pointerId ||
        event.button !== 0 ||
        event.buttons & 1
      )
        return false;
      const current = ports.readSource();
      return !!current && matchesBoxPointerSource(gesture, current);
    },
    finish(event: Release) {
      if (
        !gesture ||
        event.pointerId !== gesture.pointerId ||
        event.button !== 0 ||
        event.buttons & 1
      )
        return undefined;
      const current = ports.readSource();
      const completed =
        current && finishBoxPointerGesture(gesture, event, current);
      keys = {
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
      };
      const frame = completed && feedback(completed.point, current!);
      cancel();
      return completed && frame?.allowed && frame.target
        ? { source: completed.source, target: frame.target, keys: { ...keys } }
        : undefined;
    },
  };
}
