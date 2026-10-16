// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonPosition, SaveReport } from "./domain";
import { pokemonAccess } from "./savePokemonEditing";
import { slotCanWrite } from "./slotAccess";
import type { GalleryModifiers } from "./boxGallery";
export type SlotAction = "view" | "set" | "delete" | "legality";
export interface SlotMenuInvocation {
  position: PokemonPosition;
  trigger: HTMLElement;
  x: number;
  y: number;
  keys: GalleryModifiers;
}
export function slotMenuModifiers({
  ctrlKey,
  shiftKey,
  altKey,
  metaKey,
}: GalleryModifiers): GalleryModifiers {
  return { ctrlKey, shiftKey, altKey, metaKey };
}
export function slotLegalityAlwaysVisible(json: string): boolean {
  if (!json) return false;
  const value = JSON.parse(json).display?.slotLegalityAlwaysVisible;
  if (typeof value !== "boolean")
    throw Error("Invalid slot legality visibility setting");
  return value;
}
/** ContextMenuSAV.MenuOpening: exact Control, occupancy, and callback availability. */
export function slotMenuActions(
  report: SaveReport,
  position: PokemonPosition,
  keys: GalleryModifiers,
  always: boolean,
  busy: boolean,
  canAnalyze = true,
  canSet = false,
): SlotAction[] {
  if (busy) return [];
  const inside =
    Number.isInteger(position.slot) &&
    position.slot >= 0 &&
    Number.isInteger(position.box) &&
    (position.box === -1
      ? position.slot < (canSet ? 6 : report.partyCount)
      : position.box >= 0 &&
        position.box < report.boxCount &&
        position.slot < report.boxSlotCount);
  const p =
    inside &&
    report.pokemon.find(
      (p) => p.box === position.box && p.slot === position.slot,
    );
  if (!inside) return [];
  const occupied = !!p && p.species > 0;
  const result: SlotAction[] = occupied ? ["view"] : [];
  const writable =
    pokemonAccess(report).canStorage && slotCanWrite(report, position);
  if (canSet && writable) result.push("set");
  if (occupied && writable) result.push("delete");
  if (
    occupied &&
    canAnalyze &&
    (always ||
      (keys.ctrlKey && !keys.shiftKey && !keys.altKey && !keys.metaKey))
  )
    result.push("legality");
  return result;
}
export function slotMenuKey(key: string, shift: boolean) {
  return key === "ContextMenu" || (key === "F10" && shift);
}
export function menuFocusIndex(index: number, key: string, count: number) {
  if (!count) return undefined;
  switch (key) {
    case "ArrowDown":
      return (index + 1 + count) % count;
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return undefined;
  }
}
export const slotMenuWords = {
  zh: {
    menu: "格位菜单",
    view: "查看宝可梦",
    set: "放入当前编辑的宝可梦",
    delete: "删除这只宝可梦",
    legality: "检查合法性",
    error: "格位操作未完成，请检查当前存档和受保护格位。",
  },
  en: {
    menu: "Slot menu",
    view: "View Pokémon",
    set: "Set the edited Pokémon",
    delete: "Delete this Pokémon",
    legality: "Check legality",
    error:
      "The slot action failed. Check the current save and protected slots.",
  },
  ja: {
    menu: "スロットメニュー",
    view: "ポケモンを表示",
    set: "編集中のポケモンを配置",
    delete: "このポケモンを削除",
    legality: "合法性を確認",
    error:
      "スロットの操作に失敗しました。現在のセーブと保護されたスロットを確認してください。",
  },
};
