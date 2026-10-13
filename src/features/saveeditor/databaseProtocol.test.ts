import { describe, expect, it } from "vitest";
import {
  applyDatabaseDelta,
  decodeDatabaseDelta,
  databasePacket,
  databaseConfirmation,
  defaultDatabaseOptions,
  type DatabaseTicket,
} from "./databaseProtocol";
describe("database binary protocol", () => {
  it("decodes a bounded delta and applies it without replacing retained file buffers", () => {
    const current = {
      id: "old",
      name: "old.pk3",
      data: new Uint8Array([1]).buffer,
      entityFile: true,
      modified: 1,
    };
    const decoded = decodeDatabaseDelta({
      save: "AQI=",
      removed: ["old"],
      added: [
        {
          id: "new",
          name: "new.pk3",
          data: "AwQ=",
          entityFile: true,
          modified: 2,
          useFileFormat: true,
        },
      ],
      filesHash: "next",
    });
    expect(decoded.output).toEqual(new Uint8Array([1, 2]));
    expect(decoded.databaseDelta.added[0].useFileFormat).toBe(true);
    expect(
      applyDatabaseDelta([current], decoded.databaseDelta).map((f) => f.id),
    ).toEqual(["new"]);
    expect(new Uint8Array(current.data)).toEqual(new Uint8Array([1]));
    expect(() =>
      applyDatabaseDelta([current], {
        removed: ["missing"],
        added: [],
        filesHash: "bad",
      }),
    ).toThrow();
  });
  it("packs exact contiguous slices and preserves caller-owned inputs", () => {
    const one = new Uint8Array([1, 2, 3]),
      two = new Uint8Array([4, 5]);
    const packet = databasePacket([
      {
        id: "a",
        name: "folder/a.pk3",
        data: one.buffer,
        entityFile: true,
        modified: 1,
        useFileFormat: true,
      },
      {
        id: "b",
        name: "same.sav",
        data: two.buffer,
        entityFile: false,
        modified: 2,
      },
    ]);
    expect(packet.bytes).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(packet.descriptors.map((d) => d.useFileFormat)).toEqual([
      true,
      false,
    ]);
    expect(packet.descriptors.map((d) => [d.offset, d.length])).toEqual([
      [0, 3],
      [3, 2],
    ]);
    packet.bytes.fill(0);
    expect(one).toEqual(new Uint8Array([1, 2, 3]));
    expect(two).toEqual(new Uint8Array([4, 5]));
  });
  it("keeps all frozen source bindings and source grid defaults", () => {
    const ticket: DatabaseTicket = {
      confirmation: {
        token: "database:1",
        sourceHash: "save",
        filesHash: "files",
        outputHash: "output",
      },
      action: "delete",
      removedFiles: ["a"],
      addedFiles: [],
      changedSaveBytes: 0,
      imported: 0,
      deletedSlots: 0,
    };
    expect(databaseConfirmation(ticket)).toEqual(ticket.confirmation);
    expect(databaseConfirmation(ticket)).not.toBe(ticket.confirmation);
    expect(defaultDatabaseOptions()).toEqual({
      filterUnavailableSpecies: true,
      sort: 0,
      gridRows: 9,
    });
  });
});
