// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { decodeSavePrivacy } from "./useSavePrivacy";
describe("source privacy settings", () => {
  it("reads the two independent source flags without hiding SID", () => {
    expect(
      decodeSavePrivacy(
        '{"privacy":{"hideSAVDetails":false,"hideSecretDetails":true}}',
      ),
    ).toEqual({ hideSAVDetails: false, hideSecretDetails: true });
    expect(
      decodeSavePrivacy(
        '{"privacy":{"hideSAVDetails":true,"hideSecretDetails":false}}',
      ),
    ).toEqual({ hideSAVDetails: true, hideSecretDetails: false });
  });
  it("rejects malformed display policy instead of treating strings as flags", () => {
    for (const json of [
      "broken",
      "{}",
      '{"privacy":{"hideSAVDetails":false}}',
      '{"privacy":{"hideSAVDetails":false,"hideSecretDetails":"false"}}',
    ])
      expect(() => decodeSavePrivacy(json)).toThrow();
  });
});
