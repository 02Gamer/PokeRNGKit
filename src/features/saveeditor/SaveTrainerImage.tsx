import { useEffect, useRef } from "react";
import { playSaveSound } from "./saveSound";
import { tr9Pixels, tr9Bmp, type Tr9Image } from "./trainer9";

export function SaveTrainerImage({
  image,
  title,
  unavailable,
  exportLabel,
  fileName = image.key,
}: {
  image: Tr9Image;
  title: string;
  unavailable: string;
  exportLabel: string;
  fileName?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    urls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lifetime = useRef({ alive: true, epoch: 0 });
  let pixels: Uint8ClampedArray | undefined;
  try {
    if (image.available) pixels = tr9Pixels(image);
  } catch {
    pixels = undefined;
  }
  const error = !pixels;
  useEffect(() => {
    const element = canvas.current;
    if (!element || !image.available) return;
    try {
      const rendered = tr9Pixels(image);
      element.width = image.width;
      element.height = image.height;
      element
        .getContext("2d")
        ?.putImageData(
          new ImageData(rendered, image.width, image.height),
          0,
          0,
        );
    } catch {
      element.width = element.height = 0;
    }
  }, [image]);
  useEffect(() => {
    const current = urls.current;
    const active = lifetime.current;
    active.alive = true;
    return () => {
      active.alive = false;
      active.epoch++;
      for (const [url, timer] of current) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      current.clear();
    };
  }, []);
  function download(format: "png" | "jpg" | "bmp") {
    const element = canvas.current;
    if (!element || !image.available || error) return;
    const active = lifetime.current,
      epoch = active.epoch;
    const publish = (blob: Blob | null) => {
      if (!blob || !active.alive || epoch !== active.epoch) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.${format}`;
      link.click();
      playSaveSound("other");
      urls.current.set(
        url,
        setTimeout(() => {
          URL.revokeObjectURL(url);
          urls.current.delete(url);
        }, 30000),
      );
    };
    if (format === "bmp") {
      publish(new Blob([tr9Bmp(image)], { type: "image/bmp" }));
      return;
    }
    element.toBlob(publish, format === "jpg" ? "image/jpeg" : "image/png");
  }
  return (
    <section>
      <h4>{title}</h4>
      {image.available && !error ? (
        <canvas ref={canvas} role="img" aria-label={title} />
      ) : (
        <p>{unavailable}</p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!image.available || error}
          onClick={() => download("png")}
        >
          {exportLabel} PNG
        </button>
        <button
          type="button"
          disabled={!image.available || error}
          onClick={() => download("jpg")}
        >
          {exportLabel} JPG
        </button>
        <button
          type="button"
          disabled={!image.available || error}
          onClick={() => download("bmp")}
        >
          {exportLabel} BMP
        </button>
      </div>
    </section>
  );
}
