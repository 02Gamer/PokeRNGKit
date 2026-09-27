import type { LocalizedText } from "./domain";
export interface SimpleDexFlag {
  species: number;
  seen: boolean;
  caught: boolean;
}
export interface SimpleDexEntry extends SimpleDexFlag {
  name: LocalizedText;
  canCatch: boolean;
}
export interface SimpleDexCatalog {
  generation: number;
  virtualConsole: boolean;
  canEdit: boolean;
  entries: SimpleDexEntry[];
}
export interface SimpleDexEdit {
  fileName: string;
  entries: SimpleDexFlag[];
}
export const dexDraft = (catalog: SimpleDexCatalog): SimpleDexFlag[] =>
  catalog.entries.map(({ species, seen, caught }) => ({
    species,
    seen,
    caught,
  }));
export function setAllDex(
  draft: SimpleDexFlag[],
  catalog: SimpleDexCatalog,
  field: "seen" | "caught",
  value: boolean,
): SimpleDexFlag[] {
  return draft.map((entry) => ({
    ...entry,
    [field]:
      field === "caught" && value
        ? !!catalog.entries.find((e) => e.species === entry.species)?.canCatch
        : value,
  }));
}
export function validateSimpleDex(
  fileName: string,
  draft: SimpleDexFlag[],
  catalog: SimpleDexCatalog,
): SimpleDexEdit {
  if (
    !catalog.canEdit ||
    !catalog.entries.length ||
    draft.length !== catalog.entries.length ||
    new Set(draft.map((e) => e.species)).size !== draft.length ||
    draft.some(
      (e) =>
        !Number.isInteger(e.species) ||
        !catalog.entries.some((c) => c.species === e.species) ||
        typeof e.seen !== "boolean" ||
        typeof e.caught !== "boolean",
    )
  )
    throw new Error(
      "Pokedex edit requires one complete seen/caught entry for each species.",
    );
  return { fileName, entries: draft.map((e) => ({ ...e })) };
}
