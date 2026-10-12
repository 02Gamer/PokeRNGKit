// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { qrPixels, decodeQRPixels } from "./qrCodec";
describe("offline mystery gift QR codecs", () => {
  it.each([204, 260, 264, 856])(
    "roundtrips %s bytes through independent local encoder and decoder",
    (size) => {
      const data = Uint8Array.from({ length: size }, (_, i) => i % 256);
      const text = `http://lunarcookies.github.io/wc.html#${btoa(String.fromCharCode(...data))}`;
      const result = qrPixels(text);
      expect(decodeQRPixels(result.pixels, result.width, result.height)).toBe(
        text,
      );
      const inverted = result.pixels.map((value, index) =>
        index % 4 === 3 ? value : 255 - value,
      );
      expect(decodeQRPixels(inverted, result.width, result.height)).toBe(text);
    },
  );
  it("rejects empty payloads, blank images and malformed dimensions", () => {
    expect(() => qrPixels("")).toThrow();
    expect(() => decodeQRPixels(new Uint8ClampedArray(400), 10, 10)).toThrow();
    expect(() => decodeQRPixels(new Uint8ClampedArray(4), 5000, 1)).toThrow();
  });
});
