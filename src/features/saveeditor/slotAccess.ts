// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonPosition, SaveReport } from "./domain";
export interface SaveSlotAccessInfo {
  hasBox: boolean;
  hasParty: boolean;
  blocked: PokemonPosition[];
}
type SlotReport = Pick<SaveReport, "slotAccess" | "boxCount" | "boxSlotCount">;
export function slotCanWrite(report: SlotReport, position: PokemonPosition) {
  const access = report.slotAccess;
  if (
    !access ||
    !Number.isInteger(position.box) ||
    !Number.isInteger(position.slot) ||
    position.slot < 0
  )
    return false;
  // Core realigns any empty logical party position to PartyCount on write.
  if (position.box === -1) return access.hasParty && position.slot < 6;
  return (
    access.hasBox &&
    position.box >= 0 &&
    position.box < report.boxCount &&
    position.slot < report.boxSlotCount &&
    !access.blocked.some(
      (p) => p.box === position.box && p.slot === position.slot,
    )
  );
}
export function checkSlotAccess(report: SlotReport) {
  const access = report.slotAccess;
  const count = report.boxCount * report.boxSlotCount;
  if (
    !access ||
    typeof access.hasBox !== "boolean" ||
    typeof access.hasParty !== "boolean" ||
    !Number.isSafeInteger(report.boxCount) ||
    report.boxCount < 0 ||
    !Number.isSafeInteger(report.boxSlotCount) ||
    report.boxSlotCount < 0 ||
    !Number.isSafeInteger(count) ||
    count < 0 ||
    !Array.isArray(access.blocked) ||
    access.blocked.length > count
  )
    throw Error("Invalid save slot access metadata.");
  const seen = new Set<string>();
  for (const p of access.blocked) {
    if (
      !p ||
      !Number.isInteger(p.box) ||
      p.box < 0 ||
      p.box >= report.boxCount ||
      !Number.isInteger(p.slot) ||
      p.slot < 0 ||
      p.slot >= report.boxSlotCount ||
      !access.hasBox
    )
      throw Error("Invalid blocked storage slot.");
    const key = `${p.box}:${p.slot}`;
    if (seen.has(key)) throw Error("Duplicate blocked storage slot.");
    seen.add(key);
  }
}
