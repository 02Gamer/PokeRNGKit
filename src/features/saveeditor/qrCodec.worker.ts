// SPDX-License-Identifier: GPL-3.0-or-later
import { qrPixels, decodeQRPixels } from "./qrCodec";
self.addEventListener(
  "message",
  (
    event: MessageEvent<
      | { kind: "encode"; text: string }
      | {
          kind: "decode";
          pixels: Uint8ClampedArray;
          width: number;
          height: number;
        }
    >,
  ) => {
    try {
      if (event.data.kind === "encode") {
        const result = qrPixels(event.data.text);
        self.postMessage(result, [result.pixels.buffer]);
      } else
        self.postMessage({
          text: decodeQRPixels(
            event.data.pixels,
            event.data.width,
            event.data.height,
          ),
        });
    } catch {
      self.postMessage({ error: "Invalid QR data" });
    }
  },
);
