// SPDX-License-Identifier: GPL-3.0-or-later
// Wallpaper selection follows PKHeX.Drawing.Misc/Util/WallpaperUtil.cs.
import manifest from "./art-manifest.json";
import overlayDimensions from "./sprite-overlay-dimensions.json";
import type { PokemonEntry, SaveReport } from "./domain";

const assets: Readonly<Record<string, string>> = manifest;
const dimensions: Readonly<Record<string, { width: number; height: number }>> =
  overlayDimensions;
const url = (key: string) =>
  `${import.meta.env.BASE_URL}save-art/26.08.26/${assets[key]}`;
export const databaseWallpaperImage = () => url("box_wp_clean");
export const researchBonusImage = () => url("research_bonus_points");
export function pokemonStatusImage(choice: number) {
  const key = (
    {
      [-1]: "sickfaint",
      1: "sicksleep",
      8: "sickpoison",
      16: "sickburn",
      32: "sickfrostbite",
      64: "sickparalyze",
      128: "sicktoxic",
    } as Record<number, string>
  )[choice];
  return key && assets[key] ? url(key) : undefined;
}
export function typeIconImage(type: number) {
  const key = `type_icon_s_${String(type).padStart(2, "0")}`;
  return assets[key] ? url(key) : undefined;
}
export function typeWideImage(type: number) {
  const key = `type_wide_${String(type).padStart(2, "0")}`;
  return assets[key] ? url(key) : undefined;
}

// Resource keys follow PKHeX.Drawing.Misc/Util/DonutSpriteUtil.cs.
export function donutImage(sprite: string) {
  return sprite.startsWith("donut_") && assets[sprite]
    ? url(sprite)
    : undefined;
}
export function donutEffectImage(sprite: string) {
  return /^(sweet|spicy|fresh|bitter|sour)_/.test(sprite) && assets[sprite]
    ? url(sprite)
    : undefined;
}
export const donutProfileImage = () =>
  assets.flavorprofile ? url("flavorprofile") : undefined;
export const donutStarImage = () => (assets.star ? url("star") : undefined);
export function donutBerryImage(id: number) {
  const key = `aitem_${id}`;
  return id > 0 && assets[key] ? url(key) : undefined;
}

export function itemImage(sprite: string) {
  if (!sprite) return undefined;
  return url(
    sprite.startsWith("bitem_") && assets[sprite] ? sprite : "bitem_unk",
  );
}
export function pokemonOverlay(
  sprite: string,
  kind: "item" | "shiny" | "marker" | "ball" | "legality" | "slot",
) {
  const valid =
    kind === "item"
      ? /^[ab]item_[\w]+$/.test(sprite)
      : kind === "shiny"
        ? /^rare_icon_alt(?:_2)?$/.test(sprite)
        : kind === "marker"
          ? /^(dyna|alpha_alt)$/.test(sprite)
          : kind === "ball"
            ? /^_ball\d+$/.test(sprite)
            : kind === "legality"
              ? /^(warn|hint)$/.test(sprite)
              : /^(team|locked|party[1-6]|starter)$/.test(sprite);
  const key =
    valid && assets[sprite] && dimensions[sprite]
      ? sprite
      : kind === "item"
        ? "bitem_unk"
        : kind === "ball"
          ? "_ball4"
          : undefined;
  if (!key) return;
  const size = dimensions[key];
  return {
    key,
    url: url(key),
    width: size.width,
    height: size.height,
    x:
      kind === "item"
        ? 68 - size.width - Math.trunc((32 - size.width) / 4) - 2
        : kind === "marker"
          ? key === "dyna"
            ? Math.trunc((68 - size.width) / 2)
            : 49
          : kind === "slot"
            ? key === "team"
              ? 49
              : key === "locked"
                ? 54
                : key.startsWith("party")
                  ? 52
                  : 0
            : 0,
    y:
      kind === "item"
        ? 56 - size.height - 2
        : kind === "ball"
          ? 56 - size.height
          : kind === "legality"
            ? 40
            : 0,
    opacity: kind === "shiny" ? 0.7 : 1,
  };
}

