import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { SaveEditorClient } from "./client";
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { message: string }) => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
}
describe("save player context across Worker lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:5173/" } });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("preserves an explicit player after recreation and undo while resetting new files", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    const open = client.run(source),
      first = FakeWorker.instances[0],
      message = first.postMessage.mock.calls[0][0];
    expect(message.brProfile).toBe(-1);
    expect(message.bytes).not.toBe(source);
    first.onmessage?.({
      data: { id: message.id, report: { brProfiles: { active: 1 } } },
    });
    await open;
    const select = client.run(source, "3", "brProfile"),
      selection = first.postMessage.mock.calls[1][0];
    expect(selection.brProfile).toBe(1);
    first.onmessage?.({
      data: { id: selection.id, report: { brProfiles: { active: 3 } } },
    });
    await select;
    client.dispose();
    const restored = client.run(source, undefined, "inspectWorking"),
      fresh = FakeWorker.instances[1],
      restore = fresh.postMessage.mock.calls[0][0];
    expect(restore.brProfile).toBe(3);
    fresh.onmessage?.({
      data: { id: restore.id, report: { brProfiles: { active: 3 } } },
    });
    await restored;
    const next = client.run(source),
      nextMessage = fresh.postMessage.mock.calls[1][0];
    expect(nextMessage.brProfile).toBe(-1);
    fresh.onmessage?.({
      data: { id: nextMessage.id, report: { brProfiles: { active: 0 } } },
    });
    await next;
    expect(vi.getTimerCount()).toBe(0);
    client.dispose();
  });
  it("transfers collectible read, frozen preview and apply requests while preserving input bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "zygarde7",
      "zygarde7Preview",
      "zygarde7Edit",
    ] as const) {
      const payload =
        kind === "zygarde7"
          ? undefined
          : JSON.stringify({
              action: "patch",
              sourceHash: "A".repeat(64),
              targetHash: kind === "zygarde7Edit" ? "B".repeat(64) : undefined,
              entries: [{ index: 94, state: 2 }],
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("keeps Hall7 read, preview and exact frozen apply requests separate from the original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of ["hall7", "hall7Preview", "hall7Edit"] as const) {
      const edit =
        kind === "hall7"
          ? undefined
          : JSON.stringify({
              action: "patch",
              sourceHash: "A".repeat(64),
              targetHash: kind === "hall7Edit" ? "B".repeat(64) : undefined,
              members: [{ index: 11, species: 25 }],
              ec: "0xFF",
            });
      const pending = client.run(source, edit, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(edit);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("transfers Trainer7 requests without mutating original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "trainer7",
      "trainer7Preview",
      "trainer7Edit",
    ] as const) {
      const edit =
        kind === "trainer7"
          ? undefined
          : JSON.stringify({
              action: "ids",
              sourceHash: "A".repeat(64),
              targetHash: kind === "trainer7Edit" ? "B".repeat(64) : undefined,
              fields: [
                { key: "tid", value: "999999" },
                { key: "sid", value: "4294" },
              ],
            });
      const pending = client.run(source, edit, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(edit);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("keeps TrainerGG read, frozen edit and GP1 export requests distinct", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "trainerGG",
      "trainerGGPreview",
      "trainerGGEdit",
      "trainerGGExport",
      "trainerGGArchive",
    ] as const) {
      const payload =
        kind === "trainerGGExport"
          ? "999"
          : kind === "trainerGGPreview" || kind === "trainerGGEdit"
            ? JSON.stringify({
                action: "parkClear",
                sourceHash: "A".repeat(64),
                targetHash:
                  kind === "trainerGGEdit" ? "B".repeat(64) : undefined,
              })
            : undefined;
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("transfers Trainer8a read, preview and frozen edits without changing original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "trainer8a",
      "trainer8aPreview",
      "trainer8aEdit",
    ] as const) {
      const payload =
        kind === "trainer8a"
          ? undefined
          : JSON.stringify({
              action: "position",
              sourceHash: "A".repeat(64),
              fields: [
                { key: "map", value: "map" },
                { key: "x", value: "1" },
              ],
              targetHash: kind === "trainer8aEdit" ? "B".repeat(64) : undefined,
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("transfers Trainer8b read, preview and frozen edits without changing original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "trainer8b",
      "trainer8bPreview",
      "trainer8bEdit",
    ] as const) {
      const payload =
        kind === "trainer8b"
          ? undefined
          : JSON.stringify({
              action: "patch",
              sourceHash: "A".repeat(64),
              fields: [{ key: "name", value: "NEW" }],
              targetHash: kind === "trainer8bEdit" ? "B".repeat(64) : undefined,
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("transfers Raid8 ordered operations without changing the original buffer", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of ["raid8", "raid8Preview", "raid8Edit"] as const) {
      const payload =
        kind === "raid8"
          ? undefined
          : JSON.stringify({
              sourceHash: "A".repeat(64),
              operations: [
                { origin: 0, index: 0, property: "event", value: "true" },
                { origin: 0, index: 0, property: "rare", value: "true" },
              ],
              targetHash: kind === "raid8Edit" ? "B".repeat(64) : undefined,
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("transfers Underground8b read, preview and edits without changing the original buffer", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "underground8b",
      "underground8bPreview",
      "underground8bEdit",
    ] as const) {
      const payload =
        kind === "underground8b"
          ? undefined
          : JSON.stringify({
              action: "all",
              sourceHash: "A".repeat(64),
              targetHash:
                kind === "underground8bEdit" ? "B".repeat(64) : undefined,
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("transfers Seal8b read, preview and edits without changing the original buffer", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of ["seal8b", "seal8bPreview", "seal8bEdit"] as const) {
      const payload =
        kind === "seal8b"
          ? undefined
          : JSON.stringify({
              action: "all",
              sourceHash: "A".repeat(64),
              targetHash: kind === "seal8bEdit" ? "B".repeat(64) : undefined,
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("transfers Misc8b source actions without changing the original buffer", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of ["misc8b", "misc8bPreview", "misc8bEdit"] as const) {
      const payload =
        kind === "misc8b"
          ? undefined
          : JSON.stringify({
              action: "arceus",
              sourceHash: "A".repeat(64),
              targetHash: kind === "misc8bEdit" ? "B".repeat(64) : undefined,
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({ data: { id: message.id, report: {} } });
      await pending;
    }
    client.dispose();
  });
  it("keeps the prior player after a rejected selection", async () => {
    const client = new SaveEditorClient();
    const start = client.run(new Uint8Array([1])),
      worker = FakeWorker.instances[0],
      first = worker.postMessage.mock.calls[0][0];
    worker.onmessage?.({
      data: { id: first.id, report: { brProfiles: { active: 2 } } },
    });
    await start;
    const failed = client.run(new Uint8Array([1]), "4", "brProfile"),
      invalid = worker.postMessage.mock.calls[1][0];
    worker.onmessage?.({
      data: { id: invalid.id, error: "Invalid Battle Revolution player." },
    });
    await expect(failed).rejects.toThrow("player");
    const read = client.run(new Uint8Array([1]), undefined, "br4Gear"),
      message = worker.postMessage.mock.calls[2][0];
    expect(message.brProfile).toBe(2);
    worker.onmessage?.({
      data: { id: message.id, report: { brProfiles: { active: 2 } } },
    });
    await read;
    client.dispose();
  });
});
