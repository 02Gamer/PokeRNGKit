// SPDX-License-Identifier: GPL-3.0-or-later
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StandalonePokemonPanel } from "./StandalonePokemonPanel";
import { PokemonSprite } from "./PokemonSprite";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import {
  editorFile,
  editorSnapshot,
  type PokemonEditorFile,
  type PokemonEditorHandle,
  type PokemonEditorSaveContext,
} from "./pokemonSet";
import {
  extraSlotId,
  extraSlotWords,
  checkExtraPreview,
  type ExtraSlotCatalog,
  type ExtraSlotKey,
  type ExtraSlotEntry,
  type ExtraSlotPreview,
  type ExtraSlotWriteRequest,
  type ExtraSlotConfirmation,
} from "./extraSlots";
import "./ExtraSlotsEditor.css";
interface Props {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<ExtraSlotCatalog | undefined>;
  onOpen(
    key: ExtraSlotKey,
    view: boolean,
  ): Promise<
    { file?: PokemonEditorFile; context: PokemonEditorSaveContext } | undefined
  >;
  onPreview(
    request: ExtraSlotWriteRequest,
  ): Promise<ExtraSlotPreview | undefined>;
  onApply(confirmation: ExtraSlotConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
}
export function ExtraSlotsEditor(props: Props) {
  const settings = useSaveSettingsJson(),
    reader = useRef(props.onRead);
  useEffect(() => {
    reader.current = props.onRead;
  }, [props.onRead]);
  const [loaded, setLoaded] = useState<{
    revision: number;
    settings: string;
    catalog: ExtraSlotCatalog;
  }>();
  useEffect(() => {
    let active = true;
    void reader
      .current()
      .then((catalog) => {
        if (active && catalog)
          setLoaded({ revision: props.revision, settings, catalog });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [props.revision, settings]);
  const w = extraSlotWords[props.lang];
  return (
    <section className="save-record-editor">
      <h3>{w.title}</h3>
      {loaded?.revision === props.revision && loaded.settings === settings ? (
        <ExtraSlotForm
          key={loaded.catalog.sourceHash + settings}
          {...props}
          catalog={loaded.catalog}
        />
      ) : (
        <button
          type="button"
          className="save-editor-button"
          disabled={props.busy}
          onClick={() =>
            void props.onRead().then((catalog) => {
              if (catalog)
                setLoaded({ revision: props.revision, settings, catalog });
            })
          }
        >
          {w.view}
        </button>
      )}
    </section>
  );
}
function ExtraSlotForm({
  catalog,
  busy,
  lang,
  onOpen,
  onPreview,
  onApply,
  onDiscard,
}: Props & { catalog: ExtraSlotCatalog }) {
  const w = extraSlotWords[lang];
  const [selection, setSelection] = useState<{
    entry: ExtraSlotEntry;
    context: PokemonEditorSaveContext;
    file?: PokemonEditorFile;
  }>();
  const [preview, setPreview] = useState<ExtraSlotPreview>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [overwrite, setOverwrite] = useState(false),
    [compatibility, setCompatibility] = useState(false);
  const handle = useRef<PokemonEditorHandle | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const editorReady = useCallback((value: PokemonEditorHandle | undefined) => {
    handle.current = value;
    setReady(!!value);
  }, []);
  const selectedFile = selection?.file;
  const seed = useMemo(
    () => (selectedFile ? editorSnapshot(selectedFile) : undefined),
    [selectedFile],
  );
  const ticket = useRef<ExtraSlotPreview | undefined>(undefined),
    mounted = useRef(true),
    discard = useRef(onDiscard);
  useEffect(() => {
    discard.current = onDiscard;
  }, [onDiscard]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (ticket.current)
        void discard.current(ticket.current.token).catch(() => undefined);
    };
  }, []);
  const disabled = busy || pending;
  async function select(entry: ExtraSlotEntry) {
    setPending(true);
    setError("");
    handle.current = undefined;
    setReady(false);
    try {
      const result = await onOpen(entry.key, entry.canView);
      if (mounted.current && result) setSelection({ ...result, entry });
    } catch {
      if (mounted.current) setError(w.invalid);
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  async function start() {
    if (!selection?.entry.canWrite || !handle.current) return;
    setPending(true);
    setError("");
    try {
      const captured = handle.current.capture();
      const value = await onPreview({
        sourceHash: catalog.sourceHash,
        target: selection.entry.key,
        editorFile: editorFile(captured.snapshot),
        capture: captured.capture,
      });
      if (!value) return;
      if (!mounted.current) {
        await onDiscard(value.token);
        return;
      }
      const checked = checkExtraPreview(
        value,
        catalog.sourceHash,
        selection.entry.key,
      );
      ticket.current = checked;
      setPreview(checked);
      setOverwrite(false);
      setCompatibility(false);
    } catch {
      if (mounted.current) setError(w.invalid);
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  async function cancel() {
    if (!preview) return;
    setPending(true);
    try {
      await onDiscard(preview.token);
      ticket.current = undefined;
      setPreview(undefined);
    } catch {
      setError(w.invalid);
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  async function commit() {
    if (!preview) return;
    setPending(true);
    setError("");
    try {
      const applied = await onApply({
        token: preview.token,
        sourceHash: preview.sourceHash,
        targetHash: preview.targetHash,
        allowCompatibility: compatibility,
      });
      if (applied) {
        ticket.current = undefined;
        if (mounted.current) setPreview(undefined);
      }
    } catch {
      if (mounted.current) setError(w.invalid);
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  return (
    <>
      <p className="save-editor-note">{w.note}</p>
      {!catalog.slots.length ? (
        <p>{w.empty}</p>
      ) : (
        <div className="save-extra-workspace">
          <div className="save-extra-list" role="group" aria-label={w.title}>
            {catalog.slots.map((entry) => (
              <button
                type="button"
                className="save-editor-button"
                key={extraSlotId(entry.key)}
                disabled={disabled || !!preview}
                aria-pressed={
                  selection &&
                  extraSlotId(selection.entry.key) === extraSlotId(entry.key)
                }
                onClick={() => void select(entry)}
              >
                <PokemonSprite
                  pokemon={entry.pokemon}
                  alt=""
                  width={56}
                  height={48}
                />
                <span>
                  {entry.name[lang]} · {entry.key.slot + 1}
                </span>
                <span>
                  {entry.pokemon.species
                    ? entry.pokemon.speciesName[lang]
                    : w.blank}
                </span>
                <span className="save-editor-note">
                  {entry.canWrite ? w.writable : w.readonly}
                </span>
              </button>
            ))}
          </div>
          <div className="save-extra-detail">
            {!selection ? (
              <p>{w.choose}</p>
            ) : (
              <>
                <h4>
                  {selection.entry.name[lang]} · {selection.entry.key.slot + 1}
                </h4>
                <p>{selection.entry.canWrite ? w.writable : w.readonly}</p>
                {selection.entry.hideLegality && (
                  <p className="save-editor-note">{w.hiddenLegality}</p>
                )}
                {(selection.entry.canView || selection.entry.canWrite) && (
                  <StandalonePokemonPanel
                    key={extraSlotId(selection.entry.key)}
                    seed={seed}
                    saveContext={selection.context}
                    disabled={disabled || !!preview}
                    onEditorReady={editorReady}
                  />
                )}
                {selection.entry.canWrite && (
                  <div className="save-editor-toolbar">
                    <button
                      type="button"
                      disabled={disabled || !!preview || !ready}
                      onClick={() => void start()}
                    >
                      {w.write}
                    </button>
                  </div>
                )}
              </>
            )}
            {preview && (
              <section className="save-editor-preview" aria-label={w.confirm}>
                <h4>{preview.clear ? w.clear : w.confirm}</h4>
                <p>
                  {preview.name[lang]} · {preview.target.slot + 1}
                </p>
                {preview.overwrite && (
                  <label className="save-editor-checkbox">
                    <input
                      type="checkbox"
                      checked={overwrite}
                      disabled={disabled}
                      onChange={(e) => setOverwrite(e.target.checked)}
                    />
                    <span>{w.overwrite}</span>
                  </label>
                )}
                {preview.compatibility.length > 0 && (
                  <>
                    <ul>
                      {preview.compatibility.map((text, i) => (
                        <li key={i}>{text[lang]}</li>
                      ))}
                    </ul>
                    <label className="save-editor-checkbox">
                      <input
                        type="checkbox"
                        checked={compatibility}
                        disabled={disabled}
                        onChange={(e) => setCompatibility(e.target.checked)}
                      />
                      <span>{w.compatibility}</span>
                    </label>
                  </>
                )}
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={
                      disabled ||
                      (preview.overwrite && !overwrite) ||
                      (preview.compatibility.length > 0 && !compatibility)
                    }
                    onClick={() => void commit()}
                  >
                    {preview.clear ? w.clear : w.confirm}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void cancel()}
                  >
                    {w.cancel}
                  </button>
                </div>
              </section>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
