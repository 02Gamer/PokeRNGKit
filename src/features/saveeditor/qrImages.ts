// SPDX-License-Identifier: GPL-3.0-or-later
function run(
  payload:
    | { kind: "encode"; text: string }
    | {
        kind: "decode";
        pixels: Uint8ClampedArray<ArrayBuffer>;
        width: number;
        height: number;
      },
  signal: AbortSignal,
): Promise<{
  pixels?: Uint8ClampedArray<ArrayBuffer>;
  width?: number;
  height?: number;
  text?: string;
}> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("QR task cancelled"));
      return;
    }
    const worker = new Worker(new URL("./qrCodec.worker.ts", import.meta.url), {
      type: "module",
    });
    const cleanup = () => {
      worker.terminate();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new Error("QR task cancelled"));
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("QR worker failed"));
    };
    worker.postMessage(
      payload,
      payload.kind === "decode" ? [payload.pixels.buffer] : [],
    );
  });
}
export async function encodeQRImage(text: string, signal: AbortSignal) {
  const result = await run({ kind: "encode", text }, signal);
  if (!result.pixels || !result.width || !result.height)
    throw new Error("QR image unavailable");
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.putImageData(
    new ImageData(result.pixels, result.width, result.height),
    0,
    0,
  );
  return canvas.toDataURL("image/png");
}
export async function decodeQRImage(file: File, signal: AbortSignal) {
  if (!file.size || file.size > 8 * 1024 * 1024)
    throw new Error("Invalid QR image file size");
  const bitmap = await createImageBitmap(file);
  try {
    if (
      signal.aborted ||
      bitmap.width > 4096 ||
      bitmap.height > 4096 ||
      bitmap.width * bitmap.height > 4194304
    )
      throw new Error("Invalid QR image dimensions");
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(bitmap, 0, 0);
    const result = await run(
      {
        kind: "decode",
        pixels: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
        width: bitmap.width,
        height: bitmap.height,
      },
      signal,
    );
    if (!result.text) throw new Error("No QR data");
    return result.text;
  } finally {
    bitmap.close();
  }
}
