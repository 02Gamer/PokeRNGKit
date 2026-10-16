// SPDX-License-Identifier: GPL-3.0-or-later
import type {
  PokemonEntry,
  PokemonPosition,
  SaveReport,
  StorageEdit,
} from "./domain";
import { pokemonAccess } from "./savePokemonEditing";
import { slotCanWrite } from "./slotAccess";
export function storageActionAllowed(
  report: SaveReport,
  source: PokemonEntry,
  target: PokemonPosition,
  action: StorageEdit["action"],
) {
  if (!pokemonAccess(report).canStorage) return false;
  const sourcePosition = { box: source.box, slot: source.slot };
  if (action !== "copy" && !slotCanWrite(report, sourcePosition)) return false;
  if (action === "delete") return true;
  if (
    !source.valid ||
    source.species === 0 ||
    !slotCanWrite(report, target) ||
    (source.box === target.box && source.slot === target.slot)
  )
    return false;
  return (
    action !== "move" ||
    !report.pokemon.some(
      (p) => p.box === target.box && p.slot === target.slot && p.species > 0,
    )
  );
}
