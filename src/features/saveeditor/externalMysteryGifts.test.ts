import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SaveEditorClient } from "./client";
import {
  loadMysteryGiftLibrary,
  type MysteryGiftLibrary,
} from "./mysteryGiftLibrary";
import { publishMysteryGiftChange } from "./mysteryGiftChanges";
import { getSaveRequestCount } from "./clientActivity";
vi.mock("./mysteryGiftLibrary", () => ({ loadMysteryGiftLibrary: vi.fn() }));
class WorkerPort {
  static instances: WorkerPort[] = [];
  onmessage?: (event: { data: unknown }) => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    WorkerPort.instances.push(this);
  }
}
const library: MysteryGiftLibrary = {
  revision: "a",
  files: [
    { id: "a", fileName: "sub/custom.wc6", data: "AQID", modified: 1 },
    {
      id: "b",
      fileName: "other.wc6",
      directory: "another",
      data: "BAUG",
      modified: 2,
    },
  ],
};
const clients: SaveEditorClient[] = [];
function client() {
  const value = new SaveEditorClient();
  clients.push(value);
  return value;
}
async function dispatched() {
  await vi.waitFor(() =>
    expect(WorkerPort.instances.at(-1)?.postMessage).toHaveBeenCalled(),
  );
  return WorkerPort.instances.at(-1)!;
}
function respond(worker: WorkerPort) {
  const message = worker.postMessage.mock.calls.at(-1)![0];
  worker.onmessage?.({ data: { id: message.id, report: { apiVersion: 180 } } });
  return message;
}
beforeEach(() => {
  WorkerPort.instances = [];
  vi.stubGlobal("Worker", WorkerPort);
  vi.stubGlobal("indexedDB", {});
  vi.stubGlobal("localStorage", undefined);
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      location: { href: "http://127.0.0.1:5173/" },
    }),
  );
  vi.mocked(loadMysteryGiftLibrary).mockResolvedValue(structuredClone(library));
});
afterEach(() => {
  for (const value of clients.splice(0)) value.dispose();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
it("loads only active directory data before dispatch and snapshots input bytes", async () => {
  const value = client(),
    bytes = new Uint8Array([1, 2, 3]),
    request = value.run(bytes);
  expect(WorkerPort.instances).toHaveLength(0);
  bytes[0] = 99;
  const worker = await dispatched(),
    message = respond(worker);
  expect(JSON.parse(message.externalMysteryGiftsJson)).toEqual([
    { fileName: "mgdb/sub/custom.wc6", data: "AQID" },
  ]);
  expect([...message.bytes]).toEqual([1, 2, 3]);
  await request;
});
it("cancels a pending library read without dispatching a late result", async () => {
  let complete!: (value: MysteryGiftLibrary) => void;
  vi.mocked(loadMysteryGiftLibrary).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const value = client(),
    before = getSaveRequestCount(),
    request = value.run(new Uint8Array([1]));
  expect(getSaveRequestCount()).toBe(before + 1);
  const rejected = expect(request).rejects.toThrow("Cancelled");
  value.dispose();
  await rejected;
  complete(library);
  await Promise.resolve();
  await Promise.resolve();
  expect(WorkerPort.instances).toHaveLength(0);
  expect(getSaveRequestCount()).toBe(before);
});
it("invalidates an in-flight preview on library publication and recreates its Worker", async () => {
  const value = client(),
    request = value.run(new Uint8Array([1]));
  const worker = await dispatched(),
    rejected = expect(request).rejects.toThrow("Mystery gift data changed");
  publishMysteryGiftChange("b");
  await rejected;
  expect(worker.terminate).toHaveBeenCalledOnce();
  const next = value.run(new Uint8Array([1]));
  await vi.waitFor(() => expect(WorkerPort.instances).toHaveLength(2));
  respond(await dispatched());
  await next;
});
it("detects a changed stored dataset even when the previous Worker was idle", async () => {
  const value = client(),
    first = value.run(new Uint8Array([1]));
  const original = await dispatched();
  respond(original);
  await first;
  vi.mocked(loadMysteryGiftLibrary).mockResolvedValue({
    revision: "b",
    files: [],
  });
  const next = value.run(new Uint8Array([1]));
  await vi.waitFor(() => expect(WorkerPort.instances).toHaveLength(2));
  const message = respond(await dispatched());
  await next;
  expect(message.externalMysteryGiftsJson).toBe("[]");
  expect(original.terminate).toHaveBeenCalledOnce();
});
it("fails closed when IndexedDB cannot be read", async () => {
  vi.mocked(loadMysteryGiftLibrary).mockRejectedValueOnce(
    new Error("storage unavailable"),
  );
  await expect(client().run(new Uint8Array([1]))).rejects.toThrow(
    "storage unavailable",
  );
  expect(WorkerPort.instances).toHaveLength(0);
});
it("releases preparation activity when Worker construction fails", async () => {
  vi.stubGlobal(
    "Worker",
    class {
      constructor() {
        throw new Error("Worker unavailable");
      }
    },
  );
  const before = getSaveRequestCount();
  await expect(client().run(new Uint8Array([1]))).rejects.toThrow(
    "Worker unavailable",
  );
  expect(getSaveRequestCount()).toBe(before);
});
