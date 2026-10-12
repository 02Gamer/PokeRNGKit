// SPDX-License-Identifier: GPL-3.0-or-later
import { itemImage, pokemonImage } from "./art";
import { boxGalleryWords } from "./boxGalleryWords";
import type { WondercardEntry } from "./wondercard";

export function WondercardImage({
  entry,
  lang,
}: {
  entry: WondercardEntry;
  lang: "zh" | "en" | "ja";
}) {
  const entity =
    !entry.empty && (entry.isEntity || (entry.egg && entry.species === 490));
  const src = entry.sprite.startsWith("item_")
    ? itemImage(entry.sprite.replace("item_", "bitem_"))
    : pokemonImage({ species: entry.species, sprite: entry.sprite });
  return (
    <span className="save-wondercard-image" data-used={entry.used}>
      <img src={src} alt="" draggable={false} width={68} height={56} />
      {entity && entry.heldItem > 0 && (
        <img
          className="save-wondercard-held"
          src={itemImage(`bitem_${entry.heldItem}`)}
          alt=""
          draggable={false}
          width={24}
          height={24}
        />
      )}
      {entity && entry.shiny && (
        <span
          className="save-wondercard-shiny"
          role="img"
          aria-label={boxGalleryWords[lang].shiny}
        >
          ★
        </span>
      )}
    </span>
  );
}
