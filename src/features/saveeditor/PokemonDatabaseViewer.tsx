import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { DatabaseFilters } from "./DatabaseFilters";
import { PokemonReportViewer } from "./PokemonReportViewer";
import { StandalonePokemonPanel } from "./StandalonePokemonPanel";
import type { StandalonePokemonSnapshot } from "./standalonePokemon";
import type { PokemonReportActions } from "./pokemonReport";
import { databaseWallpaperImage } from "./art";
import { PokemonSprite } from "./PokemonSprite";
import { PokemonHoverSurface } from "./PokemonHoverSurface";
import { newPokemonSearch } from "./pokemonSearch";
import { databaseWords } from "./databaseWords";
import {
  databasePacket,
  applyDatabaseDelta,
  decodeDatabaseBytes,
  type DatabaseActions,
  type DatabaseCatalog,
  type DatabaseOptions,
  type DatabaseQuery,
  type DatabaseTicket,
  type DatabaseView,
} from "./databaseProtocol";
import { loadDatabaseOptions } from "./databaseSettings";
import { settingsWords } from "./settingsLabels";
import { playSaveSound } from "./saveSound";
import { loadSaveFolder } from "./saveFolderRepository";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import {
  databaseLibraryPolicy,
  databaseLibrarySources,
  databaseLibraryWords,
} from "./databaseLibrarySources";
import {
  databaseDirectory,
  databaseDirectoryFiles,
  databaseSourceName,
  databaseDestinationName,
  attachDatabaseDirectory,
  directoryDatabaseDelta,
  databaseDirectoryWords,
} from "./databaseDirectory";
import {
  loadDatabaseFiles,
  replaceDatabaseFiles,
  readDatabaseFiles,
  type DatabaseLocalFile,
} from "./databaseRepository";
import type { SaveEditorResult } from "./domain";
import "./PokemonDatabaseViewer.css";

