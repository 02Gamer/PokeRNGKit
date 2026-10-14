import { describe, expect, it } from "vitest";
import {
  applySaveFolderDelta,
  saveFolderPacket,
  saveFolderHash,
  type SaveFolderLocalFile,
} from "./saveFolderProtocol";
const file = (id: string, name = id): SaveFolderLocalFile => ({
  id,
  name,
  folder: "selected",
  data: new Uint8Array([1, 2, 3]).buffer,
  modified: 123,
  recent: true,
  backup: true,
  remembered: false,
});
describe("save folder binary boundaries", () => {
  it("matches the independent length-prefixed SHA-256 vector and binds flags/order", async () => {
    expect(await saveFolderHash([file("a")])).toBe(
      "01D619198D317788D5C09E7C2CE3497E4C63183971A95135C351308ACDBAF81E",
    );
    expect(await saveFolderHash([file("a"), file("b")])).not.toBe(
      await saveFolderHash([file("b"), file("a")]),
    );
    expect(await saveFolderHash([{ ...file("a"), remembered: true }])).not.toBe(
      await saveFolderHash([file("a")]),
    );
  });
  it("packs independent sources with exact offsets and all list metadata", () => {
    const a = file("a"),
      b = file("b"),
      packet = saveFolderPacket([a, b]);
    expect(packet.bytes).toEqual(new Uint8Array([1, 2, 3, 1, 2, 3]));
    expect(packet.descriptors.map((f) => [f.offset, f.length])).toEqual([
      [0, 3],
      [3, 3],
    ]);
    packet.bytes[0] = 9;
    expect(new Uint8Array(a.data)[0]).toBe(1);
    expect(packet.descriptors[0]).toMatchObject({
      folder: "selected",
      recent: true,
      backup: true,
      remembered: false,
    });
  });
  it("applies frozen removal/rename by identity and preserves file content", () => {
    const a = file("a"),
      b = file("b"),
      c = file("c");
    const rename = {
      ...saveFolderPacket([a, c]).descriptors[1],
      name: "canonical.bak",
    };
    const output = applySaveFolderDelta([a, b, c], {
      removed: ["b"],
      renamed: [rename],
      filesHash: "next",
    });
    expect(output.map((f) => [f.id, f.name])).toEqual([
      ["a", "a"],
      ["c", "canonical.bak"],
    ]);
    expect(output[1].data).not.toBe(c.data);
    expect(new Uint8Array(output[1].data)).toEqual(new Uint8Array(c.data));
    expect(c.name).toBe("c");
  });
  it("rejects duplicate/missing identities, overlapping changes and unrelated metadata mutations", () => {
    const a = file("a"),
      descriptor = saveFolderPacket([a]).descriptors[0];
    expect(() => saveFolderPacket([a, a])).toThrow();
    expect(() =>
      applySaveFolderDelta([a], {
        removed: ["missing"],
        renamed: [],
        filesHash: "",
      }),
    ).toThrow();
    expect(() =>
      applySaveFolderDelta([a], {
        removed: ["a"],
        renamed: [descriptor],
        filesHash: "",
      }),
    ).toThrow();
    expect(() =>
      applySaveFolderDelta([a], {
        removed: [],
        renamed: [{ ...descriptor, modified: 124 }],
        filesHash: "",
      }),
    ).toThrow();
  });
  it.each([
    { modified: -1 },
    { modified: 1.5 },
    { name: "" },
    { folder: "x".repeat(4097) },
    { recent: 1 },
  ])("rejects invalid source metadata %s", (change) => {
    expect(() =>
      saveFolderPacket([{ ...file("a"), ...change } as SaveFolderLocalFile]),
    ).toThrow();
  });
});
