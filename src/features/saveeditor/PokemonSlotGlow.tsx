// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { SpriteData } from "./PokemonSprite";
import { hoverGlowPixels } from "./spriteCanvas";

export function PokemonSlotGlow({
  target,
  artwork,
}: {
  target: HTMLButtonElement;
  artwork: SpriteData;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let active = true;
    const picture = target.querySelector<HTMLElement>(".save-pokemon-art, img");
    if (!picture) return;
    const bounds = picture.getBoundingClientRect();
    const host = target.getBoundingClientRect();
    Object.assign(element.style, {
      left: `${bounds.left - host.left - target.clientLeft}px`,
      top: `${bounds.top - host.top - target.clientTop}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    });
    void hoverGlowPixels(artwork)
      .then((pixels) => {
        if (!active || !target.isConnected || document.hidden) return;
        const ctx = element.getContext("2d");
        if (!ctx) return;
        const image = ctx.createImageData(68, 56);
        image.data.set(pixels);
        ctx.putImageData(image, 0, 0);
        element.style.maskImage = `url("${element.toDataURL()}")`;
        // The alpha bitmap is the mask; semantic CSS colors replace the white RGB.
        ctx.clearRect(0, 0, 68, 56);
        element.dataset.ready = "true";
      })
      .catch(() => {
        /* A failed local image leaves the normal slot usable. */
      });
    return () => {
      active = false;
    };
  }, [target, artwork]);
  return createPortal(
    <canvas
      ref={canvas}
      width={68}
      height={56}
      className="save-pokemon-slot-glow"
      aria-hidden="true"
    />,
    target,
  );
}
