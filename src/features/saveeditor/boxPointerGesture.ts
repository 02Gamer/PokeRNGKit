// SPDX-License-Identifier: GPL-3.0-or-later
// Source: WinForms Controls/Slots/DragManager.cs CanStartDrag.
import type { PokemonPosition } from "./domain";

export interface BoxPointerSource {
  scope: string;
  revision: number;
  position: PokemonPosition;
}
type Motion = Pick<
  PointerEvent,
  "pointerId" | "buttons" | "clientX" | "clientY"
>;
type Press = Motion &
  Pick<PointerEvent, "pointerType" | "button" | "isPrimary">;
type Release = Motion & Pick<PointerEvent, "button">;
export interface BoxPointerGesture {
  readonly pointerId: number;
  readonly threshold: number;
  readonly origin: Readonly<{ x: number; y: number }>;
  readonly point: Readonly<{ x: number; y: number }>;
  readonly source: Readonly<{
    scope: string;
    revision: number;
    position: Readonly<PokemonPosition>;
  }>;
  readonly dragging: boolean;
}
const finitePoint = (event: Motion) =>
  Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
export const matchesBoxPointerSource = (
  gesture: BoxPointerGesture,
  source: BoxPointerSource,
) =>
  gesture.source.scope === source.scope &&
  gesture.source.revision === source.revision &&
  gesture.source.position.box === source.position.box &&
  gesture.source.position.slot === source.position.slot;

export function beginBoxPointerGesture(
  event: Press,
  threshold: number,
  source: BoxPointerSource,
): BoxPointerGesture | undefined {
  if (
    event.pointerType !== "mouse" ||
    !event.isPrimary ||
    event.button !== 0 ||
    !(event.buttons & 1) ||
    !finitePoint(event) ||
    !Number.isInteger(threshold) ||
    threshold < -2147483648 ||
    threshold > 2147483647
  )
    return undefined;
  const point = { x: event.clientX, y: event.clientY };
  return {
    pointerId: event.pointerId,
    threshold,
    origin: point,
    point,
    source: { ...source, position: { ...source.position } },
    dragging: false,
  };
}

export function moveBoxPointerGesture(
  gesture: BoxPointerGesture,
  event: Motion,
  source: BoxPointerSource,
): BoxPointerGesture | undefined {
  if (!matchesBoxPointerSource(gesture, source)) return undefined;
  if (event.pointerId !== gesture.pointerId) return gesture;
  if (!(event.buttons & 1) || !finitePoint(event)) return undefined;
  const point = { x: event.clientX, y: event.clientY };
  const distance =
    Math.abs(point.x - gesture.origin.x) + Math.abs(point.y - gesture.origin.y);
  return {
    ...gesture,
    point,
    dragging: gesture.dragging || distance > gesture.threshold,
  };
}

// Mouse-up never initiates a drag. A real move must first cross the threshold.
// The caller still resolves the live target and uses the existing frozen drop flow.
export function finishBoxPointerGesture(
  gesture: BoxPointerGesture,
  event: Release,
  source: BoxPointerSource,
) {
  if (
    event.pointerId !== gesture.pointerId ||
    event.button !== 0 ||
    !gesture.dragging ||
    !matchesBoxPointerSource(gesture, source) ||
    !finitePoint(event)
  )
    return undefined;
  return {
    source: { ...gesture.source, position: { ...gesture.source.position } },
    point: { x: event.clientX, y: event.clientY },
  };
}
