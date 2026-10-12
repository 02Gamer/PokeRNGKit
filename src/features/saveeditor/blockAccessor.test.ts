// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  accessorConfirmation,
  accessorCulture,
  accessorRequest,
  supportsBlockAccessor,
  type AccessorCatalog,
  type AccessorTicket,
} from "./blockAccessor";
const catalog: AccessorCatalog = {
  sourceHash: "A".repeat(64),
  format: "SAV5BW",
  blocks: [
    { key: "PKHeX.Core.ISaveBlock5BW.Encount", type: "Encount5BW", bytes: 100 },
  ],
  selected: "PKHeX.Core.ISaveBlock5BW.Encount",
  properties: [],
  culture: "en-US",
};
describe("Block accessor request boundary", () => {
  it("preserves technical aliases and separate array/nested path segments", () => {
    const changes = [
      {
        block: catalog.selected,
        path: ["Roamer1", "IVs", "[5]"],
        value: "99",
        kind: "text" as const,
      },
    ];
    const request = accessorRequest(catalog, changes);
    changes[0].path[2] = "[0]";
    expect(request.changes[0].path).toEqual(["Roamer1", "IVs", "[5]"]);
    expect(request.changes[0].block).toBe(catalog.selected);
  });
  it("keeps 128-bit text and cultures exact without JavaScript number conversion", () => {
    const value = "340282366920938463463374607431768211455";
    expect(
      accessorRequest(catalog, [
        { block: catalog.selected, path: ["Seed"], value, kind: "text" },
      ]).changes[0].value,
    ).toBe(value);
    expect([
      accessorCulture("zh"),
      accessorCulture("en"),
      accessorCulture("ja"),
    ]).toEqual(["zh-CN", "en-US", "ja-JP"]);
  });
  it("does not broaden the source accessor family and bounds malformed requests", () => {
    for (const format of [
      "SAV5BW",
      "SAV5B2W2",
      "SAV6XY",
      "SAV6AO",
      "SAV6AODemo",
      "SAV7SM",
      "SAV7USUM",
      "SAV7b",
    ])
      expect(supportsBlockAccessor(format)).toBe(true);
    expect(supportsBlockAccessor("SAV9ZA")).toBe(false);
    expect(() =>
      accessorRequest(catalog, [
        { block: "Missing", path: ["X"], value: "1", kind: "text" },
      ]),
    ).toThrow();
    expect(() =>
      accessorRequest(catalog, [
        { block: catalog.selected, path: [], value: "1", kind: "text" },
      ]),
    ).toThrow();
  });
  it("requires before/result hashes for the exact frozen ticket", () => {
    const ticket: AccessorTicket = {
      token: "accessor:1",
      sourceHash: catalog.sourceHash,
      targetHash: "B".repeat(64),
      results: [
        {
          block: catalog.selected,
          before: catalog,
          result: { ...catalog, sourceHash: "B".repeat(64) },
        },
      ],
      blocks: [],
      changedOffsets: [],
    };
    expect(accessorConfirmation(catalog, ticket).targetHash).toBe(
      ticket.targetHash,
    );
    expect(() =>
      accessorConfirmation(catalog, {
        ...ticket,
        results: [
          { block: catalog.selected, before: catalog, result: catalog },
        ],
      }),
    ).toThrow();
    expect(() =>
      accessorConfirmation(catalog, {
        ...ticket,
        results: [{ ...ticket.results[0], block: "Missing" }],
      }),
    ).toThrow();
    expect(() =>
      accessorConfirmation(catalog, {
        ...ticket,
        results: [
          {
            ...ticket.results[0],
            result: { ...ticket.results[0].result, culture: "ja-JP" },
          },
        ],
      }),
    ).toThrow();
  });
  it("bounds the complete encoded request including escaped text", () => {
    expect(() =>
      accessorRequest(catalog, [
        {
          block: catalog.selected,
          path: ["Name"],
          value: '"'.repeat(3 * 1024 * 1024),
          kind: "text",
        },
      ]),
    ).toThrow();
  });
});
