/// <reference types="node" />
import { createCipheriv, createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { browserCryptography } from "./browserCryptography";

describe("browser save cryptography", () => {
  for (const keySize of [16, 24, 32]) {
    for (const cbc of [false, true]) {
      it(`matches native AES-${keySize * 8}-${cbc ? "CBC" : "ECB"} without padding`, () => {
        const key = Uint8Array.from({ length: keySize }, (_, i) => i);
        const iv = Uint8Array.from({ length: 16 }, (_, i) => 15 - i);
        const input = Uint8Array.from({ length: 48 }, (_, i) => i * 3);
        const original = input.slice();
        const native = createCipheriv(
          `aes-${keySize * 8}-${cbc ? "cbc" : "ecb"}`,
          key,
          cbc ? iv : null,
        );
        native.setAutoPadding(false);
        const expected = Buffer.concat([native.update(input), native.final()]);
        const encrypted = browserCryptography.aes(key, iv, input, cbc, false);
        expect(encrypted).toEqual(new Uint8Array(expected));
        expect(browserCryptography.aes(key, iv, encrypted, cbc, true)).toEqual(
          original,
        );
        expect(input).toEqual(original);
      });
    }
  }
  it("matches native MD5 for save checksums", () => {
    for (const size of [0, 3, 64, 1025]) {
      const bytes = Uint8Array.from({ length: size }, (_, i) => i % 256);
      expect(browserCryptography.md5(bytes)).toEqual(
        new Uint8Array(createHash("md5").update(bytes).digest()),
      );
    }
  });
});
