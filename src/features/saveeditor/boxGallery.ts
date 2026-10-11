// SPDX-License-Identifier: GPL-3.0-or-later
import type {
  BoxEdit,
  PokemonPosition,
  SaveReport,
  StorageEdit,
} from "./domain";
export const BOX_SLOT_DRAG_TYPE = "application/x-pokerngkit-box-slot";
export type GalleryDropMode = "auto" | "copy" | "overwrite";
export interface GalleryModifiers {
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}
type GalleryReport = Pick<
  SaveReport,
  | "boxCount"
  | "boxSlotCount"
  | "pokemon"
  | "canEdit"
  | "checksumsValid"
  | "boxOptions"
>;
const inBox = (r: GalleryReport, p: PokemonPosition) =>
  Number.isInteger(p.box) &&
  p.box >= 0 &&
  p.box < r.boxCount &&
  Number.isInteger(p.slot) &&
  p.slot >= 0 &&
  p.slot < r.boxSlotCount;
export function adjacentBoxEdit(
  report: GalleryReport,
  box: number,
  direction: -1 | 1,
): BoxEdit {
  if (
    !report.canEdit ||
    !report.checksumsValid ||
    !report.boxOptions.canSwap ||
    report.boxCount < 2 ||
    !Number.isInteger(box) ||
    box < 0 ||
    box >= report.boxCount ||
    (direction !== -1 && direction !== 1)
  )
    throw Error("Invalid adjacent box swap.");
  return {
    box,
    name: null,
    wallpaper: null,
    swapWith: (box + direction + report.boxCount) % report.boxCount,
  };
}
export function encodeBoxDrag(
  scope: string,
  revision: number,
  source: PokemonPosition,
): string {
  return JSON.stringify({
    scope,
    revision,
    box: source.box,
    slot: source.slot,
  });
}
export function decodeBoxDrag(
  value: string,
  scope: string,
  revision: number,
  report: GalleryReport,
): PokemonPosition {
  if (value.length > 1024) throw Error("Invalid box drag.");
  let p: { scope?: string; revision?: number; box: number; slot: number };
  try {
    p = JSON.parse(value);
  } catch {
    throw Error("Invalid box drag.");
  }
  if (
    !p ||
    p.scope !== scope ||
    p.revision !== revision ||
    !inBox(report, p) ||
    !report.pokemon.some(
      (e) => e.box === p.box && e.slot === p.slot && e.valid && e.species > 0,
    )
  )
    throw Error("Stale or foreign box drag.");
  return { box: p.box, slot: p.slot };
}
export function boxDropEdit(
  report: GalleryReport,
  source: PokemonPosition,
  target: PokemonPosition,
  mode: GalleryDropMode,
  keys: GalleryModifiers,
): StorageEdit | undefined {
  if (
    !report.canEdit ||
    !report.checksumsValid ||
    !inBox(report, source) ||
    !inBox(report, target) ||
    !report.pokemon.some(
      (p) =>
        p.box === source.box &&
        p.slot === source.slot &&
        p.valid &&
        p.species > 0,
    ) ||
    !["auto", "copy", "overwrite"].includes(mode)
  )
    throw Error("Invalid box drop.");
  if (source.box === target.box && source.slot === target.slot)
    return undefined;
  // SlotUtil.GetDropModifier matches an exact modifier, not a flag subset.
  const modifier =
    keys.shiftKey && !keys.altKey && !keys.ctrlKey && !keys.metaKey
      ? "copy"
      : keys.altKey && !keys.shiftKey && !keys.ctrlKey && !keys.metaKey
        ? "overwrite"
        : mode;
  const occupied = report.pokemon.some(
    (p) => p.box === target.box && p.slot === target.slot && p.species > 0,
  );
  const action = modifier === "auto" ? (occupied ? "swap" : "move") : modifier;
  return { action, source: { ...source }, target: { ...target } };
}
export function boxSlotNavigation(
  slot: number,
  key: string,
  count: number,
  columns: number,
): number | undefined {
  const next =
    key === "ArrowLeft"
      ? slot - 1
      : key === "ArrowRight"
        ? slot + 1
        : key === "ArrowUp"
          ? slot - columns
          : key === "ArrowDown"
            ? slot + columns
            : key === "Home"
              ? 0
              : key === "End"
                ? count - 1
                : undefined;
  return next === undefined || count <= 0
    ? undefined
    : next < 0 || next >= count
      ? slot
      : next;
}
