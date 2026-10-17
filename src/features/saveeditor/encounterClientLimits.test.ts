// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { SaveEditorClient } from "./client";
it("refuses encounter file metadata above the open limit and preserves the smaller read limit before creating a Worker", async () => {
  const client = new SaveEditorClient();
  await expect(
    client.runEncounters(
      new Uint8Array([1]),
      "x".repeat(4 * 1024 * 1024 + 1),
      "encounterOpen",
    ),
  ).rejects.toThrow("metadata exceeds");
  await expect(
    client.runEncounters(
      new Uint8Array([1]),
      "x".repeat(1024 * 1024 + 1),
      "encounterRead",
    ),
  ).rejects.toThrow("metadata exceeds");
  client.dispose();
});
