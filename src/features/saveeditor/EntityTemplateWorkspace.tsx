import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { SaveEditorClient } from "./client";
import { beginSaveRequest } from "./clientActivity";
import { bulkLegalitySourceHash } from "./bulkLegality";
import {
  loadDatabaseFiles,
  replaceDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
import {
  findEntityTemplate,
  replaceEntityTemplate,
} from "./entityTemplateLibrary";
import {
  entityTemplateBase64,
  entityTemplateWords,
  type EntityTemplateCatalog,
  type EntityTemplateSource,
} from "./entityTemplate";
import {
  MAX_ENTITY_BYTES,
  type StandalonePokemonSnapshot,
} from "./standalonePokemon";
import { StandalonePokemonPanel } from "./StandalonePokemonPanel";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { useSaveClientBusy } from "./useSaveClientBusy";

const empty = new Uint8Array();
export function EntityTemplateWorkspace({
  lang,
  active,
  source,
  onOpenSettings,
}: {
  lang: "zh" | "en" | "ja";
  active: boolean;
  source?: EntityTemplateSource;
  onOpenSettings(): void;
}) {
  const w = entityTemplateWords[lang],
    settingsJson = useSaveSettingsJson(),
    globalBusy = useSaveClientBusy();
  const client = useRef(new SaveEditorClient());
  const [version, setVersion] = useState(0),
    [useSource, setUseSource] = useState(true),
    [reload, setReload] = useState(0);
  const [catalog, setCatalog] = useState<EntityTemplateCatalog>();
  const [files, setFiles] = useState<DatabaseLocalFile[]>([]);
  const [libraryError, setLibraryError] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const [undo, setUndo] = useState<{
    before: DatabaseLocalFile[];
    after: DatabaseLocalFile[];
  }>();
  const [created, setCreated] = useState<{
    seed: StandalonePokemonSnapshot;
    custom: boolean;
  }>();
  const [closing, setClosing] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const life = useRef({ epoch: 0 }),
    running = useRef(false);
  const bytes = useSource ? (source?.bytes ?? empty) : empty;
  const recognitionKey = JSON.stringify(
    useSource ? [source?.recognition, source?.brProfile] : null,
  );
  const locked = pending || globalBusy || !!created;
  async function act(action: (current: () => boolean) => Promise<void>) {
    if (running.current) return;
    running.current = true;
    const epoch = life.current.epoch;
    const current = () => epoch === life.current.epoch;
    const finish = beginSaveRequest();
    setPending(true);
    setMessage("");
    try {
      await action(current);
    } catch {
      if (current()) setMessage(w.failed);
    } finally {
      finish();
      if (current()) {
        running.current = false;
        setPending(false);
      }
    }
  }
  const load = useEffectEvent(
    () =>
      void act(async (current) => {
        setCatalog(undefined);
        setUndo(undefined);
        client.current.setRecognition(
          useSource ? source?.recognition : undefined,
        );
        client.current.setBRProfile(useSource ? (source?.brProfile ?? -1) : -1);
        const result = await client.current.run(
          bytes,
          JSON.stringify({ version }),
          "entityTemplateCatalog",
        );
        if (!current()) return;
        if (
          !result.entityTemplateCatalog ||
          result.entityTemplateCatalog.sourceHash !==
            bulkLegalitySourceHash(bytes)
        )
          throw new Error("Template catalog source mismatch.");
        setCatalog(result.entityTemplateCatalog);
        try {
          const loaded = await loadDatabaseFiles();
          if (current()) {
            findEntityTemplate(loaded, result.entityTemplateCatalog);
            setFiles(loaded);
            setLibraryError(false);
          }
        } catch {
          if (current()) {
            setFiles([]);
            setLibraryError(true);
          }
        }
      }),
  );
  useEffect(() => {
    const lifetime = life.current;
    const instance = client.current;
    lifetime.epoch++;
    running.current = false;
    instance.dispose();
    const epoch = lifetime.epoch;
    if (active)
      queueMicrotask(() => {
        if (epoch === lifetime.epoch) load();
      });
    return () => {
      lifetime.epoch++;
      running.current = false;
      instance.dispose();
    };
  }, [active, bytes, recognitionKey, version, settingsJson, reload]);
  let file: DatabaseLocalFile | undefined;
  try {
    if (catalog) file = findEntityTemplate(files, catalog);
  } catch {
    /* Reload shows the library error without selecting an arbitrary duplicate. */
  }
  const create = () =>
    void act(async (current) => {
      if (!catalog || created) return;
      const latest = libraryError ? [] : await loadDatabaseFiles();
      if (!current()) return;
      const selected = findEntityTemplate(latest, catalog);
      const result = await client.current.run(
        bytes,
        JSON.stringify({
          version: catalog.version,
          templateName: selected?.name,
          templateData: selected
            ? entityTemplateBase64(new Uint8Array(selected.data))
            : undefined,
        }),
        "entityTemplateCreate",
      );
      if (!current()) return;
      if (
        !result.entityTemplateCreated ||
        !result.entityFile ||
        !result.entity ||
        result.entityTemplateCreated.sourceHash !== catalog.sourceHash
      )
        throw new Error("Missing created template.");
      setCreated({
        seed: {
          bytes: result.entityFile,
          fileName: result.entityTemplateCreated.fileName,
          inputEncrypted: false,
          useFileFormat: true,
        },
        custom: result.entityTemplateCreated.usedCustom,
      });
    });
  const store = (input: File | undefined) => {
    if (!input) return;
    void act(async (current) => {
      if (!catalog || !input.size || input.size > MAX_ENTITY_BYTES)
        throw new Error("Invalid template size.");
      const before = files;
      const data = await input.arrayBuffer();
      if (!current()) return;
      const validation = await client.current.run(
        bytes,
        JSON.stringify({
          version: catalog.version,
          templateName: catalog.expectedFileName,
          templateData: entityTemplateBase64(new Uint8Array(data)),
        }),
        "entityTemplateCreate",
      );
      if (!current()) return;
      if (!validation.entityTemplateCreated?.usedCustom) {
        setMessage(w.invalid);
        return;
      }
      const after = replaceEntityTemplate(
        before,
        catalog,
        data,
        crypto.randomUUID(),
        Date.now(),
      );
      await replaceDatabaseFiles(before, after);
      if (!current()) return;
      setFiles(after);
      setUndo({ before, after });
      setMessage(w.stored);
    });
  };
  const remove = () =>
    void act(async (current) => {
      if (!catalog) return;
      const before = files;
      if (!current()) return;
      const after = replaceEntityTemplate(
        before,
        catalog,
        undefined,
        "",
        Date.now(),
      );
      await replaceDatabaseFiles(before, after);
      if (!current()) return;
      setFiles(after);
      setUndo({ before, after });
      setMessage(w.removed);
    });
  const restore = () =>
    void act(async (current) => {
      if (!undo) return;
      await replaceDatabaseFiles(undo.after, undo.before);
      if (!current()) return;
      setFiles(undo.before);
      setUndo(undefined);
      setMessage(w.undone);
    });
  return (
    <div>
      <section className="save-editor-panel" aria-label={w.title}>
        <h3>{w.title}</h3>
        <p className="save-editor-note">{w.note}</p>
        <div className="save-editor-fields">
          <label className="field">
            <span>{w.version}</span>
            <Select
              value={catalog?.version ?? ""}
              disabled={locked || !catalog}
              onChange={(e) => setVersion(Number(e.target.value))}
            >
              {catalog?.versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name[lang]}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={useSource}
              disabled={locked || !source}
              onChange={(e) => setUseSource(e.target.checked)}
            />{" "}
            {w.context}
          </label>
        </div>
        <p className="save-editor-note">{w.languageNote}</p>
        <div className="save-editor-toolbar">
          <button type="button" disabled={locked} onClick={() => setVersion(0)}>
            {w.defaultVersion}
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => setReload((r) => r + 1)}
          >
            {w.load}
          </button>
          <button type="button" disabled={locked} onClick={onOpenSettings}>
            {w.title} · {w.directory}
          </button>
          <button
            ref={createButton}
            type="button"
            disabled={locked || !catalog}
            onClick={create}
          >
            {w.create}
          </button>
        </div>
        {catalog && (
          <>
            <dl className="save-editor-summary">
              <div>
                <dt>{w.directory}</dt>
                <dd>{catalog.directory}</dd>
              </div>
              <div>
                <dt>{w.expected}</dt>
                <dd>{catalog.expectedFileName}</dd>
              </div>
            </dl>
            <p>
              {libraryError
                ? w.libraryError
                : file
                  ? `${file.name} · ${file.data.byteLength} B`
                  : w.none}
            </p>
            <div className="save-editor-toolbar">
              <label className="field">
                <span>{w.store}</span>
                <input
                  type="file"
                  accept=".sk2,.rk4,.pk1,.pk2,.pk3,.ck3,.xk3,.pk4,.bk4,.pk5,.pk6,.pk7,.pb7,.pk8,.pb8,.pa8,.pk9,.pa9"
                  disabled={locked || libraryError}
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    e.target.value = "";
                    store(selected);
                  }}
                />
              </label>
              <button
                type="button"
                disabled={locked || !file || libraryError}
                onClick={remove}
              >
                {w.remove}
              </button>
              <button
                type="button"
                disabled={locked || !undo}
                onClick={restore}
              >
                {w.undo}
              </button>
            </div>
          </>
        )}
        <p role="status">{message || (!catalog && active ? w.loading : "")}</p>
        {created && (
          <>
            <p>{created.custom ? w.custom : w.fallback}</p>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={pending || globalBusy}
                onClick={() => setClosing(true)}
              >
                {w.close}
              </button>
            </div>
            {closing && (
              <div role="group" aria-label={w.closeNote}>
                <p>{w.closeNote}</p>
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={pending || globalBusy}
                    onClick={() => {
                      setCreated(undefined);
                      setClosing(false);
                      queueMicrotask(() => createButton.current?.focus());
                    }}
                  >
                    {w.confirmClose}
                  </button>
                  <button
                    type="button"
                    disabled={pending || globalBusy}
                    onClick={() => setClosing(false)}
                  >
                    {w.cancel}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {created && (
        <StandalonePokemonPanel seed={created.seed} disabled={!active} />
      )}
    </div>
  );
}