// PKHeX.Drawing.Misc PlayerSpriteUtil uses tr_00 when the stored resource is absent.
export function trainerImage(sprite: string) {
  return url(sprite.startsWith("tr_") && assets[sprite] ? sprite : "tr_00");
}

// PKHeX.Drawing.Misc RibbonSpriteUtil and RibbonEditor numeric sprite rules.
export function ribbonImage(
  key: string,
  max: number,
  value: number,
  generation: number,
) {
  let resource: string;
  if (max === 1) resource = key.replace("CountG3", "G3").toLowerCase();
  else if (max === 4) {
    resource = key.replace("Count", "").toLowerCase();
    resource +=
      value === 2
        ? "super"
        : value === 3
          ? "hyper"
          : value === 4
            ? "master"
            : "";
  } else {
    const threshold =
      key === "RibbonCountMemoryBattle" && generation >= 9 ? 7 : max;
    resource = key.toLowerCase() + (value >= threshold ? "2" : "");
  }
  return assets[resource] ? url(resource) : undefined;
}

export function speciesImage(species: number) {
  return url(assets[`b_${species}`] ? `b_${species}` : "b_unknown");
}

export function pokemonArtwork(
  pokemon: Pick<PokemonEntry, "species" | "sprite">,
) {
  const prefix = /^[abc]_/.test(pokemon.sprite) ? pokemon.sprite[0] : "b";
  const secondary = prefix === "b" ? "c" : "b";
  const base = pokemon.sprite.replace(/^[abc]/, "");
  const nonShiny = pokemon.sprite.endsWith("s") ? base.slice(0, -1) : base;
  const choices = [
    pokemon.sprite,
    `${secondary}${base}`,
    `${prefix}${nonShiny}`,
    `${secondary}${nonShiny}`,
  ];
  const key = choices.find((value) => assets[value]);
  if (key) return { image: url(key) };
  const baseSpecies = `${prefix}_${pokemon.species}`;
  return assets[baseSpecies]
    ? { image: url(baseSpecies), unknownOverlay: url("b_unknown") }
    : { image: url("b_unknown") };
}
export function pokemonImage(
  pokemon: Pick<PokemonEntry, "species" | "sprite">,
) {
  return pokemonArtwork(pokemon).image;
}

export function boxWallpaper(report: SaveReport, box: number) {
  const entry = report.boxes.find((entry) => entry.index === box);
  const index = (entry?.wallpaper ?? -1) + 1;
  let key = "box_wp16xy";
  if (report.format === "SAV8LA") key = "box_wp01bdsp";
  else if (report.format === "SAV9ZA") key = "box_wp02bdsp";
  else if (index > 0) {
    const suffix =
      report.format === "SAV3E"
        ? "e"
        : report.format === "SAV3FRLG" && index > 12
          ? "frlg"
          : report.generation === 3
            ? "rs"
            : report.format === "SAV4Pt" && index > 16
              ? "pt"
              : report.format === "SAV4HGSS" && index > 16
                ? "hgss"
                : report.generation === 4
                  ? "dp"
                  : report.format === "SAV5B2W2" && index > 16
                    ? "b2w2"
                    : report.generation === 5
                      ? "bw"
                      : report.format === "SAV6AO" && index > 16
                        ? "ao"
                        : report.generation === 6 || report.generation === 7
                          ? "xy"
                          : report.format === "SAV8BS"
                            ? "bdsp"
                            : report.format === "SAV8SWSH"
                              ? "swsh"
                              : report.format === "SAV9SV"
                                ? "sv"
                                : "";
    const variant =
      report.format === "SAV9SV" && index === 20
        ? report.version === "SL"
          ? "_n"
          : "_u"
        : "";
    const candidate = `box_wp${String(index).padStart(2, "0")}${suffix}${variant}`;
    if (assets[candidate]) key = candidate;
  }
  return url(key);
}
