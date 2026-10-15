// SPDX-License-Identifier: GPL-3.0-or-later
import { pokemonArtwork, pokemonImage, pokemonOverlay } from "./art";
import { spriteGlow } from "./spritePixels";
import type { SpriteData } from "./PokemonSprite";
const images = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(url: string) {
  let pending = images.get(url);
  if (pending) return pending;
  pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (images.get(url) === pending) images.delete(url);
      reject(new Error("Local sprite could not be loaded."));
    };
    img.src = url;
  });
  if (images.size >= 512) images.delete(images.keys().next().value!);
  images.set(url, pending);
  return pending;
}
export type ReadyImages = ReadonlyMap<string, HTMLImageElement>;
export function drawArtwork(
  ctx: CanvasRenderingContext2D,
  art: ReturnType<typeof pokemonArtwork>,
  ready: ReadyImages,
) {
  ctx.globalAlpha = 1;
  ctx.drawImage(ready.get(art.image)!, 0, 0, 68, 56);
  if (art.unknownOverlay) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(ready.get(art.unknownOverlay)!, 0, 0, 68, 56);
    ctx.globalAlpha = 1;
  }
}
export function drawEgg(
  ctx: CanvasRenderingContext2D,
  egg: HTMLImageElement | undefined,
  asItem: boolean,
) {
  if (!egg) return;
  if (!asItem) {
    const base = ctx.getImageData(0, 0, 68, 56);
    for (let i = 3; i < base.data.length; i += 4)
      base.data[i] = Math.trunc(base.data[i] * 0.33);
    ctx.putImageData(base, 0, 0);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(egg, asItem ? 18 : 0, asItem ? 1 : 0, 68, 56);
}
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  layer: ReturnType<typeof pokemonOverlay>,
  ready: ReadyImages,
) {
  if (!layer) return;
  ctx.globalAlpha = layer.opacity;
  ctx.drawImage(
    ready.get(layer.url)!,
    layer.x,
    layer.y,
    layer.width,
    layer.height,
  );
  ctx.globalAlpha = 1;
}
export function newSurface() {
  const surface = document.createElement("canvas");
  surface.width = 68;
  surface.height = 56;
  const ctx = surface.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Sprite canvas is unavailable.");
  return { surface, ctx };
}
export function glowSurface(ctx: CanvasRenderingContext2D, color: string) {
  const glow = newSurface(),
    pixels = ctx.getImageData(0, 0, 68, 56);
  pixels.data.set(spriteGlow(pixels.data, color));
  glow.ctx.putImageData(pixels, 0, 0);
  return glow.surface;
}
// Input is the dedicated GetSpriteGlow(PKM) artwork, not the slot's decorated
// sprite. Reuse the same loader and compositing operations as ordinary sprites.
export async function hoverGlowPixels(pokemon: SpriteData) {
  const art = pokemonArtwork(pokemon);
  const eggUrl = pokemon.eggOverlay
    ? pokemonImage({ species: pokemon.species, sprite: pokemon.eggOverlay })
    : undefined;
  const shiny = pokemon.shinyOverlay
    ? pokemonOverlay(pokemon.shinyOverlay, "shiny")
    : undefined;
  const urls = [art.image, art.unknownOverlay, eggUrl, shiny?.url].filter(
    (value): value is string => Boolean(value),
  );
  const loaded = await Promise.all(urls.map(loadImage));
  const ready = new Map(urls.map((url, index) => [url, loaded[index]]));
  const { ctx } = newSurface();
  drawArtwork(ctx, art, ready);
  if (
    pokemon.specialEffects?.totemGlow &&
    !art.unknownOverlay &&
    !art.image.endsWith("/b_unknown.png")
  )
    ctx.drawImage(glowSurface(ctx, "#FFA500"), 0, 0);
  drawEgg(
    ctx,
    eggUrl ? ready.get(eggUrl) : undefined,
    Boolean(pokemon.eggAsItem),
  );
  drawOverlay(ctx, shiny, ready);
  return spriteGlow(
    ctx.getImageData(0, 0, 68, 56).data,
    "#FFFFFF",
    Boolean(eggUrl),
  );
}
