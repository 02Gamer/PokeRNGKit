// SPDX-License-Identifier: GPL-3.0-or-later
import QRCode from "qrcode";
import jsQR from "jsqr";
export function qrPixels(text: string) {
  if (!text || text.length > 8192) throw new Error("Invalid QR payload");
  const code = QRCode.create(text, { errorCorrectionLevel: "Q" });
  const scale = 4,
    quiet = 4,
    width = (code.modules.size + quiet * 2) * scale;
  const pixels = new Uint8ClampedArray(width * width * 4);
  pixels.fill(255);
  for (let y = 0; y < code.modules.size; y++)
    for (let x = 0; x < code.modules.size; x++) {
      if (!code.modules.get(y, x)) continue;
      for (let row = 0; row < scale; row++)
        for (let column = 0; column < scale; column++) {
          const index =
            (((y + quiet) * scale + row) * width +
              (x + quiet) * scale +
              column) *
            4;
          pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
        }
    }
  return { pixels, width, height: width };
}
export function decodeQRPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 4096 ||
    height > 4096 ||
    width * height > 4194304 ||
    pixels.length !== width * height * 4
  )
    throw new Error("Invalid QR image dimensions");
  const result = jsQR(pixels, width, height, {
    inversionAttempts: "attemptBoth",
  });
  if (!result?.data || result.data.length > 8192)
    throw new Error("No readable QR payload");
  return result.data;
}
