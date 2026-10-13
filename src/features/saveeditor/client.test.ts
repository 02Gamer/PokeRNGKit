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
  it("transfers independent database/save copies and preserves delta responses", async () => {
    const client = new SaveEditorClient(),
      save = new Uint8Array([1, 2]),
      files = new Uint8Array([3, 4, 5]);
    const pending = client.runDatabase(save, "{}", "databaseCommit", files),
      worker = FakeWorker.instances[0];
    const [message, transfer] = worker.postMessage.mock.calls[0];
    expect(message.bytes).not.toBe(save);
    expect(message.databaseFiles).not.toBe(files);
    expect(transfer).toEqual([
      message.bytes.buffer,
      message.databaseFiles.buffer,
    ]);
    worker.onmessage!({
      data: {
        id: message.id,
        report: { apiVersion: 157 },
        databaseDelta: { removed: ["old"], added: [], filesHash: "next" },
        output: new Uint8Array([9]),
      },
    });
    expect((await pending).databaseDelta?.removed).toEqual(["old"]);
    expect(save).toEqual(new Uint8Array([1, 2]));
    expect(files).toEqual(new Uint8Array([3, 4, 5]));
    client.dispose();
  });
  it.each([
    "pokemonReport",
    "pokemonReportCatalog",
    "pokemonReportExport",
  ] as const)("preserves readonly %s response and input", async (kind) => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]),
      original = source.slice();
    const pending = client.run(source, "{}", kind),
      worker = FakeWorker.instances[0];
    const message = worker.postMessage.mock.calls[0][0];
    const response =
      kind === "pokemonReport"
        ? { pokemonReport: { columns: [], rows: [] } }
        : kind === "pokemonReportCatalog"
          ? { pokemonReportCatalog: { extra: [], columns: [] } }
          : { pokemonReportCsv: "" };
    worker.onmessage!({
      data: { id: message.id, report: { apiVersion: 157 }, ...response },
    });
    expect(await pending).toMatchObject(response);
    expect(message.bytes).not.toBe(source);
    expect(source).toEqual(original);
    client.dispose();
  });
  it.each([
    "pokemonSearchCatalog",
    "pokemonSearch",
    "pokemonSearchSeek",
  ] as const)("retains readonly %s results and caller bytes", async (kind) => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]),
      before = source.slice();
    const pending = client.run(source, "{}", kind),
      worker = FakeWorker.instances[0],
      message = worker.postMessage.mock.calls[0][0];
    const response =
      kind === "pokemonSearchCatalog"
        ? { pokemonSearchCatalog: { formats: [] } }
        : kind === "pokemonSearch"
          ? { pokemonSearch: { matches: [{ box: 2, slot: 9 }] } }
          : { pokemonSearchPosition: null };
    worker.onmessage!({
      data: { id: message.id, report: { apiVersion: 157 }, ...response },
    });
    expect(await pending).toMatchObject(response);
    expect(source).toEqual(before);
    expect(message.bytes).not.toBe(source);
    client.dispose();
  });
  it("reads a personal chart from a transferred copy without editing the caller buffer", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]),
      original = source.slice();
    const pending = client.run(source, undefined, "personalChart"),
      worker = FakeWorker.instances[0];
    const message = worker.postMessage.mock.calls[0][0];
    expect(message.kind).toBe("personalChart");
    expect(message.bytes).not.toBe(source);
    worker.onmessage!({
      data: {
        id: message.id,
        report: { apiVersion: 157 },
        personalChart: {
          game: "E",
          generation: 3,
          hasAlphaMove: false,
          rows: [],
        },
      },
    });
    expect((await pending).personalChart?.game).toBe("E");
    expect(source).toEqual(original);
    client.dispose();
  });
  it.each([
    "textTrash",
    "textTrashDraft",
    "textTrashPreview",
    "textTrashCommit",
    "textTrashDiscard",
  ] as const)("retains name editing source and %s response", async (kind) => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]),
      original = source.slice();
    const pending = client.run(source, "payload", kind),
      worker = FakeWorker.instances[0];
    const [message, transfer] = worker.postMessage.mock.calls[0];
    const fields =
      kind === "textTrash"
        ? { textTrash: { field: "nickname" } }
        : kind === "textTrashDraft"
          ? { textTrashDraft: { hex: "41" } }
          : kind === "textTrashPreview"
            ? { textTrashPreview: { token: "text-trash:1" } }
            : kind === "textTrashCommit"
              ? { output: new Uint8Array([4]) }
              : {};
    expect(message.kind).toBe(kind);
    expect(message.bytes).not.toBe(source);
    expect(transfer).toEqual([message.bytes.buffer]);
    worker.onmessage?.({
      data: { id: message.id, report: { apiVersion: 157 }, ...fields },
    });
    expect(await pending).toMatchObject(fields);
    expect(source).toEqual(original);
    client.dispose();
  });
  it.each([
    "pokemonSuperTraining",
    "pokemonSuperTrainingPreview",
    "pokemonSuperTrainingCommit",
    "pokemonSuperTrainingDiscard",
  ] as const)("retains super training source and %s response", async (kind) => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    const pending = client.run(source, "payload", kind),
      worker = FakeWorker.instances[0];
    const [message, transfer] = worker.postMessage.mock.calls[0];
    const fields =
      kind === "pokemonSuperTraining"
        ? { pokemonSuperTraining: { rows: [] } }
        : kind === "pokemonSuperTrainingPreview"
          ? { pokemonSuperTrainingPreview: { token: "super-training:1" } }
          : kind === "pokemonSuperTrainingCommit"
            ? { output: new Uint8Array([4]) }
            : {};
    expect(message.kind).toBe(kind);
    expect(message.edit).toBe("payload");
    expect(message.bytes).not.toBe(source);
    expect(transfer).toEqual([message.bytes.buffer]);
    worker.onmessage?.({
      data: { id: message.id, report: { apiVersion: 157 }, ...fields },
    });
    expect(await pending).toMatchObject(fields);
    expect(source).toEqual(new Uint8Array([1, 2, 3]));
    client.dispose();
  });
  it.each([
    "plusRecord",
    "plusRecordPreview",
    "plusRecordCommit",
    "plusRecordDiscard",
  ] as const)("retains plus record source and %s response", async (kind) => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    const pending = client.run(source, "payload", kind),
      worker = FakeWorker.instances[0];
    const [message, transfer] = worker.postMessage.mock.calls[0];
    const fields =
      kind === "plusRecord"
        ? { plusRecord: { rows: [] } }
        : kind === "plusRecordPreview"
          ? { plusRecordPreview: { token: "plus-record:1" } }
          : kind === "plusRecordCommit"
            ? { output: new Uint8Array([4]) }
            : {};
    expect(message.kind).toBe(kind);
    expect(message.edit).toBe("payload");
    expect(message.bytes).not.toBe(source);
    expect(transfer).toEqual([message.bytes.buffer]);
    worker.onmessage?.({
      data: { id: message.id, report: { apiVersion: 157 }, ...fields },
    });
    expect(await pending).toMatchObject(fields);
    expect(source).toEqual(new Uint8Array([1, 2, 3]));
    client.dispose();
  });
  it.each([
    "techRecord",
    "techRecordPreview",
    "techRecordCommit",
    "techRecordDiscard",
  ] as const)(
    "retains technical record source and %s response",
    async (kind) => {
      const client = new SaveEditorClient(),
        source = new Uint8Array([1, 2, 3]);
      const pending = client.run(source, "payload", kind),
        worker = FakeWorker.instances[0];
      const [message, transfer] = worker.postMessage.mock.calls[0];
      const fields =
        kind === "techRecord"
          ? { techRecord: { rows: [] } }
          : kind === "techRecordPreview"
            ? { techRecordPreview: { token: "tech-record:1" } }
            : kind === "techRecordCommit"
              ? { output: new Uint8Array([4]) }
              : {};
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe("payload");
      expect(message.bytes).not.toBe(source);
      expect(transfer).toEqual([message.bytes.buffer]);
      worker.onmessage?.({
        data: { id: message.id, report: { apiVersion: 157 }, ...fields },
      });
      expect(await pending).toMatchObject(fields);
      expect(source).toEqual(new Uint8Array([1, 2, 3]));
      client.dispose();
    },
  );
  it.each([
    "moveShop",
    "moveShopPreview",
    "moveShopCommit",
    "moveShopDiscard",
  ] as const)("retains Move Shop source and %s reply", async (kind) => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    const pending = client.run(source, "payload", kind),
      worker = FakeWorker.instances[0];
    const [message, transfer] = worker.postMessage.mock.calls[0];
    const fields =
      kind === "moveShop"
        ? { moveShop: { rows: [] } }
        : kind === "moveShopPreview"
          ? { moveShopPreview: { token: "move-shop:1" } }
          : kind === "moveShopCommit"
            ? { output: new Uint8Array([4]) }
            : {};
    expect(message.kind).toBe(kind);
    expect(message.edit).toBe("payload");
    expect(message.bytes).not.toBe(source);
    expect(transfer).toEqual([message.bytes.buffer]);
    worker.onmessage?.({
      data: { id: message.id, report: { apiVersion: 157 }, ...fields },
    });
    expect(await pending).toMatchObject(fields);
    expect(source).toEqual(new Uint8Array([1, 2, 3]));
    client.dispose();
  });
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
  it.each([
    "scblock",
    "scblockExport",
    "scblockCompare",
    "scblockPreview",
    "scblockCommit",
    "scblockDiscard",
  ] as const)(
    "preserves SCBlock request source and %s response",
    async (kind) => {
      const client = new SaveEditorClient(),
        source = new Uint8Array([1, 2, 3]),
        original = source.slice();
      const pending = client.run(source, "payload", kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls[0][0];
      const fields =
        kind === "scblock"
          ? { scblock: { sourceHash: "source" } }
          : kind === "scblockExport"
            ? { scblockExport: { kind: "single", files: [] } }
            : kind === "scblockCompare"
              ? { scblockComparison: { blocks: [] } }
              : kind === "scblockPreview"
                ? { scblockPreview: { token: "scblock:1" } }
                : kind === "scblockCommit"
                  ? { output: new Uint8Array([4]) }
                  : {};
      expect(message.kind).toBe(kind);
      expect(message.bytes).not.toBe(source);
      worker.onmessage?.({
        data: { id: message.id, report: { apiVersion: 157 }, ...fields },
      });
      expect(await pending).toMatchObject(fields);
      expect(source).toEqual(original);
      client.dispose();
    },
  );
  it.each([
    "wondercard",
    "wondercardImport",
    "wondercardQR",
    "wondercardPreview",
    "wondercardCommit",
    "wondercardDiscard",
  ] as const)(
    "preserves source bytes and response fields for %s",
    async (kind) => {
      const client = new SaveEditorClient(),
        source = new Uint8Array([1, 2, 3]),
        before = source.slice();
      const pending = client.run(source, "payload", kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls[0][0];
      const fields =
        kind === "wondercard"
          ? { wondercard: { sourceHash: "source" } }
          : kind === "wondercardImport"
            ? { wondercardEntry: { type: "WC6" } }
            : kind === "wondercardQR"
              ? { wondercardQR: "null/#AQID" }
              : kind === "wondercardPreview"
                ? { wondercardPreview: { token: "wondercard:1" } }
                : kind === "wondercardCommit"
                  ? { output: new Uint8Array([4, 5, 6]) }
                  : {};
      expect(message.bytes).not.toBe(source);
      expect(message.kind).toBe(kind);
      worker.onmessage?.({
        data: { id: message.id, report: { apiVersion: 157 }, ...fields },
      });
      expect(await pending).toMatchObject(fields);
      expect(source).toEqual(before);
      client.dispose();
    },
  );
  it.each([
    "blockAccessor",
    "blockAccessorPreview",
    "blockAccessorCommit",
    "blockAccessorDiscard",
    "trainer9a",
    "trainer9aPreview",
    "trainer9aCommit",
    "trainer9aDiscard",
    "trainer9",
    "trainer9Preview",
    "trainer9Commit",
    "trainer9Discard",
    "festivalPlaza",
    "festivalPlazaPreview",
    "festivalPlazaCommit",
    "festivalPlazaDiscard",
    "mailbox",
    "mailboxPreview",
    "mailboxCommit",
    "mailboxDiscard",
    "chatter",
    "chatterPreview",
    "chatterCommit",
    "chatterDiscard",
  ] as const)("transfers an isolated source for %s", async (kind) => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]),
      original = source.slice();
    const pending = client.run(source, "payload", kind),
      worker = FakeWorker.instances[0],
      message = worker.postMessage.mock.calls[0][0];
    expect(message.kind).toBe(kind);
    expect(message.edit).toBe("payload");
    expect(message.bytes).not.toBe(source);
    const fields =
      kind === "chatterCommit" ||
      kind === "mailboxCommit" ||
      kind === "festivalPlazaCommit" ||
      kind === "trainer9Commit" ||
      kind === "trainer9aCommit" ||
      kind === "blockAccessorCommit"
        ? { output: new Uint8Array([4, 5, 6]) }
        : kind === "chatter"
          ? { chatter: { sourceHash: "source" } }
          : kind === "chatterPreview"
            ? { chatterPreview: { token: "chatter:1" } }
            : kind === "mailbox"
              ? { mailbox: { sourceHash: "source" } }
              : kind === "mailboxPreview"
                ? { mailboxPreview: { token: "mailbox:1" } }
                : kind === "festivalPlaza"
                  ? { festivalPlaza: { sourceHash: "source" } }
                  : kind === "festivalPlazaPreview"
                    ? { festivalPlazaPreview: { token: "festa:1" } }
                    : kind === "trainer9"
                      ? { trainer9: { sourceHash: "source" } }
                      : kind === "trainer9Preview"
                        ? { trainer9Preview: { token: "trainer9:1" } }
                        : kind === "trainer9a"
                          ? { trainer9a: { sourceHash: "source" } }
                          : kind === "trainer9aPreview"
                            ? { trainer9aPreview: { token: "trainer9a:1" } }
                            : kind === "blockAccessor"
                              ? { blockAccessor: { sourceHash: "source" } }
                              : kind === "blockAccessorPreview"
                                ? {
                                    blockAccessorPreview: {
                                      token: "accessor:1",
                                    },
                                  }
                                : {};
    worker.onmessage?.({
      data: { id: message.id, report: { apiVersion: 157 }, ...fields },
    });
    expect(await pending).toMatchObject(fields);
    expect(source).toEqual(original);
    client.dispose();
  });
  it.each(["registeredGroups", "registeredGroupAnalyze"] as const)(
    "keeps %s read-only with independent group positions and response fields",
    async (kind) => {
      const client = new SaveEditorClient(),
        source = new Uint8Array([1, 2, 3]),
        original = source.slice();
      const payload =
        kind === "registeredGroupAnalyze"
          ? JSON.stringify({ group: 3, slot: 2 })
          : undefined;
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls[0][0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      const fields =
        kind === "registeredGroups"
          ? { registeredGroups: { initialGroup: 3, groups: [] } }
          : {
              registeredGroupAnalysis: {
                position: { group: 3, slot: 2 },
                report: { box: -2, slot: 2 },
              },
            };
      worker.onmessage?.({
        data: { id: message.id, report: { apiVersion: 157 }, ...fields },
      });
      const result = await pending;
      expect(result).toMatchObject(fields);
      expect(result.output).toBeUndefined();
      expect(source).toEqual(original);
      client.dispose();
    },
  );
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
  it("transfers Z-A event pages, frozen saves, cancellation and comparison without detaching original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "event9a",
      "event9aPreview",
      "event9aCommit",
      "event9aDiscard",
      "event9aCompare",
    ] as const) {
      const payload =
        kind === "event9aDiscard"
          ? "event9a:1"
          : JSON.stringify({
              names: "11\tKnown",
              group: "WorkSpawn",
              filter: "known",
              offset: 50,
              limit: 50,
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
  it("transfers fashion pages, ordered previews, frozen commits and disposal without transferring original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "fashion9",
      "fashion9Preview",
      "fashion9Commit",
      "fashion9Discard",
    ] as const) {
      const payload =
        kind === "fashion9Discard"
          ? "fashion9:1"
          : JSON.stringify({
              group: "Tops",
              offset: 50,
              limit: 50,
              sourceHash: "A".repeat(64),
              operations: [
                { action: "owned", group: "Tops", owned: false, all: true },
              ],
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect(message.bytes.buffer).not.toBe(source.buffer);
      expect(source.byteLength).toBe(3);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({
        data: { id: message.id, report: { apiVersion: 157 } },
      });
      await pending;
    }
    expect(vi.getTimerCount()).toBe(0);
    client.dispose();
  });
  it("transfers raid catalogs, ordered previews, frozen commits and cancellation without detaching original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "raid9",
      "raid9Preview",
      "raid9Commit",
      "raid9Discard",
    ] as const) {
      const payload =
        kind === "raid9"
          ? undefined
          : kind === "raid9Discard"
            ? "raid9:1"
            : JSON.stringify({
                sourceHash: "A".repeat(64),
                operations: [
                  {
                    action: "seeds",
                    origin: "Paldea",
                    today: "FFFFFFFFFFFFFFFF",
                  },
                  {
                    action: "propagate",
                    origin: "Paldea",
                    index: 0,
                    seedToo: true,
                  },
                ],
              });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes.buffer).not.toBe(source.buffer);
      expect(source.byteLength).toBe(3);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({
        data: { id: message.id, report: { apiVersion: 157 } },
      });
      await pending;
    }
    expect(vi.getTimerCount()).toBe(0);
    client.dispose();
  });
  it("transfers donut read, single-preview confirmation, cancellation and export without detaching original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "donut9a",
      "donut9aPreview",
      "donut9aCommit",
      "donut9aDiscard",
      "donut9aExport",
    ] as const) {
      const payload =
        kind === "donut9a"
          ? undefined
          : kind === "donut9aDiscard"
            ? "donut:1"
            : kind === "donut9aExport"
              ? "998"
              : JSON.stringify(
                  kind === "donut9aCommit"
                    ? {
                        token: "donut:1",
                        sourceHash: "A".repeat(64),
                        targetHash: "B".repeat(64),
                      }
                    : {
                        action: "generate",
                        index: 998,
                        sourceHash: "A".repeat(64),
                        start: 998,
                        end: 999,
                        flavors: [1],
                        now: "2026-01-02T03:04:05.006",
                      },
                );
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({
        data: {
          id: message.id,
          report: {},
          donut9aFile:
            kind === "donut9aExport" ? new Uint8Array(72) : undefined,
        },
      });
      const result = await pending;
      if (kind === "donut9aExport") expect(result.donut9aFile).toHaveLength(72);
    }
    client.dispose();
  });
  it("transfers Trainer8 read, preview and frozen edits without changing original bytes", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "trainer8",
      "trainer8Preview",
      "trainer8Edit",
    ] as const) {
      const payload =
        kind === "trainer8"
          ? undefined
          : JSON.stringify({
              action: "team",
              sourceHash: "A".repeat(64),
              team: "card",
              uiLanguage: "zh",
              members: [{ index: 5, property: "ec", value: "0xFFFFFFFF" }],
              targetHash: kind === "trainer8Edit" ? "B".repeat(64) : undefined,
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
  it("preserves original bytes across seven-star pages, frozen previews, commits and cancellation", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    for (const kind of [
      "sevenstar9",
      "sevenstar9Preview",
      "sevenstar9Commit",
      "sevenstar9Discard",
    ] as const) {
      const payload =
        kind === "sevenstar9Discard"
          ? "sevenstar9:1"
          : JSON.stringify({
              offset: 2990,
              limit: 50,
              filter: "",
              sourceHash: "A".repeat(64),
              targetHash: "B".repeat(64),
              token: "sevenstar9:1",
            });
      const pending = client.run(source, payload, kind),
        worker = FakeWorker.instances[0],
        message = worker.postMessage.mock.calls.at(-1)![0];
      expect(message.kind).toBe(kind);
      expect(message.edit).toBe(payload);
      expect(message.bytes).not.toBe(source);
      expect([...source]).toEqual([1, 2, 3]);
      worker.onmessage?.({
        data: { id: message.id, report: { apiVersion: 157 } },
      });
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
