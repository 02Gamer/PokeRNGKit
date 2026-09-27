import {
  MAX_ENTITY_BYTES,
  type StandalonePokemonRequest,
  type StandalonePokemonOperation,
  type StandalonePokemonResult,
} from "./standalonePokemon";

export class StandalonePokemonClient {
  private worker?: Worker;
  private nextId = 0;
  private pending = new Map<
    number,
    {
      resolve(value: StandalonePokemonResult): void;
      reject(error: Error): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  run(
    bytes: Uint8Array,
    request: StandalonePokemonRequest,
    kind: StandalonePokemonOperation = "entityInspect",
  ): Promise<StandalonePokemonResult> {
    if (!bytes.length || bytes.length > MAX_ENTITY_BYTES)
      return Promise.reject(new Error("Entity file size is invalid."));
    if (!this.worker) {
      this.worker = new Worker(
        new URL("./saveeditor.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = ({ data }) => {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(data.id);
        if (data.error) pending.reject(new Error(data.error));
        else pending.resolve(data);
      };
      this.worker.onerror = (event) =>
        this.dispose(event.message || "Entity file worker could not start.");
    }
    const id = ++this.nextId,
      copy = new Uint8Array(bytes);
    const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.dispose(
            "Entity file operation timed out. The original file is unchanged.",
          ),
        120_000,
      );
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.worker!.postMessage(
          { id, bytes: copy, base, edit: JSON.stringify(request), kind },
          [copy.buffer],
        );
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  dispose(message = "Entity file operation cancelled.") {
    this.worker?.terminate();
    this.worker = undefined;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
    this.pending.clear();
  }
}
