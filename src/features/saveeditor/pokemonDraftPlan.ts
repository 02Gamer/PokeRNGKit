// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonVitalsEdit } from "./pokemonVitals";
import type { PokemonEdit } from "./PokemonEditor";
import type { PokemonRawEdit } from "./domain";
import type { GbPokemonEdit, GbSpecialEdit } from "./standalonePokemon";
export type PokemonBasicField = Exclude<keyof PokemonEdit, "box" | "slot">;
export type PokemonDraftStep =
  | { kind: "vitals"; edits: PokemonVitalsEdit[] }
  | {
      kind: "basic";
      fields: PokemonBasicField[];
      edit: Omit<PokemonEdit, "box" | "slot">;
    }
  | { kind: "raw"; edit: Omit<PokemonRawEdit, "box" | "slot"> }
  | { kind: "gb"; fields: (keyof GbPokemonEdit)[]; edit: GbPokemonEdit }
  | { kind: "gbSpecial"; edit: GbSpecialEdit };
export interface PokemonDraftCapture {
  scope: string;
  sections: { section: string; steps: PokemonDraftStep[] }[];
}
export function rawDraftSteps(
  edit: Omit<PokemonRawEdit, "box" | "slot"> | PokemonRawEdit | undefined,
): PokemonDraftStep[] {
  if (!edit) return [];
  const plain = { ...edit } as Partial<PokemonRawEdit>;
  delete plain.box;
  delete plain.slot;
  return [{ kind: "raw", edit: plain as Omit<PokemonRawEdit, "box" | "slot"> }];
}
export function changedDraftKeys<T extends object>(
  current: T,
  initial: T,
): (keyof T)[] {
  return (Object.keys(current) as (keyof T)[]).filter(
    (key) => JSON.stringify(current[key]) !== JSON.stringify(initial[key]),
  );
}
export function basicDraftSteps(
  edit: PokemonEdit,
  changed: readonly string[],
): PokemonDraftStep[] {
  const allowed = new Set([
    "nickname",
    "ot",
    "level",
    "friendship",
    "tid",
    "sid",
    "trainerIds",
    "ivs",
    "evs",
    "moves",
    "movePp",
    "movePpUps",
    "nature",
    "statAlignment",
    "abilityIndex",
    "heldItem",
    "identity",
  ]);
  const fields = new Set<PokemonBasicField>();
  for (const key of changed) {
    if (["species", "form", "gender", "useSpeciesName"].includes(key)) {
      if (edit.identity) fields.add("identity");
    } else if (key === "tid" || key === "sid") {
      if (edit.trainerIds) fields.add("trainerIds");
      else fields.add(key);
    } else {
      if (!allowed.has(key)) throw Error("Unknown basic draft field");
      if (edit[key as PokemonBasicField] != null)
        fields.add(key as PokemonBasicField);
    }
  }
  if (!fields.size) return [];
  const { box: _box, slot: _slot, ...values } = edit;
  void _box;
  void _slot;
  return [{ kind: "basic", fields: [...fields], edit: values }];
}
