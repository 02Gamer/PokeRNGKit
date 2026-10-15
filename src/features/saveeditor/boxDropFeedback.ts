// SPDX-License-Identifier: GPL-3.0-or-later
// Source SAV_BoxList/SAV_BoxViewer root drops and SlotChangeManager rejection.
import type { DragEvent } from "react";
import { BOX_SLOT_DRAG_TYPE } from "./boxGallery";
import { playSaveSound } from "./saveSound";
type BoxDragEvent = Pick<
  DragEvent<HTMLElement>,
  "dataTransfer" | "preventDefault" | "stopPropagation"
>;
export function recognizedBoxDrop(types: readonly string[]) {
  return types.includes(BOX_SLOT_DRAG_TYPE) || types.includes("Files");
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
