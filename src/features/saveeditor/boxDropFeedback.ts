// SPDX-License-Identifier: GPL-3.0-or-later
// Source SAV_BoxList/SAV_BoxViewer root drops and SlotChangeManager rejection.
import type { DragEvent } from "react";
import {
  BOX_SLOT_DRAG_TYPE,
  boxDropMode,
  type GalleryDropMode,
  type GalleryModifiers,
} from "./boxGallery";
import { playSaveSound } from "./saveSound";
type BoxDragEvent = Pick<
  DragEvent<HTMLElement>,
  "dataTransfer" | "preventDefault" | "stopPropagation"
>;
export function recognizedBoxDrop(types: readonly string[]) {
  return types.includes(BOX_SLOT_DRAG_TYPE) || types.includes("Files");
}
export function boxSlotDragOver(
  event: BoxDragEvent & GalleryModifiers,
  writable: boolean,
  mode: GalleryDropMode,
) {
  if (!recognizedBoxDrop(event.dataTransfer.types)) return;
  event.preventDefault();
  event.stopPropagation();
  // Read only advertised types here: drag data is protected until drop.
  const effect = !event.dataTransfer.types.includes(BOX_SLOT_DRAG_TYPE)
    ? "copy"
    : boxDropMode(mode, event) === "copy"
      ? "copy"
      : "move";
  const allowed = event.dataTransfer.effectAllowed;
  const compatible =
    allowed === "all" ||
    allowed === "uninitialized" ||
    (effect === "copy"
      ? ["copy", "copyLink", "copyMove"].includes(allowed)
      : ["move", "linkMove", "copyMove"].includes(allowed));
  event.dataTransfer.dropEffect = writable && compatible ? effect : "none";
}
export function boxBackgroundDragOver(event: BoxDragEvent) {
  if (!recognizedBoxDrop(event.dataTransfer.types)) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = event.dataTransfer.types.includes("Files")
    ? "copy"
    : "move";
}
export function boxBackgroundDrop(event: BoxDragEvent) {
  if (!recognizedBoxDrop(event.dataTransfer.types)) return;
  event.preventDefault();
  event.stopPropagation();
  playSaveSound("other");
}
