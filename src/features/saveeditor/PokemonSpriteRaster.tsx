// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef } from "react";
import { pokemonArtwork, pokemonImage, pokemonOverlay } from "./art";
import {
  applySpritePixels,
  filterSpritePixels,
  type SpriteFilterProfile,
} from "./spritePixels";
import type { SpriteData } from "./PokemonSprite";

import {
  loadImage,
  drawArtwork,
  drawEgg,
  drawOverlay,
  newSurface,
  glowSurface,
  type ReadyImages,
} from "./spriteCanvas";
export function PokemonSpriteRaster({
  pokemon,
  filterProfile,
}: {
  pokemon: SpriteData;
  filterProfile?: SpriteFilterProfile;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const {
    species,
    sprite,
    eggOverlay,
    eggAsItem,
    itemOverlay,
    shinyOverlay,
    teraLayer,
    experienceLine,
    specialEffects,
    ballOverlay,
    encounterLayer,
    additionalMarker,
    legalityIndicator,
    slotMarkers,
    experienceBeforeMarkers,
  } = pokemon;
  const totemGlow = specialEffects?.totemGlow,
    shadowGlowSource = specialEffects?.shadowGlowSource,
    shadowEggAsItem = specialEffects?.shadowEggAsItem,
    markerKey = specialEffects?.marker;
  const color = teraLayer?.color,
    mode = teraLayer?.mode,
    thickness = teraLayer?.thickness,
    opacity = teraLayer?.opacity,
    experienceColor = experienceLine?.color,
    experienceWidth = experienceLine?.width;
  const encounterColor = encounterLayer?.color,
    encounterMode = encounterLayer?.mode,
    encounterThickness = encounterLayer?.thickness,
    encounterOpacity = encounterLayer?.opacity;
  useEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    let active = true;
    delete surface.dataset.ready;
    const item = itemOverlay ? pokemonOverlay(itemOverlay, "item") : undefined;
    const shiny = shinyOverlay
      ? pokemonOverlay(shinyOverlay, "shiny")
      : undefined;
    const marker = markerKey ? pokemonOverlay(markerKey, "marker") : undefined;
    const ball = ballOverlay ? pokemonOverlay(ballOverlay, "ball") : undefined;
    const additional = additionalMarker
      ? pokemonOverlay(additionalMarker, "marker")
      : undefined;
    const legality = legalityIndicator
      ? pokemonOverlay(legalityIndicator, "legality")
      : undefined;
    const storageMarkers = (slotMarkers ?? []).flatMap((key) => {
      const layer = pokemonOverlay(key, "slot");
      return layer ? [layer] : [];
    });
    const shadowArt = shadowGlowSource
      ? pokemonArtwork({ species, sprite: shadowGlowSource })
      : undefined;
    const artwork = pokemonArtwork({ species, sprite });
    const urls = [artwork.image];
    if (artwork.unknownOverlay) urls.push(artwork.unknownOverlay);
    const eggUrl = eggOverlay
      ? pokemonImage({ species, sprite: eggOverlay })
      : undefined;
    if (eggUrl) urls.push(eggUrl);
    if (item) urls.push(item.url);
    if (shiny) urls.push(shiny.url);
    if (ball) urls.push(ball.url);
    if (marker) urls.push(marker.url);
    if (additional) urls.push(additional.url);
    if (legality) urls.push(legality.url);
    for (const layer of storageMarkers) urls.push(layer.url);
    if (shadowArt) {
      urls.push(shadowArt.image);
      if (shadowArt.unknownOverlay) urls.push(shadowArt.unknownOverlay);
    }
    void Promise.all(urls.map(loadImage))
      .then((loaded) => {
        if (!active) return;
        const ready: ReadyImages = new Map(
          urls.map((url, index) => [url, loaded[index]]),
        );
        const egg = eggUrl ? ready.get(eggUrl) : undefined;
        const ctx = surface.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.clearRect(0, 0, 68, 56);
        drawArtwork(ctx, artwork, ready);
        if (
          totemGlow &&
          !artwork.unknownOverlay &&
          !artwork.image.endsWith("/b_unknown.png")
        )
          ctx.drawImage(glowSurface(ctx, "#FFA500"), 0, 0);
        drawEgg(ctx, egg, Boolean(eggAsItem));
        drawOverlay(ctx, item, ready);
        drawOverlay(ctx, shiny, ready);
        drawOverlay(ctx, ball, ready);
        drawOverlay(ctx, marker, ready);
        drawOverlay(ctx, additional, ready);
        if (shadowArt) {
          const glow = newSurface();
          drawArtwork(glow.ctx, shadowArt, ready);
          drawEgg(glow.ctx, egg, Boolean(shadowEggAsItem));
          drawOverlay(glow.ctx, shiny, ready);
          ctx.globalCompositeOperation = "destination-over";
          ctx.drawImage(glowSurface(glow.ctx, "#82004B"), 0, 0);
          ctx.globalCompositeOperation = "source-over";
        }
        const initial = ctx.getImageData(0, 0, 68, 56);
        applySpritePixels(
          initial.data,
          color !== undefined &&
            mode !== undefined &&
            thickness !== undefined &&
            opacity !== undefined
            ? { color, mode, thickness, opacity }
            : undefined,
        );
        ctx.putImageData(initial, 0, 0);
        drawOverlay(ctx, legality, ready);
        const pixels = ctx.getImageData(0, 0, 68, 56);
        applySpritePixels(
          pixels.data,
          undefined,
          experienceBeforeMarkers &&
            experienceColor !== undefined &&
            experienceWidth !== undefined
            ? { color: experienceColor, width: experienceWidth }
            : undefined,
          encounterColor !== undefined &&
            encounterMode !== undefined &&
            encounterThickness !== undefined &&
            encounterOpacity !== undefined
            ? {
                color: encounterColor,
                mode: encounterMode,
                thickness: encounterThickness,
                opacity: encounterOpacity,
              }
            : undefined,
        );
        ctx.putImageData(pixels, 0, 0);
        for (const layer of storageMarkers) drawOverlay(ctx, layer, ready);
        const finalPixels = ctx.getImageData(0, 0, 68, 56);
        if (
          !experienceBeforeMarkers &&
          experienceColor !== undefined &&
          experienceWidth !== undefined
        )
          applySpritePixels(finalPixels.data, undefined, {
            color: experienceColor,
            width: experienceWidth,
          });
        if (filterProfile) filterSpritePixels(finalPixels.data, filterProfile);
        ctx.putImageData(finalPixels, 0, 0);
        surface.dataset.ready = "true";
      })
      .catch(() => {
        // Keep the existing SVG visible if loading or Canvas is unavailable.
        if (active) delete surface.dataset.ready;
      });
    return () => {
      active = false;
      delete surface.dataset.ready;
    };
  }, [
    species,
    sprite,
    eggOverlay,
    eggAsItem,
    itemOverlay,
    shinyOverlay,
    color,
    mode,
    thickness,
    opacity,
    experienceColor,
    experienceWidth,
    totemGlow,
    shadowGlowSource,
    shadowEggAsItem,
    markerKey,
    ballOverlay,
    additionalMarker,
    encounterColor,
    encounterMode,
    encounterThickness,
    encounterOpacity,
    legalityIndicator,
    filterProfile,
    slotMarkers,
    experienceBeforeMarkers,
  ]);
  return (
    <canvas
      ref={canvas}
      className="save-pokemon-art-raster"
      width={68}
      height={56}
      aria-hidden="true"
    />
  );
}