export function PokemonDatabaseViewer({
  lang,
  busy,
  actions,
  preparedSeed,
  extraPreparedActions = [],
  onOpenSettings,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  actions: DatabaseActions;
  preparedSeed?: StandalonePokemonSnapshot;
  extraPreparedActions?: {
    label: string;
    onPrepare(snapshot: StandalonePokemonSnapshot): Promise<void>;
  }[];
  onOpenSettings?(): void;
}) {
  const w = databaseWords[lang],
    life = useRef(true),
    runner = useRef(false);
  const settingsJson = useSaveSettingsJson();
  let directory = "";
  try {
    directory = databaseDirectory(settingsJson);
  } catch {
    /* Refuse invalid settings below without opening another directory. */
  }
  const generation = useRef(0);
  const [libraryFiles, setLibraryFiles] = useState<DatabaseLocalFile[]>([]);
  const [files, setFiles] = useState<DatabaseLocalFile[]>([]),
    [view, setView] = useState<DatabaseView>(),
    [catalog, setCatalog] = useState<DatabaseCatalog>();
  const [query, setQuery] = useState<DatabaseQuery>({
    filters: newPokemonSearch(),
    current: true,
    files: true,
    backups: true,
    legal: null,
    clones: 0,
    context: null,
    comparison: null,
  });
  const [applied, setApplied] = useState<DatabaseQuery>(),
    [options, setOptions] = useState<DatabaseOptions>(loadDatabaseOptions);
  const [pending, setPending] = useState(true),
    [message, setMessage] = useState("");
  const [selected, setSelected] = useState<number[]>([]),
    [focused, setFocused] = useState<number>(),
    [ticket, setTicket] = useState<DatabaseTicket>(),
    [committed, setCommitted] = useState<SaveEditorResult>();
  const [reportQuery, setReportQuery] = useState<DatabaseQuery>();
  const [prepared, setPrepared] = useState<
    | {
        id: string;
        snapshot: StandalonePokemonSnapshot;
      }
    | undefined
  >(() =>
    preparedSeed
      ? { id: crypto.randomUUID(), snapshot: preparedSeed }
      : undefined,
  );
  const [showEditor, setShowEditor] = useState(Boolean(preparedSeed));
  const [box, setBox] = useState(0),
    [clear, setClear] = useState(false),
    [overwrite, setOverwrite] = useState(false),
    [adapt, setAdapt] = useState(false),
    [dex, setDex] = useState(false),
    [records, setRecords] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    folderInput = useRef<HTMLInputElement>(null),
    fileMode = useRef(true);
  const [folderEntity, setFolderEntity] = useState(true);
  const latestActions = useRef(actions);
  useEffect(() => {
    latestActions.current = actions;
  }, [actions]);
  useEffect(() => {
    life.current = true;
    generation.current++;
    let active = true;
    runner.current = true;
    void (async () => {
      try {
        await Promise.resolve();
        if (!active) return;
        setPending(true);
        setMessage("");
        setView(undefined);
        setCatalog(undefined);
        setLibraryFiles([]);
        setTicket(undefined);
        setCommitted(undefined);
        setReportQuery(undefined);
        setFocused(undefined);
        setSelected([]);
        if (!directory) throw new Error("Invalid database directory settings.");
        const [value, snapshot] = await Promise.all([
          loadDatabaseFiles(),
          loadSaveFolder(),
        ]);
        if (!active) return;
        const sources = databaseLibrarySources(
          snapshot.files,
          databaseDirectoryFiles(value, directory),
          databaseLibraryPolicy(settingsJson),
          value,
        );
        const nextOptions = loadDatabaseOptions();
        setFiles(value);
        const packet = databasePacket([
          ...databaseDirectoryFiles(value, directory),
          ...sources,
        ]);
        const result = await latestActions.current.request(
          "databaseOpen",
          JSON.stringify({
            files: packet.descriptors,
            options: nextOptions,
          }),
          packet.bytes,
        );
        if (!active) return;
        if (!result?.database) throw Error();
        setOptions(nextOptions);
        setLibraryFiles(sources);
        setView(result.database);
        setApplied({
          filters: newPokemonSearch(),
          current: true,
          files: true,
          backups: true,
          legal: null,
          clones: 0,
          context: 0,
          comparison: 0,
        });
        const next = await latestActions.current.request(
          "databaseCatalog",
          "-1",
        );
        if (!active) return;
        if (!next?.databaseCatalog) throw Error();
        setCatalog(next.databaseCatalog);
      } catch {
        if (active) setMessage(w.failed);
      } finally {
        if (active) {
          runner.current = false;
          setPending(false);
        }
      }
    })();
    return () => {
      life.current = false;
      active = false;
    };
  }, [w.failed, settingsJson, directory]);
  function packetFor(source = files) {
    return databasePacket([
      ...databaseDirectoryFiles(source, directory),
      ...libraryFiles,
    ]);
  }
  const locked = busy || pending || !directory;
  async function run(task: () => Promise<void>) {
    if (runner.current || busy) return;
    runner.current = true;
    const currentGeneration = generation.current;
    setPending(true);
    setMessage("");
    try {
      await task();
    } catch {
      if (life.current && currentGeneration === generation.current)
        setMessage(w.failed);
    } finally {
      if (life.current && currentGeneration === generation.current) {
        runner.current = false;
        setPending(false);
      }
    }
  }
  async function discard() {
    const currentGeneration = generation.current;
    if (ticket && !committed)
      await actions.request("databaseDiscard", ticket.confirmation.token);
    if (life.current && currentGeneration === generation.current) {
      setTicket(undefined);
      setCommitted(undefined);
    }
  }
  async function open(source = files) {
    const currentGeneration = generation.current;
    await discard();
    const snapshot = await loadSaveFolder();
    if (!life.current || currentGeneration !== generation.current) return;
    const sources = databaseLibrarySources(
      snapshot.files,
      databaseDirectoryFiles(source, directory),
      databaseLibraryPolicy(settingsJson),
      source,
    );
    const packet = databasePacket([
      ...databaseDirectoryFiles(source, directory),
      ...sources,
    ]);
    const result = await actions.request(
      "databaseOpen",
      JSON.stringify({ files: packet.descriptors, options }),
      packet.bytes,
    );
    if (!life.current || currentGeneration !== generation.current) return;
    if (!result?.database) throw Error();
    setLibraryFiles(sources);
    setView(result.database);
    setReportQuery(undefined);
    setSelected([]);
    setFocused(undefined);
    setApplied({
      filters: newPokemonSearch(),
      current: true,
      files: true,
      backups: true,
      legal: null,
      clones: 0,
      context: 0,
      comparison: 0,
    });
    const next = await actions.request("databaseCatalog", "-1");
    if (life.current && currentGeneration === generation.current) {
      if (!next?.databaseCatalog) throw Error();
      setCatalog(next.databaseCatalog);
    }
  }
  async function choose(incoming: FileList | null, entity: boolean) {
    if (!incoming) return;
    await run(async () => {
      const added = await readDatabaseFiles(
        Array.from(incoming),
        entity,
        () => life.current,
      );
      if (!added) return;
      await discard();
      const next = [...files, ...attachDatabaseDirectory(added, directory)];
      packetFor(next);
      await replaceDatabaseFiles(files, next);
      if (life.current) {
        setFiles(next);
        await open(next);
      }
    });
  }
  async function search(offset = 0, active = query, notify = false) {
    const currentGeneration = generation.current;
    await discard();
    if (!life.current || currentGeneration !== generation.current) return;
    const result = await actions.request(
      "databaseRead",
      JSON.stringify({ query: active, offset }),
    );
    if (life.current && currentGeneration === generation.current) {
      if (!result?.database) throw Error();
      setView(result.database);
      setReportQuery(undefined);
      setApplied(active);
      setSelected([]);
      setFocused(undefined);
      if (notify) playSaveSound("other");
    }
  }
  async function select(id: number) {
    setFocused(id);
    const result = await actions.request("databaseCatalog", String(id));
    if (life.current && result?.databaseCatalog)
      setCatalog(result.databaseCatalog);
  }
  async function preview(action: "delete" | "import" | "clones", all = false) {
    const ids = action === "delete" ? [focused] : selected;
    if (action !== "clones" && ids.some((id) => id === undefined)) return;
    const packet = packetFor();
    const result = await actions.request(
      "databasePreview",
      JSON.stringify({
        files: packet.descriptors,
        edit: {
          action,
          ids: all ? null : ids,
          query: all ? applied : null,
          box,
          clear,
          overwrite,
          settings: {
            updateToSaveFile: adapt ? 1 : 2,
            updatePokeDex: dex ? 1 : 2,
            updateRecord: records ? 1 : 2,
          },
        },
      }),
      packet.bytes,
    );
    if (life.current) {
      if (!result?.databasePreview) throw Error();
      setTicket(result.databasePreview);
      setCommitted(undefined);
    }
  }
  async function confirm() {
    if (!ticket) return;
    const currentGeneration = generation.current;
    let result = committed;
    if (!result) {
      const packet = packetFor();
      result = await actions.request(
        "databaseCommit",
        JSON.stringify({
          files: packet.descriptors,
          confirmation: ticket.confirmation,
        }),
        packet.bytes,
      );
      if (life.current && currentGeneration === generation.current)
        setCommitted(result);
    }
    if (!life.current || currentGeneration !== generation.current) return;
    if (!result?.databaseDelta || !result.output) throw Error();
    const next = applyDatabaseDelta(
      files,
      directoryDatabaseDelta(
        files,
        libraryFiles,
        result.databaseDelta,
        directory,
      ),
    );
    packetFor(next);
    const success = await actions.apply(
      result,
      ticket.confirmation.sourceHash,
      files,
      next,
    );
    if (!life.current || currentGeneration !== generation.current) return;
    if (!success) {
      setMessage(w.storage);
      return;
    }
    if (life.current) {
      setFiles(next);
      setTicket(undefined);
      setCommitted(undefined);
      if (ticket.action === "delete") playSaveSound("other");
    }
  }
  async function download() {
    if (focused === undefined) return;
    const result = await actions.request("databaseExport", String(focused));
    if (!life.current) return;
    if (!result?.pokemonFile) throw Error();
    const url = URL.createObjectURL(
      new Blob([decodeDatabaseBytes(result.pokemonFile.data)], {
        type: "application/octet-stream",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.pokemonFile.fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function archive() {
    if (!applied) return;
    const result = await actions.request(
      "databaseArchive",
      JSON.stringify({ query: applied }),
    );
    if (!life.current) return;
    if (!result?.archive) throw Error();
    const url = URL.createObjectURL(
      new Blob([result.archive], { type: "application/zip" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "PokeRNGKit-Database.zip";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function add() {
    if (focused === undefined) return;
    const entity = await actions.request("databaseExport", String(focused));
    if (!life.current) return;
    if (!entity?.pokemonFile) throw Error();
    const packet = packetFor();
    const result = await actions.request(
      "databasePreview",
      JSON.stringify({
        files: packet.descriptors,
        edit: {
          action: "add",
          add: {
            id: crypto.randomUUID(),
            name: databaseDestinationName(
              entity.pokemonFile.fileName,
              directory,
            ),
            data: entity.pokemonFile.data,
            entityFile: true,
            modified: Date.now(),
          },
        },
      }),
      packet.bytes,
    );
    if (!life.current) return;
    if (!result?.databasePreview) throw Error();
    setTicket(result.databasePreview);
    setCommitted(undefined);
  }
  async function viewEntity() {
    if (focused === undefined) return;
    const result = await actions.request("databaseView", String(focused));
    if (!life.current) return;
    if (!result?.pokemonFile) throw Error();
    setPrepared({
      id: crypto.randomUUID(),
      snapshot: {
        bytes: decodeDatabaseBytes(result.pokemonFile.data),
        fileName: result.pokemonFile.fileName,
        inputEncrypted: false,
        useFileFormat: true,
      },
    });
    setShowEditor(true);
  }
  async function prepareEdited(
    snapshot: StandalonePokemonSnapshot,
    action: "add" | "import",
  ) {
    await run(async () => {
      if (snapshot.inputEncrypted || !snapshot.useFileFormat) throw Error();
      let binary = "";
      for (const byte of snapshot.bytes) binary += String.fromCharCode(byte);
      const packet = packetFor();
      const result = await actions.request(
        "databasePreview",
        JSON.stringify({
          files: packet.descriptors,
          edit: {
            action,
            add: {
              id: crypto.randomUUID(),
              name:
                action === "add"
                  ? databaseDestinationName(snapshot.fileName, directory)
                  : snapshot.fileName,
              data: btoa(binary),
              entityFile: true,
              modified: Date.now(),
              useFileFormat: true,
            },
            box,
            clear,
            overwrite,
            settings: {
              updateToSaveFile: adapt ? 1 : 2,
              updatePokeDex: dex ? 1 : 2,
              updateRecord: records ? 1 : 2,
            },
          },
        }),
        packet.bytes,
      );
      if (!life.current) return;
      if (!result?.databasePreview) throw Error();
      setTicket(result.databasePreview);
      setCommitted(undefined);
    });
  }
  const reportActions: PokemonReportActions = {
    catalog: async () =>
      (await actions.request("databaseReportCatalog", ""))
        ?.pokemonReportCatalog,
    read: async (report) =>
      reportQuery
        ? (
            await actions.request(
              "databaseReport",
              JSON.stringify({ query: reportQuery, report }),
            )
          )?.pokemonReport
        : undefined,
    csv: async (report) =>
      reportQuery
        ? (
            await actions.request(
              "databaseReportExport",
              JSON.stringify({ query: reportQuery, report }),
            )
          )?.pokemonReportCsv
        : undefined,
  };
  const row = view?.rows.find((r) => r.id === focused);
  const check = (
    title: string,
    value: boolean,
    change: (value: boolean) => void,
  ) => (
    <label className="save-db-check">
      <input
        type="checkbox"
        checked={value}
        disabled={locked || Boolean(ticket)}
        onChange={(e) => change(e.target.checked)}
      />
      {title}
    </label>
  );
  return (
    <PokemonHoverSurface
      revision={view}
      busy={locked}
      lang={lang}
      readTarget={actions.hover}
    >
      <section className="save-pokemon-database" aria-label={w.title}>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={locked || Boolean(ticket) || focused === undefined}
            onClick={() => void run(add)}
          >
            {w.add}
          </button>
          <input
            hidden
            ref={fileInput}
            type="file"
            multiple
            onChange={(e) => {
              void choose(e.target.files, fileMode.current);
              e.target.value = "";
            }}
          />
          <input
            hidden
            ref={folderInput}
            type="file"
            multiple
            {...{ webkitdirectory: "" }}
            onChange={(e) => {
              void choose(e.target.files, fileMode.current);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={locked || Boolean(ticket)}
            onClick={() => {
              fileMode.current = true;
              fileInput.current?.click();
            }}
          >
            {w.entity}
          </button>
          <button
            type="button"
            disabled={locked || Boolean(ticket)}
            onClick={() => {
              fileMode.current = false;
              fileInput.current?.click();
            }}
          >
            {w.saves}
          </button>
          <button
            type="button"
            disabled={locked || Boolean(ticket)}
            onClick={() => {
              fileMode.current = folderEntity;
              folderInput.current?.click();
            }}
          >
            {w.folder}
          </button>
          <label className="field">
            <span>{w.folder}</span>
            <Select
              disabled={locked || Boolean(ticket)}
              value={folderEntity ? "entity" : "save"}
              onChange={(event) =>
                setFolderEntity(event.target.value === "entity")
              }
            >
              <option value="entity">{w.entity}</option>
              <option value="save">{w.saves}</option>
            </Select>
          </label>
          <button
            type="button"
            disabled={locked}
            onClick={() => void run(() => open())}
          >
            {pending ? w.loading : w.load}
          </button>
        </div>
        <p className="save-editor-note">{w.note}</p>
        <p className="save-editor-note">
          {databaseDirectoryWords[lang].title}: <strong>{directory}</strong>
        </p>
        <p className="save-editor-note">{databaseDirectoryWords[lang].note}</p>
        <details>
          <summary>
            {databaseLibraryWords[lang].title} ({libraryFiles.length})
          </summary>
          <p className="save-editor-note">{databaseLibraryWords[lang].note}</p>
          <ul>
            {libraryFiles.map((file) => (
              <li key={file.id}>
                {file.name} · {file.data.byteLength} B
                {view?.files.find((item) => item.id === file.id)?.error
                  ? ` · ${w.unsupported}`
                  : ""}
              </li>
            ))}
          </ul>
        </details>
        <div
          className="save-editor-toolbar save-db-mode"
          role="group"
          aria-label={w.title}
        >
          <button
            type="button"
            disabled={locked}
            aria-pressed={!showEditor}
            onClick={() => setShowEditor(false)}
          >
            {w.search}
          </button>
          <button
            type="button"
            disabled={locked || !prepared}
            aria-pressed={showEditor}
            onClick={() => setShowEditor(true)}
          >
            {w.prepared}
          </button>
        </div>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={locked || Boolean(ticket) || focused === undefined}
            onClick={() => void run(viewEntity)}
          >
            {w.viewEdit}
          </button>
          {prepared && (
            <button
              type="button"
              disabled={locked || Boolean(ticket)}
              onClick={() => {
                setPrepared(undefined);
                setShowEditor(false);
              }}
            >
              {w.closeEditor}
            </button>
          )}
        </div>
        {prepared && (
          <section aria-label={w.prepared} hidden={!showEditor}>
            <h3>{w.prepared}</h3>
            <StandalonePokemonPanel
              key={prepared.id}
              seed={prepared.snapshot}
              disabled={locked || Boolean(ticket) || !showEditor}
              preparedActions={[
                ...extraPreparedActions,
                {
                  label: w.addEdited,
                  onPrepare: (snapshot) => prepareEdited(snapshot, "add"),
                },
                {
                  label: w.importEdited,
                  onPrepare: (snapshot) => prepareEdited(snapshot, "import"),
                },
              ]}
            />
          </section>
        )}
        <div hidden={showEditor}>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || Boolean(ticket) || !applied || !view?.matches}
              onClick={() => void run(() => preview("import", true))}
            >
              {w.importAll}
            </button>
            <button
              type="button"
              disabled={locked || !applied || !view?.matches}
              onClick={() => void run(archive)}
            >
              {w.archive}
            </button>
            <button
              type="button"
              disabled={locked || !applied}
              onClick={() => setReportQuery(reportQuery ? undefined : applied)}
            >
              {w.report}
            </button>
          </div>
          {reportQuery && (
            <PokemonReportViewer
              key={JSON.stringify(reportQuery)}
              revision={0}
              lang={lang}
              busy={locked}
              actions={reportActions}
            />
          )}
          <details>
            <summary>
              {w.files} ({databaseDirectoryFiles(files, directory).length})
            </summary>
            <ul>
              {databaseDirectoryFiles(files, directory).map((file) => (
                <li key={file.id}>
                  <span>
                    {databaseSourceName(file)} · {file.data.byteLength} B{" "}
                    {view?.files.find((f) => f.id === file.id)?.error
                      ? `· ${w.unsupported}`
                      : ""}
                  </span>
                  <button
                    type="button"
                    disabled={locked || Boolean(ticket)}
                    onClick={() =>
                      void run(async () => {
                        const next = files.filter((f) => f.id !== file.id);
                        await replaceDatabaseFiles(files, next);
                        if (life.current) {
                          setFiles(next);
                          await open(next);
                        }
                      })
                    }
                  >
                    {w.remove}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>{w.options}</summary>
            <div className="save-search-fields">
              {onOpenSettings && (
                <button
                  type="button"
                  disabled={locked || Boolean(ticket)}
                  onClick={onOpenSettings}
                >
                  {settingsWords[lang].title}
                </button>
              )}
              <label className="field">
                <span>{w.box}</span>
                <Select
                  disabled={locked || Boolean(ticket) || !catalog?.boxes}
                  value={box}
                  onChange={(e) => setBox(Number(e.target.value))}
                >
                  {Array.from({ length: catalog?.boxes ?? 0 }, (_, i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ))}
                </Select>
              </label>
              {check(w.clear, clear, setClear)}
              {check(w.overwrite, overwrite, setOverwrite)}
              {check(w.adapt, adapt, setAdapt)}
              {check(w.dex, dex, setDex)}
              {check(w.records, records, setRecords)}
            </div>
          </details>
          {catalog && (
            <>
              <div className="save-editor-toolbar">
                {check(w.current, query.current, (value) =>
                  setQuery({ ...query, current: value }),
                )}
                {check(w.library, query.files, (value) =>
                  setQuery({ ...query, files: value }),
                )}
                {check(w.backups, query.backups, (value) =>
                  setQuery({ ...query, backups: value }),
                )}
                <label className="field">
                  <span>{w.legal}</span>
                  <Select
                    disabled={locked || Boolean(ticket)}
                    value={query.legal === null ? "any" : String(query.legal)}
                    onChange={(e) =>
                      setQuery({
                        ...query,
                        legal:
                          e.target.value === "any"
                            ? null
                            : e.target.value === "true",
                      })
                    }
                  >
                    <option value="any">{w.any}</option>
                    <option value="true">{w.yes}</option>
                    <option value="false">{w.no}</option>
                  </Select>
                </label>
                <label className="field">
                  <span>{w.clones}</span>
                  <Select
                    disabled={locked || Boolean(ticket)}
                    value={query.clones}
                    onChange={(e) =>
                      setQuery({
                        ...query,
                        clones: Number(e.target.value) as 0 | 1 | 2,
                      })
                    }
                  >
                    <option value={0}>{w.none}</option>
                    <option value={1}>{w.details}</option>
                    <option value={2}>{w.pid}</option>
                  </Select>
                </label>
              </div>
              <DatabaseFilters
                catalog={catalog}
                query={query}
                lang={lang}
                disabled={locked || Boolean(ticket)}
                onChange={setQuery}
                onSearch={() => void run(() => search(0, query, true))}
              />
            </>
          )}
          <output aria-live="polite">
            {message || (view ? `${view.matches} / ${view.total}` : "")}
          </output>
          {view && (
            <>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked || !view.rows.length || Boolean(ticket)}
                  onClick={() => setSelected(view.rows.map((r) => r.id))}
                >
                  {w.allPage}
                </button>
                <button
                  type="button"
                  disabled={
                    locked ||
                    !selected.length ||
                    !catalog?.boxes ||
                    Boolean(ticket)
                  }
                  onClick={() => void run(() => preview("import"))}
                >
                  {w.import}
                </button>
                <button
                  type="button"
                  disabled={
                    locked ||
                    focused === undefined ||
                    row?.source === "backup" ||
                    Boolean(ticket)
                  }
                  onClick={() => void run(() => preview("delete"))}
                >
                  {w.delete}
                </button>
                <button
                  type="button"
                  disabled={locked || Boolean(ticket)}
                  onClick={() => void run(() => preview("clones"))}
                >
                  {w.clean}
                </button>
                <button
                  type="button"
                  disabled={locked || focused === undefined}
                  onClick={() => void run(download)}
                >
                  {w.export}
                </button>
              </div>
              <div
                className="save-db-grid"
                role="list"
                aria-label={w.title}
                style={{ backgroundImage: `url(${databaseWallpaperImage()})` }}
              >
                {view.rows.map((r) => (
                  <div
                    key={r.id}
                    role="listitem"
                    className="save-db-slot"
                    data-selected={selected.includes(r.id)}
                  >
                    <button
                      type="button"
                      disabled={locked || Boolean(ticket)}
                      aria-pressed={r.id === focused}
                      onClick={() => void run(() => select(r.id))}
                      data-hover-target={JSON.stringify({
                        kind: "database",
                        id: r.id,
                      })}
                      title={actions.hover ? undefined : r.identity}
                      aria-description={r.identity}
                    >
                      <PokemonSprite
                        pokemon={r.pokemon}
                        width={40}
                        height={32}
                        alt={r.pokemon.speciesName[lang]}
                        loading="lazy"
                      />
                      <span>
                        {r.pokemon.nickname || r.pokemon.speciesName[lang]}
                      </span>
                      <small>
                        {r.format} · {r.pokemon.level}
                      </small>
                    </button>
                    <label>
                      <input
                        type="checkbox"
                        disabled={locked || Boolean(ticket)}
                        checked={selected.includes(r.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, r.id]
                              : selected.filter((id) => id !== r.id),
                          )
                        }
                      />
                      {w.select}
                    </label>
                  </div>
                ))}
              </div>
              {!view.rows.length && <p>{w.empty}</p>}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={
                    locked || !applied || !view.offset || Boolean(ticket)
                  }
                  onClick={() =>
                    void run(() =>
                      search(
                        Math.max(0, view.offset - view.gridRows * 6),
                        applied,
                      ),
                    )
                  }
                >
                  {w.previous}
                </button>
                <button
                  type="button"
                  disabled={
                    locked ||
                    !applied ||
                    view.offset + view.rows.length >= view.matches ||
                    Boolean(ticket)
                  }
                  onClick={() =>
                    void run(() =>
                      search(view.offset + view.rows.length, applied),
                    )
                  }
                >
                  {w.next}
                </button>
              </div>
            </>
          )}
          {row && (
            <section aria-label={w.details}>
              <h3>
                {row.pokemon.speciesName[lang]} · {row.pokemon.nickname}
              </h3>
              <p>
                {w.trainer}: {row.pokemon.ot} · {w.level}: {row.pokemon.level}
              </p>
              <p>
                {w.source}: {row.identity}
              </p>
              <p>
                PID:{" "}
                {row.pokemon.pid.toString(16).toUpperCase().padStart(8, "0")} ·
                IV: {row.pokemon.ivs.join(" / ")} · EV:{" "}
                {row.pokemon.evs.join(" / ")}
              </p>
            </section>
          )}
        </div>
        {ticket && (
          <section className="save-db-preview" aria-label={w.preview}>
            <h3>{w.preview}</h3>
            <dl>
              <dt>{w.changed}</dt>
              <dd>{ticket.changedSaveBytes}</dd>
              <dt>{w.slots}</dt>
              <dd>{ticket.deletedSlots}</dd>
              <dt>{w.imported}</dt>
              <dd>
                {Math.max(0, ticket.imported)}
                {ticket.imported < 0 ? ` · ${w.noImport}` : ""}
              </dd>
              <dt>{w.removed}</dt>
              <dd>
                {ticket.removedFiles
                  .map((id) => files.find((f) => f.id === id)?.name ?? id)
                  .join(", ") || "0"}
              </dd>
              <dt>{w.added}</dt>
              <dd>{ticket.addedFiles.length}</dd>
            </dl>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={locked}
                onClick={() => void run(confirm)}
              >
                {committed ? w.retry : w.confirm}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => void run(discard)}
              >
                {w.cancel}
              </button>
            </div>
          </section>
        )}
      </section>
    </PokemonHoverSurface>
  );
}
