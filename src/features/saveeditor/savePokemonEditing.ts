// SPDX-License-Identifier: GPL-3.0-or-later
import type { SaveReport } from "./domain";
import type { GbPokemonEdit, GbSpecialEdit } from "./standalonePokemon";

export interface SavePokemonCapability {
  haX?: boolean;
  canEdit: boolean;
  editor: "none" | "gb" | "standard";
  canRaw: boolean;
  canImport: boolean;
  canStorage: boolean;
}
export interface GbSavePokemonEdit {
  box: number;
  slot: number;
  basic?: GbPokemonEdit;
  special?: GbSpecialEdit;
}
export function pokemonAccess(
  report: Pick<SaveReport, "canEdit" | "checksumsValid"> &
    Partial<Pick<SaveReport, "pokemonEditing">>,
): SavePokemonCapability {
  const access: SavePokemonCapability = report.pokemonEditing ?? {
    canEdit: report.canEdit,
    editor: report.canEdit ? "standard" : "none",
    canRaw: report.canEdit,
    canImport: report.canEdit,
    canStorage: report.canEdit,
  };
  return report.checksumsValid
    ? access
    : {
        ...access,
        canEdit: false,
        canRaw: false,
        canImport: false,
        canStorage: false,
      };
}
export function checkPokemonAccess(
  value: unknown,
): asserts value is SavePokemonCapability {
  if (!value || typeof value !== "object")
    throw new Error("Missing Pokemon editing capability.");
  const v = value as Record<string, unknown>;
  if (
    !["none", "gb", "standard"].includes(v.editor as string) ||
    (v.haX !== undefined && typeof v.haX !== "boolean") ||
    ["canEdit", "canRaw", "canImport", "canStorage"].some(
      (key) => typeof v[key] !== "boolean",
    ) ||
    (v.editor === "none" &&
      (v.canEdit || v.canRaw || v.canImport || v.canStorage)) ||
    (v.editor === "gb" && v.canRaw) ||
    (!v.canEdit && (v.canRaw || v.canImport || v.canStorage))
  )
    throw new Error("Invalid Pokemon editing capability.");
}
