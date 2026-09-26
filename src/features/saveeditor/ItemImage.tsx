import { itemImage } from "./art";

export function ItemImage({ sprite }: { sprite: string }) {
  const src = itemImage(sprite);
  return src ? (
    <img
      className="save-inventory-image"
      src={src}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
    />
  ) : null;
}
