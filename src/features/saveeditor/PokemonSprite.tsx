// SPDX-License-Identifier: GPL-3.0-or-later
import type { ImgHTMLAttributes } from "react";
import { pokemonArtwork, pokemonImage, pokemonOverlay } from "./art";
import "./PokemonSprite.css";
import { PokemonSpriteRaster } from "./PokemonSpriteRaster";
import type {
  SpriteColorLayer,
  SpriteExperienceLine,
  SpriteSpecialEffects,
  SpriteFilterProfile,
} from "./spritePixels";
export type SpriteData = {
  species: number;
  sprite: string;
  eggOverlay?: string | null;
  eggAsItem?: boolean;
  itemOverlay?: string | null;
  shinyOverlay?: string | null;
  teraLayer?: SpriteColorLayer | null;
  experienceLine?: SpriteExperienceLine | null;
  specialEffects?: SpriteSpecialEffects | null;
  ballOverlay?: string | null;
  encounterLayer?: SpriteColorLayer | null;
  additionalMarker?: string | null;
  legalityIndicator?: string | null;
  slotMarkers?: readonly string[] | null;
  experienceBeforeMarkers?: boolean;
};
export function PokemonSprite({
  pokemon,
  filterProfile,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  pokemon: SpriteData;
  filterProfile?: SpriteFilterProfile;
}) {
  const artwork = pokemonArtwork(pokemon);
  const slotMarkers = (pokemon.slotMarkers ?? []).flatMap((key) => {
    const layer = pokemonOverlay(key, "slot");
    return layer ? [layer] : [];
  });
  const legality = pokemon.legalityIndicator
    ? pokemonOverlay(pokemon.legalityIndicator, "legality")
    : undefined;
  const ball = pokemon.ballOverlay
    ? pokemonOverlay(pokemon.ballOverlay, "ball")
    : undefined;
  const additional = pokemon.additionalMarker
    ? pokemonOverlay(pokemon.additionalMarker, "marker")
    : undefined;
  const marker = pokemon.specialEffects?.marker
    ? pokemonOverlay(pokemon.specialEffects.marker, "marker")
    : undefined;
  const glow = Boolean(
    pokemon.specialEffects?.totemGlow ||
    pokemon.specialEffects?.shadowGlowSource,
  );
  const item = pokemon.itemOverlay
    ? pokemonOverlay(pokemon.itemOverlay, "item")
    : undefined;
  const shiny = pokemon.shinyOverlay
    ? pokemonOverlay(pokemon.shinyOverlay, "shiny")
    : undefined;
  if (
    !pokemon.eggOverlay &&
    !item &&
    !shiny &&
    !artwork.unknownOverlay &&
    !ball &&
    !additional &&
    !pokemon.encounterLayer &&
    !legality &&
    !filterProfile &&
    !slotMarkers.length &&
    !marker &&
    !glow &&
    !pokemon.teraLayer &&
    !pokemon.experienceLine
  )
    return <img {...props} src={artwork.image} />;
  const width = props.width ?? 68,
    height = props.height ?? 56;
  return (
    <span
      className={["save-pokemon-art", props.className]
        .filter(Boolean)
        .join(" ")}
      data-egg-item={
        pokemon.eggOverlay ? Boolean(pokemon.eggAsItem) : undefined
      }
      draggable={props.draggable}
      style={{
        width: props.width,
        height: props.height,
        aspectRatio: `${width}/${height}`,
        ...props.style,
      }}
      title={props.title}
      id={props.id}
      role={props.alt ? "img" : undefined}
      aria-label={props.alt || undefined}
      aria-hidden={props.alt ? undefined : true}
    >
      {(pokemon.teraLayer ||
        pokemon.experienceLine ||
        pokemon.encounterLayer ||
        glow ||
        filterProfile ||
        legality) && (
        <PokemonSpriteRaster pokemon={pokemon} filterProfile={filterProfile} />
      )}
      <svg viewBox="0 0 68 56" aria-hidden="true">
        <g opacity={pokemon.eggOverlay && !pokemon.eggAsItem ? 0.33 : 1}>
          <image
            className="save-pokemon-art-base"
            href={artwork.image}
            width={68}
            height={56}
          />
          {artwork.unknownOverlay && (
            <image
              className="save-pokemon-art-unknown"
              href={artwork.unknownOverlay}
              width={68}
              height={56}
              opacity={0.5}
            />
          )}
        </g>
        {pokemon.eggOverlay && (
          <image
            className="save-pokemon-art-egg"
            href={pokemonImage({
              species: pokemon.species,
              sprite: pokemon.eggOverlay,
            })}
            x={pokemon.eggAsItem ? 18 : 0}
            y={pokemon.eggAsItem ? 1 : 0}
            width={68}
            height={56}
          />
        )}
        {item && (
          <image
            className="save-pokemon-art-item"
            href={item.url}
            x={item.x}
            y={item.y}
            width={item.width}
            height={item.height}
          />
        )}
        {shiny && (
          <image
            className="save-pokemon-art-shiny"
            href={shiny.url}
            x={shiny.x}
            y={shiny.y}
            width={shiny.width}
            height={shiny.height}
            opacity={shiny.opacity}
          />
        )}
        {ball && (
          <image
            className="save-pokemon-art-ball"
            href={ball.url}
            x={ball.x}
            y={ball.y}
            width={ball.width}
            height={ball.height}
          />
        )}
        {marker && (
          <image
            className="save-pokemon-art-marker"
            href={marker.url}
            x={marker.x}
            y={marker.y}
            width={marker.width}
            height={marker.height}
          />
        )}
        {additional && (
          <image
            className="save-pokemon-art-additional"
            href={additional.url}
            x={additional.x}
            y={additional.y}
            width={additional.width}
            height={additional.height}
          />
        )}
        {legality && (
          <image
            className="save-pokemon-art-legality"
            href={legality.url}
            x={legality.x}
            y={legality.y}
            width={legality.width}
            height={legality.height}
          />
        )}
        {slotMarkers.map((layer, index) => (
          <image
            key={`${layer.key}:${index}`}
            className="save-pokemon-art-slot"
            href={layer.url}
            x={layer.x}
            y={layer.y}
            width={layer.width}
            height={layer.height}
          />
        ))}
      </svg>
    </span>
  );
}
