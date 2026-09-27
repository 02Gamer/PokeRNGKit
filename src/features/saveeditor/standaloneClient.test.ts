import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StandalonePokemonClient } from "./standaloneClient";
import { MAX_ENTITY_BYTES } from "./standalonePokemon";

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
const request = { fileName: "entity.bk4", inputEncrypted: true };
describe("independent entity worker lifecycle", () => {
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
  it("transfers a copy and preserves the explicit BK4 encoding hint", async () => {
    const client = new StandalonePokemonClient();
    const source = new Uint8Array([1, 2, 3]);
    const pending = client.run(source, request);
    const worker = FakeWorker.instances[0];
    const [message, transfer] = worker.postMessage.mock.calls[0];
    expect(message.bytes).not.toBe(source);
    expect(message.bytes).toEqual(source);
    expect(transfer).toEqual([message.bytes.buffer]);
    expect(JSON.parse(message.edit)).toEqual(request);
    worker.onmessage?.({ data: { id: message.id, entity: { format: "BK4" } } });
    await expect(pending).resolves.toMatchObject({ entity: { format: "BK4" } });
    expect(vi.getTimerCount()).toBe(0);
    client.dispose();
  });
  it("cancels all pending work, ignores late replies and recreates its worker", async () => {
    const client = new StandalonePokemonClient();
    const first = client.run(new Uint8Array([1]), request);
    const second = client.run(new Uint8Array([2]), request, "entityExport");
    const rejected = Promise.all([
      expect(first).rejects.toThrow("cancelled"),
      expect(second).rejects.toThrow("cancelled"),
    ]);
    const old = FakeWorker.instances[0];
    client.dispose();
    await rejected;
    expect(old.terminate).toHaveBeenCalledOnce();
    const next = client.run(new Uint8Array([3]), request);
    old.onmessage?.({ data: { id: 1, entity: {} } });
    const fresh = FakeWorker.instances[1];
    const [{ id }] = fresh.postMessage.mock.calls[0];
    fresh.onmessage?.({ data: { id, error: "invalid file" } });
    await expect(next).rejects.toThrow("invalid file");
    expect(vi.getTimerCount()).toBe(0);
    client.dispose();
  });
  it("terminates timed-out work and does not leave send-failure timers", async () => {
    const client = new StandalonePokemonClient();
    const pending = client.run(new Uint8Array([1]), request);
    const rejected = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(120_000);
    await rejected;
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
    const next = client.run(new Uint8Array([2]), request);
    const fresh = FakeWorker.instances[1];
    fresh.onmessage?.({ data: { id: 2, entity: {} } });
    await next;
    fresh.postMessage.mockImplementation(() => {
      throw new Error("send failed");
    });
    await expect(client.run(new Uint8Array([3]), request)).rejects.toThrow(
      "send failed",
    );
    expect(vi.getTimerCount()).toBe(0);
    client.dispose();
  });
  it("rejects size violations before starting the runtime", async () => {
    const client = new StandalonePokemonClient();
    await expect(client.run(new Uint8Array(), request)).rejects.toThrow("size");
    await expect(
      client.run(new Uint8Array(MAX_ENTITY_BYTES + 1), request),
    ).rejects.toThrow("size");
    expect(FakeWorker.instances).toHaveLength(0);
  });
});
