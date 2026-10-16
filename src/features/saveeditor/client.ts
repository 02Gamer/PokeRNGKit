import type { SaveEditorRequestKind } from "./requestKinds";
import {
  MAX_SAVE_BYTES,
  SAVE_EDITOR_API_VERSION,
  type SaveEditorResult,
} from "./domain";
import { readSaveSettings, subscribeSaveSettings } from "./settingsRepository";
import { beginSaveRequest } from "./clientActivity";
import { loadExternalMysteryGifts } from "./externalMysteryGifts";
import { subscribeMysteryGiftChanges } from "./mysteryGiftChanges";

export class SaveEditorClient {
  private editorContext?: {
    bytes: Uint8Array;
    source: import("./pokemonSet").PokemonEditorSaveContext["source"];
  };
  private editorContextInput?: Uint8Array;
  setEditorContext(context?: {
    bytes: Uint8Array;
    source: import("./pokemonSet").PokemonEditorSaveContext["source"];
  }) {
    if (
      this.editorContextInput === context?.bytes &&
      JSON.stringify(this.editorContext?.source) ===
        JSON.stringify(context?.source)
    )
      return;
    if (
      context &&
      (!context.bytes.length || context.bytes.length > MAX_SAVE_BYTES)
    )
      throw Error("Invalid editor save context.");
    this.dispose(
      "Editor save context changed. Read a new preview before confirming.",
    );
    this.editorContextInput = context?.bytes;
    this.editorContext = context
      ? {
          bytes: new Uint8Array(context.bytes),
          source: structuredClone(context.source),
        }
      : undefined;
  }
  private worker?: Worker;
  private nextId = 0;
  private brProfile = -1;
  getBRProfile() {
    return this.brProfile;
  }
  setBRProfile(profile = -1) {
    if (!Number.isInteger(profile) || profile < -1 || profile > 3)
      throw new Error("Invalid Battle Revolution profile.");
    if (profile !== this.brProfile)
      this.dispose("Battle Revolution player changed.");
    this.brProfile = profile;
  }
  private spriteMode: "a" | "b" | "c" = "b";
  private programSettingsJson?: string;
  private programSettingsOverride = false;
  private externalMysteryGiftsJson?: string;
  private preparing = new Set<(message: string) => void>();
  setProgramSettings(json?: string) {
    this.syncProgramSettings(json);
    this.programSettingsOverride = true;
  }
  private syncProgramSettings(json?: string) {
    if (json === this.programSettingsJson) return;
    if (json && json.length > 2 * 1024 * 1024)
      throw new Error("Settings request is too large.");
    this.dispose("Settings changed. Read a new preview before confirming.");
    this.programSettingsJson = json;
  }
  private recognition?: import("./saveDetection").SaveDetectionChoice;
  getRecognition() {
    return this.recognition ? { ...this.recognition } : undefined;
  }
  setRecognition(choice?: import("./saveDetection").SaveDetectionChoice) {
    this.recognition = choice ? { ...choice } : undefined;
  }
  private pending = new Map<
    number,
    {
      resolve(value: SaveEditorResult): void;
      reject(error: Error): void;
      timer: ReturnType<typeof setTimeout>;
      finish(): void;
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
  runEncounters(
    bytes: Uint8Array,
    json: string,
    kind: import("./encounterProtocol").EncounterRequestKind,
    entity?: Uint8Array,
  ): Promise<SaveEditorResult> {
    if (entity && entity.byteLength > 1024 * 1024)
      return Promise.reject(
        new Error("Encounter entity exceeds the local size limit."),
      );
    return this.runRequest(bytes, json, kind, entity);
  }
  runMysteryGifts(
    bytes: Uint8Array,
    json: string,
    kind: import("./mysteryGiftDatabaseProtocol").MysteryGiftDatabaseRequestKind,
    entity?: Uint8Array,
  ): Promise<SaveEditorResult> {
    if (entity && entity.byteLength > 1024 * 1024)
      return Promise.reject(
        new Error("Mystery gift editor entity exceeds the local size limit."),
      );
    if (json.length > 24 * 1024 * 1024)
      return Promise.reject(
        new Error("Mystery gift metadata exceeds the local size limit."),
      );
    return this.runRequest(bytes, json, kind, entity);
  }
  runSaveFolder(
    json: string,
    kind: import("./saveFolderProtocol").SaveFolderRequestKind,
    files?: Uint8Array,
  ): Promise<import("./saveFolderProtocol").SaveFolderResult> {
    if (files && files.byteLength > 128 * 1024 * 1024)
      return Promise.reject(
        new Error("Save folder exceeds the local size limit."),
      );
    return this.runRequest(
      new Uint8Array(),
      json,
      kind,
      files,
    ) as unknown as Promise<import("./saveFolderProtocol").SaveFolderResult>;
  }
  private runRequest(
    bytes: Uint8Array,
    edit: string | undefined,
    kind: SaveEditorRequestKind,
    databaseFiles?: Uint8Array,
  ): Promise<SaveEditorResult> {
    // Catalog/settings inspection has no encounter dependency. Environments
    // without IndexedDB cannot contain an imported local gift library.
    if (
      typeof indexedDB === "undefined" ||
      kind.startsWith("programSettings") ||
      kind === "saveDetectionCatalog"
    )
      return this.dispatchRequest(bytes, edit, kind, databaseFiles, "[]");
    const source = new Uint8Array(bytes);
    const files = databaseFiles ? new Uint8Array(databaseFiles) : undefined;
    return new Promise((resolve, reject) => {
      const finishActivity = beginSaveRequest();
      const finish = () => {
        clearTimeout(timer);
        unsubscribeGifts();
        unsubscribeSettings();
        this.preparing.delete(cancel);
        finishActivity();
      };
      const cancel = (message: string) => {
        if (!this.preparing.has(cancel)) return;
        finish();
        reject(new Error(message));
      };
      const unsubscribeGifts = subscribeMysteryGiftChanges(() =>
        this.dispose(
          "Mystery gift data changed. Read a new preview before confirming.",
        ),
      );
      const unsubscribeSettings = subscribeSaveSettings(() => {
        if (!this.programSettingsOverride)
          this.dispose(
            "Settings changed. Read a new preview before confirming.",
          );
      });
      const timer = setTimeout(
        () => cancel("Reading the local mystery gift library timed out."),
        120_000,
      );
      this.preparing.add(cancel);
      let settings: string;
      try {
        settings =
          (this.programSettingsOverride
            ? this.programSettingsJson
            : readSaveSettings()?.json) ?? "";
      } catch (error) {
        cancel(error instanceof Error ? error.message : String(error));
        return;
      }
      void loadExternalMysteryGifts(settings).then(
        (json) => {
          if (!this.preparing.has(cancel)) return;
          finish();
          try {
            resolve(this.dispatchRequest(source, edit, kind, files, json));
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        },
        (error) =>
          cancel(error instanceof Error ? error.message : String(error)),
      );
    });
  }
  private dispatchRequest(
    bytes: Uint8Array,
    edit: string | undefined,
    kind: SaveEditorRequestKind,
    databaseFiles?: Uint8Array,
    externalMysteryGiftsJson = "[]",
  ): Promise<SaveEditorResult> {
    if (this.externalMysteryGiftsJson !== externalMysteryGiftsJson) {
      this.dispose(
        "Mystery gift data changed. Read a new preview before confirming.",
      );
      this.externalMysteryGiftsJson = externalMysteryGiftsJson;
    }
    if (!this.programSettingsOverride) {
      try {
        this.syncProgramSettings(readSaveSettings()?.json);
      } catch (cause) {
        return Promise.reject(
          cause instanceof Error ? cause : new Error(String(cause)),
        );
      }
    }
    if (kind === "trainer" && edit === undefined) this.brProfile = -1;
    if (
      (!bytes.length &&
        !kind.startsWith("saveFolder") &&
        !kind.startsWith("programSettings") &&
        kind !== "entityTemplateCatalog" &&
        kind !== "entityTemplateCreate" &&
        kind !== "saveDetectionCatalog") ||
      bytes.length > MAX_SAVE_BYTES
    )
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
        if (
          [data.report?.apiVersion, data.entity?.apiVersion].some(
            (version) =>
              version !== undefined && version !== SAVE_EDITOR_API_VERSION,
          )
        ) {
          this.dispose(
            "Save editor API version mismatch. Reload the local runtime before continuing.",
          );
          return;
        }
        clearTimeout(request.timer);
        this.pending.delete(data.id);
        request.finish();
        if (data.error) request.reject(new Error(data.error));
        else {
          if (data.report?.brProfiles)
            this.brProfile = data.report.brProfiles.active;
          const mode = data.entity?.spriteMode ?? data.report?.spriteMode;
          if (["a", "b", "c"].includes(mode)) this.spriteMode = mode;
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
    const editorSave =
      kind.startsWith("entity") && this.editorContext
        ? new Uint8Array(this.editorContext.bytes)
        : undefined;
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
      const finishActivity = beginSaveRequest();
      const unsubscribe = subscribeSaveSettings(() => {
        if (this.programSettingsOverride) return;
        try {
          if (readSaveSettings()?.json !== this.programSettingsJson)
            this.dispose(
              "Settings changed. Read a new preview before confirming.",
            );
        } catch {
          this.dispose(
            "Stored save settings are invalid. Your working file is unchanged.",
          );
        }
      });
      const finish = () => {
        unsubscribe();
        unsubscribeGifts();
        finishActivity();
      };
      const unsubscribeGifts = subscribeMysteryGiftChanges(() =>
        this.dispose(
          "Mystery gift data changed. Read a new preview before confirming.",
        ),
      );
      this.pending.set(id, { resolve, reject, timer, finish });
      try {
        this.worker!.postMessage(
          {
            id,
            bytes: copy,
            base,
            edit,
            kind,
            brProfile: this.brProfile,
            spriteMode: this.spriteMode,
            programSettingsJson: this.programSettingsJson,
            externalMysteryGiftsJson,
            recognition: this.getRecognition(),
            databaseFiles: fileCopy,
            editorSave,
            editorSource: editorSave ? this.editorContext?.source : undefined,
          },
          [
            copy.buffer,
            ...(fileCopy ? [fileCopy.buffer] : []),
            ...(editorSave ? [editorSave.buffer] : []),
          ],
        );
      } catch (cause) {
        clearTimeout(timer);
        this.pending.delete(id);
        finish();
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      }
    });
  }

  dispose(message = "Cancelled") {
    for (const cancel of [...this.preparing]) cancel(message);
    this.worker?.terminate();
    this.worker = undefined;
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.finish();
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
  discardPokemonSet(bytes: Uint8Array, token: string) {
    if (this.worker)
      void this.run(bytes, token, "pokemonSetDiscard").catch(() => {});
  }

  discardBoxBinary(bytes: Uint8Array, token: string) {
    if (this.worker)
      void this.run(bytes, token, "boxBinaryDiscard").catch(() => {});
  }
}
