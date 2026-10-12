// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  supportsWondercard,
  wondercardConfirmation,
  wondercardRequest,
  type WondercardCatalog,
  type WondercardEntry,
  type WondercardTicket,
} from "./wondercard";
const catalog: WondercardCatalog = {
  sourceHash: "A".repeat(64),
  format: "SAV6AO",
  generation: 6,
  canEdit: true,
  canUse: true,
  flagMax: 2048,
  received: [],
  album: Array.from(
    { length: 24 },
    (_, index) => ({ index }) as WondercardEntry,
  ),
  issues: [],
};
describe("Wondercard request/frozen boundaries", () => {
  it("retains action order, raw payload and independent draft ownership", () => {
    const actions = [
      { kind: "set" as const, index: 20, fileName: "gift.wc6", data: "AQID" },
      { kind: "received" as const, index: 2047, value: false },
    ];
    const request = wondercardRequest(catalog, actions);
    actions[0].data = "AAAA";
    expect(request.actions[0].data).toBe("AQID");
    expect(request.actions[0].index).toBe(20);
    expect(request.actions[1].index).toBe(2047);
  });
  it("accepts source special slots and flag zero without narrowing to visible list", () => {
    expect(
      wondercardRequest(
        {
          ...catalog,
          format: "SAV4HGSS",
          album: catalog.album.slice(0, 12),
          flagMax: 2047,
        },
        [
          { kind: "delete", index: 11 },
          { kind: "received", index: 0, value: true },
        ],
      ).actions,
    ).toHaveLength(2);
    expect(() =>
      wondercardRequest(catalog, [
        { kind: "received", index: 2048, value: true },
      ]),
    ).toThrow();
    expect(() =>
      wondercardRequest(catalog, [{ kind: "swap", source: 24, index: 0 }]),
    ).toThrow();
  });
  it("disables WR7 used/QR operations and unsupported families", () => {
    expect(supportsWondercard("SAV7b")).toBe(true);
    expect(supportsWondercard("SAV8SWSH")).toBe(false);
    expect(supportsWondercard("SAV6AODemo")).toBe(false);
    const gg = { ...catalog, format: "SAV7b", canUse: false };
    expect(() =>
      wondercardRequest(gg, [{ kind: "usedAll", value: true }]),
    ).toThrow();
    expect(() =>
      wondercardRequest(gg, [{ kind: "qrSet", data: "null/#AQID" }]),
    ).toThrow();
    expect(
      wondercardRequest(gg, [{ kind: "delete", index: 0 }]).actions,
    ).toHaveLength(1);
  });
  it("requires exact frozen hashes, format and issue acknowledgment", () => {
    const ticket: WondercardTicket = {
      token: "wondercard:1",
      sourceHash: catalog.sourceHash,
      targetHash: "B".repeat(64),
      before: catalog,
      result: { ...catalog, sourceHash: "B".repeat(64) },
      changedOffsets: [1],
      issues: ["source-issue"],
    };
    expect(() => wondercardConfirmation(catalog, ticket, false)).toThrow();
    expect(wondercardConfirmation(catalog, ticket, true).targetHash).toBe(
      ticket.targetHash,
    );
    expect(() =>
      wondercardConfirmation(
        catalog,
        { ...ticket, result: { ...ticket.result, format: "SAV6XY" } },
        true,
      ),
    ).toThrow();
  });
});
