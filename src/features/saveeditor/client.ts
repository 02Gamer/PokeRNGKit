import type { SaveEditorRequestKind } from "./requestKinds";
import { MAX_SAVE_BYTES, type SaveEditorResult } from "./domain";

export class SaveEditorClient {
  private worker?: Worker;
  private nextId = 0;
  private brProfile = -1;
  private pending = new Map<
    number,
    {
      resolve(value: SaveEditorResult): void;
      reject(error: Error): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  run(
    bytes: Uint8Array,
    edit?: string,
    kind: SaveEditorRequestKind = "trainer",
  ): Promise<SaveEditorResult> {
    return this.runRequest(bytes, edit, kind);
  }
  runDatabase(
    bytes: Uint8Array,
    edit: string,
    kind: import("./databaseProtocol").DatabaseRequestKind,
    files?: Uint8Array,
  ): Promise<SaveEditorResult> {
    if (files && files.byteLength > 128 * 1024 * 1024)
      return Promise.reject(
        new Error("Database files exceed the local size limit."),
      );
    return this.runRequest(bytes, edit, kind, files);
  }
  private runRequest(
    bytes: Uint8Array,
    edit: string | undefined,
    kind: SaveEditorRequestKind,
    databaseFiles?: Uint8Array,
  ): Promise<SaveEditorResult> {
    if (kind === "trainer" && edit === undefined) this.brProfile = -1;
    if (!bytes.length || bytes.length > MAX_SAVE_BYTES)
      return Promise.reject(
        new Error("Save file must be between 1 byte and 32 MiB."),
      );
    if (!this.worker) {
      this.worker = new Worker(
        new URL("./saveeditor.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = ({ data }) => {
        const request = this.pending.get(data.id);
        if (!request) return;
        clearTimeout(request.timer);
        this.pending.delete(data.id);
        if (data.error) request.reject(new Error(data.error));
        else {
          if (data.report?.brProfiles)
            this.brProfile = data.report.brProfiles.active;
          request.resolve(data);
        }
      };
      this.worker.onerror = (event) =>
        this.dispose(
          event.message ||
            "Save editor could not start. Check that its local runtime assets are installed.",
        );
    }
    const id = ++this.nextId;
    const copy = new Uint8Array(bytes);
    const fileCopy = databaseFiles ? new Uint8Array(databaseFiles) : undefined;
    const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.dispose(
            "Save editor timed out. Your original file is unchanged.",
          ),
        120_000,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage(
        {
          id,
          bytes: copy,
          base,
          edit,
          kind,
          brProfile: this.brProfile,
          databaseFiles: fileCopy,
        },
        fileCopy ? [copy.buffer, fileCopy.buffer] : [copy.buffer],
      );
    });
  }

  dispose(message = "Cancelled") {
    this.worker?.terminate();
    this.worker = undefined;
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(message));
    }
    this.pending.clear();
  }

  discardPropertyPreview(bytes: Uint8Array, token: string) {
    if (this.worker)
      void this.run(bytes, token, "propertyDiscard").catch(() => {});
  }

  discardFilePreview(bytes: Uint8Array, token: string) {
    if (this.worker) void this.run(bytes, token, "fileDiscard").catch(() => {});
  }

  discardBoxImport(bytes: Uint8Array, token: string) {
    if (this.worker)
      void this.run(bytes, token, "boxImportDiscard").catch(() => {});
  }

  discardBoxBinary(bytes: Uint8Array, token: string) {
    if (this.worker)
      void this.run(bytes, token, "boxBinaryDiscard").catch(() => {});
  }
}
