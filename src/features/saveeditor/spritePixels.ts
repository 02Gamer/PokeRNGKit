// SPDX-License-Identifier: GPL-3.0-or-later
// PKHeX.Drawing ImageUtil.SetAllTransparencyTo / BlendAllTransparencyTo and
// PKHeX.Drawing.PokeSprite SpriteUtil.ApplyColor / ApplyExperience.
export type SpriteColorLayer = {
  color: string;
  mode: number;
  thickness: number;
  opacity: number;
};
export type SpriteExperienceLine = { color: string; width: number };
export type SpriteFilterProfile = {
  grayscale: number;
  alpha: readonly number[];
};
export const defaultSpriteFilter: SpriteFilterProfile = {
  grayscale: Math.fround(0.7),
  alpha: Array.from(
    { length: 256 },
    (_, alpha) => Math.trunc(alpha * Math.fround(0.4)) & 255,
  ),
};
export function filterSpritePixels(
  pixels: Uint8ClampedArray,
  profile: SpriteFilterProfile,
) {
  if (
    pixels.length !== 68 * 56 * 4 ||
    profile.alpha.length !== 256 ||
    !profile.alpha.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 255,
    ) ||
    !Number.isFinite(profile.grayscale)
  )
    throw new Error("Invalid sprite filter profile.");
  const intensity = Math.fround(profile.grayscale),
    inverse = Math.fround(1 - intensity);
  for (let i = pixels.length - 4; i >= 0; i -= 4) {
    if (
      pixels[i + 3] !== 0 &&
      intensity > Math.fround(0.01) &&
      intensity <= 1
    ) {
      const gray = Math.trunc(
        0.3 * pixels[i] + 0.59 * pixels[i + 1] + 0.11 * pixels[i + 2],
      );
      for (let channel = 0; channel < 3; channel++)
        pixels[i + channel] = Math.trunc(
          Math.fround(
            Math.fround(pixels[i + channel] * inverse) +
              Math.fround(gray * intensity),
          ),
        );
    }
    pixels[i + 3] = profile.alpha[pixels[i + 3]];
  }
  return pixels;
}
export type SpriteSpecialEffects = {
  totemGlow: boolean;
  shadowGlowSource: string | null;
  shadowEggAsItem: boolean;
  marker: string | null;
};
function rgb(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Invalid sprite color.");
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}
// ImageUtil.GlowEdges / SetAllUsedPixelsOpaque / RemovePixels. The source
// operates on BGRA; Canvas uses RGBA, so the donor blue channel is index 2.
export function spriteGlow(
  pixels: Uint8ClampedArray,
  color: string,
  hollow = true,
) {
  if (pixels.length !== 68 * 56 * 4) throw new Error("Invalid glow canvas.");
  const result = pixels.slice();
  const glowColor = rgb(color);
  for (let i = 0; i < result.length; i += 4) {
    if (hollow && result[i + 3] >= 128) result[i + 3] = 255;
    result[i + 2] = 0;
  }
  for (let i = result.length - 4; i >= 0; i -= 4) {
    if (result[i + 3] < 128) continue;
    const x = (i / 4) % 68,
      y = Math.trunc(i / 4 / 68);
    for (let ix = Math.max(0, x - 3); ix <= Math.min(67, x + 3); ix++)
      for (let iy = Math.max(0, y - 3); iy <= Math.min(55, y + 3); iy++) {
        const donor = (iy * 68 + ix) * 4 + 2;
        result[donor] += Math.trunc(0.0777 * (255 - result[donor]));
      }
  }
  for (let i = result.length - 4; i >= 0; i -= 4) {
    const alpha = result[i + 2];
    if (alpha) result.set([...glowColor, alpha], i);
    if (hollow && pixels[i + 3] >= 128) result.fill(0, i, i + 4);
  }
  return result;
}
export function applySpritePixels(
  pixels: Uint8ClampedArray,
  background?: SpriteColorLayer | null,
  experience?: SpriteExperienceLine | null,
  encounter?: SpriteColorLayer | null,
) {
  const width = 68,
    height = 56;
  if (pixels.length !== width * height * 4)
    throw new Error("Invalid source sprite canvas.");
  for (const layer of [background, encounter]) {
    if (!layer || layer.mode === 0) continue;
    const color = rgb(layer.color);
    if (
      ![1, 2, 3].includes(layer.mode) ||
      !Number.isInteger(layer.thickness) ||
      !Number.isInteger(layer.opacity) ||
      layer.opacity < 0 ||
      layer.opacity > 255
    )
      throw new Error("Invalid sprite background.");
    const thickness =
      layer.thickness < 0 || layer.thickness > height
        ? height
        : Math.trunc(layer.thickness);
    const start = layer.mode === 1 ? height - thickness : 0;
    const end = layer.mode === 3 ? thickness : height;
    for (let i = start * width * 4; i < end * width * 4; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha < 128) {
        pixels.set([...color, layer.opacity], i);
      } else if (layer.mode !== 2 && alpha !== 255) {
        // Upstream BlendColor uses 20% original and 80% background, with
        // byte truncation; this is not ordinary alpha compositing.
        for (let channel = 0; channel < 3; channel++)
          pixels[i + channel] = Math.trunc(
            pixels[i + channel] * 0.2 + color[channel] * 0.8,
          );
        pixels[i + 3] = Math.trunc(alpha * 0.2 + layer.opacity * 0.8);
      }
    }
  }
  if (experience) {
    const color = rgb(experience.color);
    if (
      !Number.isInteger(experience.width) ||
      experience.width < 0 ||
      experience.width > width
    )
      throw new Error("Invalid sprite experience width.");
    for (let x = 0; x < experience.width; x++)
      pixels.set([...color, 255], ((height - 1) * width + x) * 4);
  }
  return pixels;
}
