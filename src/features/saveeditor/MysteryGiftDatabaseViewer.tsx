// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { SearchCandidate } from "./PokemonSearchEditor";
import { EncounterInstructionBuilder } from "./EncounterInstructionBuilder";
import { PokemonDatabaseViewer } from "./PokemonDatabaseViewer";
import { databaseWallpaperImage } from "./art";
import { PokemonSprite } from "./PokemonSprite";
import { PokemonHoverSurface } from "./PokemonHoverSurface";
import { decodeDatabaseBytes, type DatabaseActions } from "./databaseProtocol";
import type { OriginChoice, SaveEditorResult, SaveReport } from "./domain";
import type { StandalonePokemonSnapshot } from "./standalonePokemon";
import { mysteryGiftDatabaseWords } from "./mysteryGiftDatabaseWords";
import {
  loadMysteryGiftLibrary,
  replaceMysteryGiftLibrary,
  readMysteryGiftFiles,
  validateMysteryGiftLibrary,
  type MysteryGiftLibrary,
} from "./mysteryGiftLibrary";
import {
  defaultMysteryGiftQuery,
  type MysteryGiftDatabaseCatalog,
  type MysteryGiftDatabaseRequestKind,
  type MysteryGiftDatabaseTicket,
  type MysteryGiftDatabaseView,
} from "./mysteryGiftDatabaseProtocol";
import "./PokemonEncounterViewer.css";
import "./PokemonDatabaseViewer.css";
import { loadMysterySettings } from "./mysteryGiftSettings";
import { settingsWords } from "./settingsLabels";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { useMysteryGiftChanges } from "./useMysteryGiftChanges";
import { playSaveSound } from "./saveSound";
import {
  mysteryGiftDirectory,
  mysteryGiftDirectoryFiles,
  mysteryGiftDirectorySources,
  attachMysteryGiftDirectory,
  removeMysteryGiftDirectoryFile,
  mysteryGiftDirectoryWords,
} from "./mysteryGiftDirectory";
export interface MysteryGiftDatabaseActions {
  hover?: import("./pokemonHover").ReadPokemonHoverTarget;
  request(
    kind: MysteryGiftDatabaseRequestKind,
    json: string,
    entity?: Uint8Array,
  ): Promise<SaveEditorResult | undefined>;
}
function download(fileName: string, bytes: Uint8Array<ArrayBuffer>) {
  const url = URL.createObjectURL(
      new Blob([bytes], { type: "application/octet-stream" }),
    ),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function MysteryGiftDatabaseViewer({
  lang,
  busy,
  report,
  actions,
  databaseActions,
  onOpenSettings,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  report: SaveReport;
  actions: MysteryGiftDatabaseActions;
  databaseActions: DatabaseActions;
  onOpenSettings?(): void;
}) {
  const w = mysteryGiftDatabaseWords[lang],
    latest = useRef(actions),
    life = useRef(true),
    running = useRef(false),
    ticketRef = useRef<MysteryGiftDatabaseTicket | undefined>(undefined);
  const builderSource = useRef<StandalonePokemonSnapshot | undefined>(
    undefined,
  );
  const settingsJson = useSaveSettingsJson();
  const generation = useRef(0);
  let directory = "";
  try {
    directory = mysteryGiftDirectory(settingsJson);
  } catch {
    /* The invalid directory is refused below. */
  }
  const [options, setOptions] = useState(loadMysterySettings),
    [query, setQuery] = useState(() =>
      defaultMysteryGiftQuery(report.generation),
    ),
    [view, setView] = useState<MysteryGiftDatabaseView>(),
    [catalog, setCatalog] = useState<MysteryGiftDatabaseCatalog>();
  const [library, setLibrary] = useState<MysteryGiftLibrary>(),
    [undo, setUndo] = useState<MysteryGiftLibrary>(),
    [fileId, setFileId] = useState<string>(),
    [focused, setFocused] = useState<number>();
  const [ticket, setTicket] = useState<MysteryGiftDatabaseTicket>(),
    [prepared, setPrepared] = useState<{
      id: string;
      snapshot: StandalonePokemonSnapshot;
    }>(),
    [showEditor, setShowEditor] = useState(false),
    [pending, setPending] = useState(true),
    [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null),
    folderInput = useRef<HTMLInputElement>(null),
    prepareButton = useRef<HTMLButtonElement>(null),
    words = useRef(w);
  const [writeOrigin] = useState(() => ({}));
  const giftRevision = useMysteryGiftChanges(writeOrigin);
  useEffect(() => {
    latest.current = actions;
    words.current = w;
  }, [actions, w]);
  useEffect(() => {
    ticketRef.current = ticket;
  }, [ticket]);
  useEffect(() => {
    let active = true;
    generation.current++;
    life.current = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      running.current = true;
      try {
        setPending(true);
        setView(undefined);
        setCatalog(undefined);
        setTicket(undefined);
        setFocused(undefined);
        setFileId(undefined);
        setUndo(undefined);
        if (!directory) throw new Error("Invalid mystery gift directory.");
        const saved = await loadMysteryGiftLibrary();
        if (!active) return;
        setLibrary(saved);
        const result = await latest.current.request(
          "giftDatabaseOpen",
          JSON.stringify({
            options: loadMysterySettings(),
            files: mysteryGiftDirectorySources(saved.files, directory),
          }),
        );
        if (!active) return;
        if (!result?.giftDatabase) throw Error();
        setOptions(loadMysterySettings());
        setView(result.giftDatabase);
        const next = await latest.current.request("giftDatabaseCatalog", "");
        if (!active) return;
        if (!next?.giftDatabaseCatalog) throw Error();
        setCatalog(next.giftDatabaseCatalog);
      } catch {
        if (active) setMessage(words.current.failed);
      } finally {
        if (active) {
          running.current = false;
          setPending(false);
        }
      }
    })();
    return () => {
      active = false;
      life.current = false;
      const old = ticketRef.current;
      if (old)
        void latest.current.request(
          "giftDatabaseDiscard",
          old.confirmation.token,
        );
    };
  }, [settingsJson, directory, giftRevision]);
  const locked = busy || pending || !directory,
    blocked = locked || Boolean(ticket);
  async function run(task: () => Promise<void>) {
    if (running.current || busy) return;
    running.current = true;
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
        running.current = false;
        setPending(false);
      }
    }
  }
  async function open(next: MysteryGiftLibrary) {
    const currentGeneration = generation.current;
    setView(undefined);
    setFocused(undefined);
    setTicket(undefined);
    setCatalog(undefined);
    const result = await actions.request(
      "giftDatabaseOpen",
      JSON.stringify({
        options,
        files: mysteryGiftDirectorySources(next.files, directory),
      }),
    );
    if (!result?.giftDatabase) throw Error();
    if (!life.current || currentGeneration !== generation.current) return;
    setView(result.giftDatabase);
    const choices = await actions.request(
      "giftDatabaseCatalog",
      builderSource.current?.fileName ?? "",
      builderSource.current?.bytes,
    );
    if (!choices?.giftDatabaseCatalog) throw Error();
    if (life.current && currentGeneration === generation.current) {
      setCatalog(choices.giftDatabaseCatalog);
      setQuery(defaultMysteryGiftQuery(report.generation));
    }
  }
  async function update(files: File[], folder = false) {
    if (!library) return;
    const currentGeneration = generation.current;
    let added = attachMysteryGiftDirectory(
      await readMysteryGiftFiles(
        folder
          ? files.filter((file) => file.size > 0 && file.size <= 48 * 1024)
          : files,
      ),
      directory,
    );
    if (folder) {
      const result = await actions.request(
        "giftDatabaseScanFiles",
        JSON.stringify({
          files: mysteryGiftDirectorySources(added, directory),
        }),
      );
      if (!life.current || currentGeneration !== generation.current) return;
      if (!life.current || currentGeneration !== generation.current) return;
      if (
        !result?.giftDatabaseAccepted ||
        result.giftDatabaseAccepted.some(
          (index) =>
            !Number.isInteger(index) || index < 0 || index >= added.length,
        )
      )
        throw Error();
      const accepted = new Set(result.giftDatabaseAccepted);
      added = added.filter((_file, index) => accepted.has(index));
    }
    if (!added.length) {
      setMessage(mysteryGiftDirectoryWords[lang].empty);
      return;
    }
    const before = library;
    const entries = [...before.files, ...added];
    validateMysteryGiftLibrary({ revision: before.revision, files: entries });
    // Core validates every file before committing any local-library write.
    await open({ revision: before.revision, files: entries });
    if (!life.current) return;
    let next;
    try {
      next = await replaceMysteryGiftLibrary(before, entries, writeOrigin);
    } catch {
      if (!life.current) return;
      await open(before);
      if (life.current) setMessage(w.storage);
      return;
    }
    if (!life.current) return;
    setLibrary(next);
    setUndo(before);
    await open(next);
    if (life.current) setMessage(w.saved);
  }
  async function replace(
    files: MysteryGiftLibrary["files"],
    restoring = false,
  ) {
    if (!library) return;
    const before = library;
    validateMysteryGiftLibrary({ revision: before.revision, files });
    await open({ revision: before.revision, files });
    if (!life.current) return;
    let next;
    try {
      next = await replaceMysteryGiftLibrary(before, files, writeOrigin);
    } catch {
      await open(before);
      if (life.current) setMessage(w.storage);
      return;
    }
    if (!life.current) return;
    setLibrary(next);
    setUndo(restoring ? undefined : before);
    setFileId(undefined);
    await open(next);
    if (life.current) setMessage(w.saved);
  }
  async function search(offset = 0, apply = false) {
    const currentGeneration = generation.current;
    setView(undefined);
    setFocused(undefined);
    const result = await actions.request(
      "giftDatabaseRead",
      JSON.stringify({ query: apply ? query : undefined, offset }),
    );
    if (!result?.giftDatabase) throw Error();
    if (!life.current || currentGeneration !== generation.current) return;
    setView(result.giftDatabase);
    if (apply) playSaveSound("other");
  }
  async function preview(convertToSave: boolean) {
    if (focused === undefined) return;
    setTicket(undefined);
    const result = await actions.request(
      "giftDatabasePreview",
      JSON.stringify({ id: focused, convertToSave }),
    );
    if (!result?.giftDatabasePreview) throw Error();
    if (life.current) setTicket(result.giftDatabasePreview);
  }
  async function discard() {
    if (ticket)
      await actions.request("giftDatabaseDiscard", ticket.confirmation.token);
    if (life.current) {
      setTicket(undefined);
      prepareButton.current?.focus();
    }
  }
  async function confirm() {
    if (!ticket) return;
    const selected = ticket;
    setTicket(undefined);
    const result = await actions.request(
      "giftDatabaseCommit",
      JSON.stringify(selected.confirmation),
    );
    if (!result?.pokemonFile) throw Error();
    const bytes = decodeDatabaseBytes(result.pokemonFile.data),
      digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    )
      .join("")
      .toUpperCase();
    if (
      hash !== selected.confirmation.outputHash ||
      selected.confirmation.sourceHash !== view?.sourceHash
    )
      throw Error();
    if (!life.current) return;
    if (selected.convertToSave) {
      builderSource.current = {
        bytes,
        fileName: result.pokemonFile.fileName,
        inputEncrypted: false,
        useFileFormat: true,
      };
      setPrepared({
        id: crypto.randomUUID(),
        snapshot: {
          bytes,
          fileName: result.pokemonFile.fileName,
          inputEncrypted: false,
          useFileFormat: true,
        },
      });
      setShowEditor(true);
    } else download(result.pokemonFile.fileName, bytes);
  }
  async function exportGift() {
    if (focused === undefined) return;
    const result = await actions.request("giftDatabaseExport", String(focused));
    if (!result?.pokemonFile) throw Error();
    if (life.current)
      download(
        result.pokemonFile.fileName,
        decodeDatabaseBytes(result.pokemonFile.data),
      );
  }
  async function exportAll() {
    const result = await actions.request("giftDatabaseArchive", "");
    if (!result?.output?.length) throw Error();
    const archive = new Uint8Array(result.output);
    if (life.current) download("PokeRNGKit-MysteryGifts.zip", archive);
  }
  const selected = view?.rows.find((row) => row.id === focused),
    any: OriginChoice = { id: -1, name: { zh: w.any, en: w.any, ja: w.any } };
  function candidate(
    title: string,
    choices: OriginChoice[],
    value: number,
    onValue: (value: number) => void,
  ) {
    return (
      <SearchCandidate
        title={title}
        choices={[any, ...choices]}
        value={value}
        lang={lang}
        disabled={blocked}
        onValue={onValue}
        emptyValue={-1}
      />
    );
  }
  function tri(
    title: string,
    value: boolean | null,
    onValue: (value: boolean | null) => void,
  ) {
    return (
      <label className="field">
        <span>{title}</span>
        <Select
          value={value === null ? "any" : String(value)}
          disabled={blocked}
          onChange={(event) =>
            onValue(
              event.target.value === "any"
                ? null
                : event.target.value === "true",
            )
          }
        >
          <option value="any">{w.any}</option>
          <option value="true">{w.yes}</option>
          <option value="false">{w.no}</option>
        </Select>
      </label>
    );
  }
  return (
    <PokemonHoverSurface
      report={report}
      revision={view}
      busy={locked}
      lang={lang}
      readTarget={actions.hover}
    >
      <section
        className="save-encounters save-pokemon-database"
        aria-label={w.title}
      >
        <h3>{w.title}</h3>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={blocked}
            onClick={() =>
              void run(async () => {
                const next = await loadMysteryGiftLibrary();
                if (!life.current) return;
                setLibrary(next);
                setUndo(undefined);
                await open(next);
              })
            }
          >
            {w.reload}
          </button>
          {prepared && (
            <button
              type="button"
              disabled={blocked}
              aria-pressed={showEditor}
              onClick={() => setShowEditor((value) => !value)}
            >
              {showEditor ? w.closeEditor : w.editor}
            </button>
          )}
        </div>
        <p className="save-encounter-hint">
          {mysteryGiftDirectoryWords[lang].title}: <strong>{directory}</strong>
        </p>
        <p className="save-encounter-hint">
          {mysteryGiftDirectoryWords[lang].note}
        </p>
        <details>
          <summary>
            {w.library} (
            {mysteryGiftDirectoryFiles(library?.files ?? [], directory).length})
          </summary>
          <p className="save-encounter-hint">{w.source}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={blocked || !library}
              onClick={() => input.current?.click()}
            >
              {w.add}
            </button>
            <button
              type="button"
              disabled={blocked || !library}
              onClick={() => folderInput.current?.click()}
            >
              {mysteryGiftDirectoryWords[lang].folder}
            </button>
            <button
              type="button"
              disabled={blocked || !fileId}
              onClick={() =>
                void run(() =>
                  replace(
                    removeMysteryGiftDirectoryFile(
                      library!.files,
                      fileId!,
                      directory,
                    ),
                  ),
                )
              }
            >
              {w.remove}
            </button>
            <button
              type="button"
              disabled={blocked || !undo}
              onClick={() => void run(() => replace(undo!.files, true))}
            >
              {w.undo}
            </button>
          </div>
          <input
            ref={input}
            type="file"
            hidden
            multiple
            accept=".pcd,.pgt,.wc4,.pgf,.wc5full,.wc6,.wc6full,.wc7,.wc7full,.wr7,.wb7,.wb7full,.wc8,.wc8full,.wa8,.wb8,.wc9,.wa9"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) void run(() => update(files));
            }}
          />
          <input
            ref={folderInput}
            type="file"
            hidden
            multiple
            {...{ webkitdirectory: "" }}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) void run(() => update(files, true));
            }}
          />
          <ul>
            {mysteryGiftDirectoryFiles(library?.files ?? [], directory).map(
              (file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    disabled={blocked}
                    aria-pressed={fileId === file.id}
                    onClick={() => setFileId(file.id)}
                  >
                    {file.directory ?? "mgdb"}/{file.fileName}
                  </button>
                </li>
              ),
            )}
          </ul>
        </details>
        <details>
          <summary>{w.settings}</summary>
          {onOpenSettings && (
            <button type="button" disabled={blocked} onClick={onOpenSettings}>
              {settingsWords[lang].title}
            </button>
          )}
        </details>
        {catalog && (
          <>
            <div className="save-encounter-fields">
              {candidate(w.species, catalog.species, query.species, (value) =>
                setQuery({ ...query, species: value }),
              )}
              {candidate(w.item, catalog.items, query.heldItem, (value) =>
                setQuery({ ...query, heldItem: value }),
              )}
              {query.moves.map((move, index) => (
                <div key={index}>
                  {candidate(
                    `${w.move} ${index + 1}`,
                    catalog.moves,
                    move,
                    (value) =>
                      setQuery({
                        ...query,
                        moves: query.moves.map((old, i) =>
                          i === index ? value : old,
                        ),
                      }),
                  )}
                </div>
              ))}
              {tri(w.egg, query.egg, (value) =>
                setQuery({ ...query, egg: value }),
              )}
              {tri(w.shiny, query.shiny, (value) =>
                setQuery({ ...query, shiny: value }),
              )}
              <label className="field">
                <span>{w.comparison}</span>
                <Select
                  disabled={blocked}
                  value={query.comparison}
                  onChange={(event) =>
                    setQuery({
                      ...query,
                      comparison: Number(event.target.value),
                      generation:
                        report.generation >= 4 ? report.generation : 10,
                    })
                  }
                >
                  <option value={0}>{w.any}</option>
                  <option value={1}>&gt;=</option>
                  <option value={2}>==</option>
                  <option value={3}>&lt;=</option>
                </Select>
              </label>
              <label className="field">
                <span>{w.generation}</span>
                <Select
                  disabled={blocked || query.comparison === 0}
                  value={query.generation || 10}
                  onChange={(event) =>
                    setQuery({
                      ...query,
                      generation: Number(event.target.value),
                    })
                  }
                >
                  <option value={10}>{w.any}</option>
                  {[9, 8, 7, 6, 5, 4].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <details>
              <summary>{w.instructions}</summary>
              <EncounterInstructionBuilder
                catalog={catalog}
                lang={lang}
                disabled={blocked}
                value={query.instructions}
                onChange={(value) =>
                  setQuery({ ...query, instructions: value })
                }
              />
              <label className="field">
                <span>{w.instructions}</span>
                <textarea
                  disabled={blocked}
                  maxLength={32767}
                  rows={4}
                  value={query.instructions}
                  onChange={(event) =>
                    setQuery({ ...query, instructions: event.target.value })
                  }
                />
              </label>
            </details>
          </>
        )}
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={blocked || !view}
            onClick={() => void run(() => search(0, true))}
          >
            {w.search}
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              setQuery({
                ...defaultMysteryGiftQuery(report.generation),
                comparison: query.comparison,
                generation: query.generation,
              });
              playSaveSound("other");
            }}
          >
            {w.reset}
          </button>
          <button
            type="button"
            disabled={blocked || !view?.matches}
            onClick={() => void run(exportAll)}
          >
            {w.exportAll}
          </button>
        </div>
        {message && <p role="status">{message}</p>}
        {view && (
          <>
            <p>
              {w.count}: {view.matches}
            </p>
            <div
              className="save-db-grid"
              style={{ backgroundImage: `url(${databaseWallpaperImage()})` }}
            >
              {view.rows.map((row) => (
                <div key={row.id} className="save-db-slot">
                  <button
                    type="button"
                    disabled={blocked}
                    aria-pressed={focused === row.id}
                    onClick={() => setFocused(row.id)}
                    data-hover-target={JSON.stringify({
                      kind: "gift",
                      id: row.id,
                    })}
                    title={
                      actions.hover
                        ? undefined
                        : row.details.map((line) => line[lang]).join("\n")
                    }
                  >
                    <PokemonSprite
                      pokemon={row.artwork ?? row}
                      alt=""
                      width={40}
                      height={32}
                    />
                    <span>
                      {row.cardId} · {row.title}
                    </span>
                  </button>
                </div>
              ))}
            </div>
            {!view.matches && <p>{w.empty}</p>}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={blocked || !view.offset}
                onClick={() =>
                  void run(() =>
                    search(Math.max(0, view.offset - view.gridRows * 6)),
                  )
                }
              >
                {w.previous}
              </button>
              <button
                type="button"
                disabled={
                  blocked || view.offset + view.rows.length >= view.matches
                }
                onClick={() =>
                  void run(() => search(view.offset + view.gridRows * 6))
                }
              >
                {w.next}
              </button>
            </div>
          </>
        )}
        {selected && (
          <>
            <h4>{w.details}</h4>
            <pre>{selected.details.map((line) => line[lang]).join("\n")}</pre>
            <div className="save-editor-toolbar">
              <button
                ref={prepareButton}
                type="button"
                disabled={blocked}
                onClick={() => void run(() => preview(true))}
              >
                {w.prepare}
              </button>
              <button
                type="button"
                disabled={blocked}
                onClick={() => void run(() => preview(false))}
              >
                {w.native}
              </button>
              <button
                type="button"
                disabled={blocked}
                onClick={() => void run(exportGift)}
              >
                {w.export}
              </button>
            </div>
          </>
        )}
        {ticket && (
          <div
            className="save-encounter-preview"
            role="region"
            aria-label={w.preview}
          >
            <h4>{w.preview}</h4>
            <PokemonSprite pokemon={ticket.pokemon} alt="" />
            <p>
              {ticket.pokemon.nickname} · {ticket.pokemon.pid} ·{" "}
              {ticket.pokemon.level}
            </p>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={locked}
                onClick={() => void run(confirm)}
              >
                {w.confirm}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => void run(discard)}
              >
                {w.cancel}
              </button>
            </div>
          </div>
        )}
        {showEditor && prepared && (
          <PokemonDatabaseViewer
            key={prepared.id}
            lang={lang}
            busy={locked}
            actions={databaseActions}
            preparedSeed={prepared.snapshot}
            extraPreparedActions={[
              {
                label: w.editorProperties,
                onPrepare: async (snapshot) => {
                  await run(async () => {
                    if (snapshot.inputEncrypted || !snapshot.useFileFormat)
                      throw Error();
                    const result = await actions.request(
                      "giftDatabaseCatalog",
                      snapshot.fileName,
                      snapshot.bytes,
                    );
                    if (!result?.giftDatabaseCatalog) throw Error();
                    if (life.current) {
                      builderSource.current = {
                        ...snapshot,
                        bytes: new Uint8Array(snapshot.bytes),
                      };
                      setCatalog(result.giftDatabaseCatalog);
                    }
                  });
                },
              },
            ]}
          />
        )}
      </section>
    </PokemonHoverSurface>
  );
}
