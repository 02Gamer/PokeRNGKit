// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { EncounterInstructionBuilder } from "./EncounterInstructionBuilder";
import { SearchCandidate } from "./PokemonSearchEditor";
import { PokemonDatabaseViewer } from "./PokemonDatabaseViewer";
import { decodeDatabaseBytes, type DatabaseActions } from "./databaseProtocol";
import { databaseWallpaperImage } from "./art";
import { PokemonSprite } from "./PokemonSprite";
import { PokemonHoverSurface } from "./PokemonHoverSurface";
import { encounterWords, encounterEnumName } from "./encounterWords";
import {
  loadEncounterSettings,
  saveEncounterSettings,
} from "./encounterSettings";
import type {
  EncounterCatalog,
  EncounterCriteria,
  EncounterEnum,
  EncounterOpen,
  EncounterOptions,
  EncounterQuery,
  EncounterRequestKind,
  EncounterTicket,
  EncounterTrainer,
  EncounterView,
} from "./encounterProtocol";
import type { SaveEditorResult, SaveReport, OriginChoice } from "./domain";
import type { StandalonePokemonSnapshot } from "./standalonePokemon";
import "./PokemonEncounterViewer.css";
import { settingsWords } from "./settingsLabels";
import { playSaveSound } from "./saveSound";

export interface EncounterActions {
  hover?: import("./pokemonHover").ReadPokemonHoverTarget;
  request(
    kind: EncounterRequestKind,
    json: string,
    entity?: Uint8Array,
  ): Promise<SaveEditorResult | undefined>;
}
export function PokemonEncounterViewer({
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
  actions: EncounterActions;
  databaseActions: DatabaseActions;
  onOpenSettings?(): void;
}) {
  const w = encounterWords[lang];
  const currentWords = useRef(w);
  useEffect(() => {
    currentWords.current = w;
  }, [w]);
  const [local] = useState(loadEncounterSettings);
  const [options] = useState<EncounterOptions>(local.options),
    [trainers, setTrainers] = useState<EncounterTrainer[]>(local.trainers);
  const [view, setView] = useState<EncounterView>(),
    [catalog, setCatalog] = useState<EncounterCatalog>(),
    [criteria, setCriteria] = useState<EncounterCriteria>();
  const [query, setQuery] = useState<EncounterQuery>({
    species: 0,
    version: 0,
    moves: [0, 0, 0, 0],
    egg: null,
    shiny: null,
    types: [1, 2, 4, 8, 16],
    instructions: "",
  });
  const [tab, setTab] = useState<
      "filters" | "criteria" | "trainers" | "settings"
    >("filters"),
    [pending, setPending] = useState(true),
    [message, setMessage] = useState("");
  const [focused, setFocused] = useState<number>(),
    [ticket, setTicket] = useState<EncounterTicket>();
  const [prepared, setPrepared] = useState<{
      id: string;
      snapshot: StandalonePokemonSnapshot;
    }>(),
    [showEditor, setShowEditor] = useState(false);
  const [sourceKind, setSourceKind] = useState<"blank" | "slot" | "file">(
      "blank",
    ),
    [box, setBox] = useState(0),
    [slot, setSlot] = useState(0),
    [sourceFile, setSourceFile] = useState<StandalonePokemonSnapshot>();
  const life = useRef(true),
    runner = useRef(false),
    latest = useRef(actions),
    fileInput = useRef<HTMLInputElement>(null),
    generateButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    latest.current = actions;
  }, [actions]);
  useEffect(() => {
    life.current = true;
    let active = true;
    runner.current = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        let result = await latest.current.request(
          "encounterOpen",
          JSON.stringify({ options: local.options, trainers: local.trainers }),
        );
        if (!active) return;
        if (!result?.encounters) {
          // Keep stored drafts editable even if Core rejects a stale trainer
          // reference. Open a fresh source to obtain current candidate lists.
          result = await latest.current.request("encounterOpen", "{}");
          if (!active) return;
          setMessage(currentWords.current.failed);
        }
        if (!result?.encounters) throw Error();
        setView(result.encounters);
        setCriteria(result.encounters.criteria);
        const next = await latest.current.request("encounterCatalog", "");
        if (!active) return;
        if (!next?.encounterCatalog) throw Error();
        setCatalog(next.encounterCatalog);
      } catch {
        if (active) setMessage(currentWords.current.failed);
      } finally {
        if (active) {
          runner.current = false;
          setPending(false);
        }
      }
    })();
    return () => {
      active = false;
      life.current = false;
    };
  }, [local]);
  const locked = busy || pending,
    blocked = locked || Boolean(ticket);
  async function run(task: () => Promise<void>) {
    if (runner.current || busy) return;
    runner.current = true;
    setPending(true);
    setMessage("");
    try {
      await task();
    } catch {
      if (life.current) setMessage(w.failed);
    } finally {
      if (life.current) {
        runner.current = false;
        setPending(false);
      }
    }
  }
  function receive(result: SaveEditorResult | undefined) {
    if (!result?.encounters) throw Error();
    if (life.current) {
      setView(result.encounters);
      setCriteria(result.encounters.criteria);
      setFocused(undefined);
    }
  }
  async function open(
    saveSettings = false,
    edited?: StandalonePokemonSnapshot,
  ) {
    setView(undefined);
    setFocused(undefined);
    setTicket(undefined);
    const source: EncounterOpen = { options, trainers };
    if (sourceKind === "slot" && !edited) source.position = { box, slot };
    if (edited) {
      if (edited.inputEncrypted || !edited.useFileFormat) throw Error();
      source.fileName = edited.fileName;
      setSourceKind("file");
      setSourceFile({ ...edited, bytes: new Uint8Array(edited.bytes) });
    } else if (sourceKind === "file") {
      if (!sourceFile) throw Error();
      source.fileName = sourceFile.fileName;
    }
    receive(
      await actions.request(
        "encounterOpen",
        JSON.stringify(source),
        edited?.bytes ??
          (sourceKind === "file" ? sourceFile?.bytes : undefined),
      ),
    );
    const next = await actions.request("encounterCatalog", "");
    if (!next?.encounterCatalog) throw Error();
    if (!life.current) return;
    setCatalog(next.encounterCatalog);
    setTicket(undefined);
    if (saveSettings)
      try {
        saveEncounterSettings(options, trainers);
        setMessage(w.saved);
      } catch {
        setMessage(w.storage);
      }
  }
  async function search(offset = 0, newQuery = false) {
    try {
      receive(
        await actions.request(
          "encounterRead",
          JSON.stringify({ query: newQuery ? query : undefined, offset }),
        ),
      );
      if (newQuery && life.current) playSaveSound("other");
    } catch {
      if (newQuery && life.current) {
        setView(undefined);
        setFocused(undefined);
      }
      throw Error();
    }
  }
  async function changeCriteria(action: "set" | "reset" | "editor") {
    receive(
      await actions.request(
        "encounterCriteria",
        JSON.stringify({
          action,
          criteria: action === "set" ? criteria : undefined,
        }),
      ),
    );
    if (life.current && action !== "set") playSaveSound("other");
  }
  async function generate() {
    if (focused === undefined) return;
    const result = await actions.request("encounterPreview", String(focused));
    if (!result?.encounterPreview) throw Error();
    if (life.current) setTicket(result.encounterPreview);
  }
  async function discard() {
    if (ticket)
      await actions.request("encounterDiscard", ticket.confirmation.token);
    if (life.current) {
      setTicket(undefined);
      generateButton.current?.focus();
    }
  }
  async function confirm() {
    if (!ticket) return;
    const result = await actions.request(
      "encounterCommit",
      JSON.stringify(ticket.confirmation),
    );
    if (!result?.pokemonFile) {
      if (life.current) setTicket(undefined);
      throw Error();
    }
    if (life.current) {
      setPrepared({
        id: crypto.randomUUID(),
        snapshot: {
          bytes: decodeDatabaseBytes(result.pokemonFile.data),
          fileName: result.pokemonFile.fileName,
          inputEncrypted: false,
          useFileFormat: true,
        },
      });
      setTicket(undefined);
      setShowEditor(true);
    }
  }
  const anyChoice: OriginChoice = {
    id: 0,
    name: { zh: w.any, en: w.any, ja: w.any },
  };
  const candidate = (
    title: string,
    choices: OriginChoice[],
    value: number,
    change: (value: number) => void,
    any = true,
  ) => (
    <SearchCandidate
      title={title}
      choices={any ? [anyChoice, ...choices] : choices}
      value={value}
      lang={lang}
      disabled={blocked}
      onValue={change}
    />
  );
  const tri = (
    title: string,
    value: boolean | null,
    change: (value: boolean | null) => void,
  ) => (
    <label className="field">
      <span>{title}</span>
      <Select
        value={value === null ? "any" : String(value)}
        disabled={blocked}
        onChange={(e) =>
          change(e.target.value === "any" ? null : e.target.value === "true")
        }
      >
        <option value="any">{w.any}</option>
        <option value="true">{w.yes}</option>
        <option value="false">{w.no}</option>
      </Select>
    </label>
  );
  const numeric = (
    title: string,
    value: number,
    min: number,
    max: number,
    change: (value: number) => void,
  ) => (
    <label className="field">
      <span>{title}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={blocked}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (
            e.target.value !== "" &&
            Number.isInteger(n) &&
            n >= min &&
            n <= max
          )
            change(n);
        }}
      />
    </label>
  );
  const check = (
    title: string,
    value: boolean,
    change: (value: boolean) => void,
  ) => (
    <label className="save-db-check">
      <input
        type="checkbox"
        checked={value}
        disabled={blocked}
        onChange={(e) => change(e.target.checked)}
      />
      {title}
    </label>
  );
  const enumField = (
    title: string,
    key: keyof EncounterCriteria,
    values: EncounterEnum[],
  ) => (
    <label className="field">
      <span>{title}</span>
      <Select
        value={criteria?.[key] ?? 0}
        disabled={blocked}
        onChange={(e) =>
          setCriteria((c) => (c ? { ...c, [key]: Number(e.target.value) } : c))
        }
      >
        {values.map((v) => (
          <option key={`${v.id}:${v.name}`} value={v.id}>
            {encounterEnumName(v.name, lang)}
          </option>
        ))}
      </Select>
    </label>
  );
  const row = view?.rows.find((r) => r.id === focused);
  const slotCount = box < 0 ? report.partyCount : report.boxSlotCount;
  return (
    <PokemonHoverSurface
      report={report}
      revision={view}
      busy={locked}
      lang={lang}
      readTarget={actions.hover}
    >
      <section className="save-encounters" aria-label={w.title}>
        <div className="save-editor-toolbar save-db-mode">
          <button
            type="button"
            disabled={locked || Boolean(ticket)}
            aria-pressed={!showEditor}
            onClick={() => setShowEditor(false)}
          >
            {w.back}
          </button>
          {prepared && (
            <button
              type="button"
              disabled={locked || Boolean(ticket)}
              aria-pressed={showEditor}
              onClick={() => setShowEditor(true)}
            >
              {w.prepared}
            </button>
          )}
        </div>
        {prepared && (
          <div hidden={!showEditor}>
            <PokemonDatabaseViewer
              key={prepared.id}
              lang={lang}
              busy={locked || !showEditor}
              actions={databaseActions}
              preparedSeed={prepared.snapshot}
              extraPreparedActions={[
                {
                  label: w.fromEditor,
                  onPrepare: async (snapshot) => {
                    await run(async () => {
                      await open(false, snapshot);
                      if (life.current) {
                        setShowEditor(false);
                        setTab("criteria");
                      }
                    });
                  },
                },
              ]}
            />
          </div>
        )}
        <div hidden={showEditor}>
          <details>
            <summary>{w.fromSource}</summary>
            <div className="save-encounter-fields">
              <label className="field">
                <span>{w.load}</span>
                <Select
                  value={sourceKind}
                  disabled={blocked}
                  onChange={(e) =>
                    setSourceKind(e.target.value as typeof sourceKind)
                  }
                >
                  {(["blank", "slot", "file"] as const).map((k) => (
                    <option key={k} value={k}>
                      {w[k]}
                    </option>
                  ))}
                </Select>
              </label>
              {sourceKind === "slot" && (
                <>
                  <label className="field">
                    <span>{w.box}</span>
                    <Select
                      value={box}
                      disabled={blocked}
                      onChange={(e) => {
                        setBox(Number(e.target.value));
                        setSlot(0);
                      }}
                    >
                      {report.partyCount > 0 && (
                        <option value={-1}>{w.party}</option>
                      )}
                      {report.boxes.map((b) => (
                        <option key={b.index} value={b.index}>
                          {b.name || `${w.box} ${b.index + 1}`}
                        </option>
                      ))}
                    </Select>
                  </label>
                  {numeric(
                    w.position,
                    slot + 1,
                    1,
                    Math.max(1, slotCount),
                    (n) => setSlot(n - 1),
                  )}
                </>
              )}
              {sourceKind === "file" && (
                <>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => fileInput.current?.click()}
                  >
                    {sourceFile?.fileName ?? w.choose}
                  </button>
                  <input
                    ref={fileInput}
                    hidden
                    type="file"
                    accept=".sk2,.rk4,.pk1,.pk2,.pk3,.ck3,.xk3,.pk4,.bk4,.pk5,.pk6,.pk7,.pb7,.pk8,.pb8,.pa8,.pk9,.pa9"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file)
                        void run(async () => {
                          if (file.size < 1 || file.size > 1024 * 1024)
                            throw Error();
                          const bytes = new Uint8Array(
                            await file.arrayBuffer(),
                          );
                          if (life.current)
                            setSourceFile({
                              bytes,
                              fileName: file.name,
                              inputEncrypted: false,
                              useFileFormat: true,
                            });
                        });
                    }}
                  />
                </>
              )}
              <button
                type="button"
                disabled={blocked || (sourceKind === "file" && !sourceFile)}
                onClick={() => void run(() => open())}
              >
                {w.load}
              </button>
            </div>
          </details>
          <div
            className="save-editor-toolbar"
            role="group"
            aria-label={w.settings}
          >
            {(["filters", "criteria", "trainers", "settings"] as const).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tab === t}
                  disabled={locked || Boolean(ticket)}
                  onClick={() => setTab(t)}
                >
                  {w[t]}
                </button>
              ),
            )}
          </div>
          {catalog && tab === "filters" && (
            <>
              <div className="save-encounter-fields">
                {candidate(
                  w.species,
                  catalog.species,
                  query.species,
                  (species) => setQuery((q) => ({ ...q, species })),
                )}
                {candidate(w.game, catalog.games, query.version, (version) =>
                  setQuery((q) => ({ ...q, version })),
                )}
                {query.moves.map((move, index) => (
                  <div key={index}>
                    {candidate(
                      `${w.move} ${index + 1}`,
                      catalog.moves,
                      move,
                      (value) =>
                        setQuery((q) => ({
                          ...q,
                          moves: q.moves.map((m, i) =>
                            i === index ? value : m,
                          ),
                        })),
                    )}
                  </div>
                ))}
                {tri(w.egg, query.egg, (egg) =>
                  setQuery((q) => ({ ...q, egg })),
                )}
                {tri(w.shiny, query.shiny, (shiny) =>
                  setQuery((q) => ({ ...q, shiny })),
                )}
              </div>
              <div
                className="save-editor-toolbar"
                role="group"
                aria-label={w.filters}
              >
                {catalog.types.map((type) => (
                  <label className="save-db-check" key={type.id}>
                    <input
                      type="checkbox"
                      checked={query.types.includes(type.id)}
                      disabled={blocked}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          e.preventDefault();
                          setQuery((q) => ({ ...q, types: [type.id] }));
                        }
                      }}
                      onChange={(e) =>
                        setQuery((q) => ({
                          ...q,
                          types: catalog.types
                            .filter((v) =>
                              v.id === type.id
                                ? e.target.checked
                                : q.types.includes(v.id),
                            )
                            .map((v) => v.id),
                        }))
                      }
                    />
                    {encounterEnumName(type.name, lang)}
                  </label>
                ))}
              </div>
              <details>
                <summary>{w.instructions}</summary>
                <EncounterInstructionBuilder
                  catalog={catalog}
                  lang={lang}
                  disabled={blocked}
                  value={query.instructions}
                  onChange={(instructions) =>
                    setQuery((q) => ({ ...q, instructions }))
                  }
                />
                <label className="field">
                  <span>{w.instructions}</span>
                  <textarea
                    rows={4}
                    maxLength={32767}
                    value={query.instructions}
                    disabled={blocked}
                    onChange={(e) =>
                      setQuery((q) => ({ ...q, instructions: e.target.value }))
                    }
                  />
                </label>
              </details>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={
                    blocked ||
                    query.types.length === 0 ||
                    (options.returnNoneIfEmptySearch &&
                      query.species === 0 &&
                      query.moves.every((m) => m === 0))
                  }
                  onClick={() => void run(() => search(0, true))}
                >
                  {w.search}
                </button>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => {
                    setQuery({
                      species: 0,
                      version: 0,
                      moves: [0, 0, 0, 0],
                      egg: null,
                      shiny: null,
                      types: catalog.types.map((v) => v.id),
                      instructions: "",
                    });
                    playSaveSound("other");
                  }}
                >
                  {w.reset}
                </button>
              </div>
            </>
          )}
          {catalog && criteria && tab === "criteria" && (
            <>
              <div className="save-encounter-fields">
                {enumField(w.gender, "gender", catalog.genders)}
                {enumField(w.ability, "ability", catalog.abilities)}
                {enumField(w.shiny, "shiny", catalog.shinies)}
                {candidate(
                  w.nature,
                  [
                    ...catalog.natures,
                    {
                      id: 25,
                      name: { zh: w.random, en: w.random, ja: w.random },
                    },
                  ],
                  criteria.nature,
                  (nature) => setCriteria((c) => (c ? { ...c, nature } : c)),
                  false,
                )}
                {(["hp", "atk", "def", "spa", "spd", "spe"] as const).map(
                  (key) => (
                    <div key={key}>
                      {numeric(
                        `${w.iv} ${key.toUpperCase()}`,
                        criteria[key],
                        -128,
                        127,
                        (value) =>
                          setCriteria((c) => (c ? { ...c, [key]: value } : c)),
                      )}
                    </div>
                  ),
                )}
                {numeric(w.levelMin, criteria.levelMin, 0, 255, (levelMin) =>
                  setCriteria((c) => (c ? { ...c, levelMin } : c)),
                )}
                {numeric(w.levelMax, criteria.levelMax, 0, 255, (levelMax) =>
                  setCriteria((c) => (c ? { ...c, levelMax } : c)),
                )}
                {numeric(
                  w.hiddenPowerType,
                  criteria.hiddenPowerType,
                  -128,
                  127,
                  (hiddenPowerType) =>
                    setCriteria((c) => (c ? { ...c, hiddenPowerType } : c)),
                )}
                {numeric(w.form, criteria.form, -128, 127, (form) =>
                  setCriteria((c) => (c ? { ...c, form } : c)),
                )}
                {numeric(w.mutations, criteria.mutations, 0, 255, (mutations) =>
                  setCriteria((c) => (c ? { ...c, mutations } : c)),
                )}
              </div>
              <div className="save-editor-toolbar">
                {catalog.mutations
                  .filter((v) => v.id > 0 && (v.id & (v.id - 1)) === 0)
                  .map((v) =>
                    check(
                      encounterEnumName(v.name, lang),
                      (criteria.mutations & v.id) !== 0,
                      (on) =>
                        setCriteria((c) =>
                          c
                            ? {
                                ...c,
                                mutations: on
                                  ? c.mutations | v.id
                                  : c.mutations & ~v.id,
                              }
                            : c,
                        ),
                    ),
                  )}
              </div>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => void run(() => changeCriteria("set"))}
                >
                  {w.apply}
                </button>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => void run(() => changeCriteria("editor"))}
                >
                  {w.fromEditor}
                </button>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => void run(() => changeCriteria("reset"))}
                >
                  {w.reset}
                </button>
              </div>
            </>
          )}
          {catalog && tab === "trainers" && (
            <>
              <p>{w.trainerHint}</p>
              <button
                type="button"
                disabled={blocked || trainers.length >= 1024}
                onClick={() =>
                  setTrainers((ts) => [
                    ...ts,
                    {
                      version: catalog.games.some(
                        (v) => v.id === report.trainer.gameVersion.value,
                      )
                        ? report.trainer.gameVersion.value
                        : (catalog.games[0]?.id ?? 1),
                      name: report.ot,
                      tid: report.tid,
                      sid: report.sid,
                      gender: report.gender,
                      language: report.language,
                      consoleRegion: 0,
                      country: 0,
                      region: 0,
                    },
                  ])
                }
              >
                {w.addTrainer}
              </button>
              {trainers.map((trainer, index) => {
                const update = <K extends keyof EncounterTrainer>(
                  key: K,
                  value: EncounterTrainer[K],
                ) =>
                  setTrainers((ts) =>
                    ts.map((t, i) =>
                      i === index ? { ...t, [key]: value } : t,
                    ),
                  );
                return (
                  <fieldset key={index}>
                    <legend>{`${w.trainers} ${index + 1}`}</legend>
                    <div className="save-encounter-fields">
                      {candidate(
                        w.game,
                        catalog.games,
                        trainer.version,
                        (v) => update("version", v),
                        false,
                      )}
                      <label className="field">
                        <span>{w.name}</span>
                        <input
                          value={trainer.name}
                          maxLength={32767}
                          disabled={blocked}
                          onChange={(e) => update("name", e.target.value)}
                        />
                      </label>
                      {numeric(w.tid, trainer.tid, 0, 65535, (v) =>
                        update("tid", v),
                      )}
                      {numeric(w.sid, trainer.sid, 0, 65535, (v) =>
                        update("sid", v),
                      )}
                      <label className="field">
                        <span>{w.gender}</span>
                        <Select
                          value={trainer.gender}
                          disabled={blocked}
                          onChange={(e) =>
                            update("gender", Number(e.target.value))
                          }
                        >
                          <option value={0}>{w.male}</option>
                          <option value={1}>{w.female}</option>
                        </Select>
                      </label>
                      <label className="field">
                        <span>{w.language}</span>
                        <Select
                          value={trainer.language}
                          disabled={blocked}
                          onChange={(e) =>
                            update("language", Number(e.target.value))
                          }
                        >
                          {catalog.languages.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name[lang]}
                            </option>
                          ))}
                        </Select>
                      </label>
                      {numeric(
                        w.consoleRegion,
                        trainer.consoleRegion,
                        0,
                        255,
                        (v) => update("consoleRegion", v),
                      )}
                      {numeric(w.country, trainer.country, 0, 255, (v) =>
                        update("country", v),
                      )}
                      {numeric(w.region, trainer.region, 0, 255, (v) =>
                        update("region", v),
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() =>
                        setTrainers((ts) => ts.filter((_, i) => i !== index))
                      }
                    >
                      {w.remove}
                    </button>
                  </fieldset>
                );
              })}
              <button
                type="button"
                disabled={blocked}
                onClick={() => void run(() => open(true))}
              >
                {w.save}
              </button>
            </>
          )}
          {tab === "settings" && (
            <>
              {onOpenSettings && (
                <button
                  type="button"
                  disabled={blocked}
                  onClick={onOpenSettings}
                >
                  {settingsWords[lang].title}
                </button>
              )}
            </>
          )}
          <p className="save-encounter-hint">{w.hint}</p>
          {view && (
            <>
              <div className="save-editor-toolbar">
                <output>
                  {w.count}: {view.matches}
                </output>
                <button
                  type="button"
                  disabled={blocked || view.offset === 0}
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
                <button
                  ref={generateButton}
                  type="button"
                  disabled={
                    blocked ||
                    focused === undefined ||
                    JSON.stringify(criteria) !== JSON.stringify(view.criteria)
                  }
                  onClick={() => void run(generate)}
                >
                  {w.generate}
                </button>
              </div>
              {view.rows.length ? (
                <div
                  className="save-db-grid"
                  style={{
                    backgroundImage: `url(${databaseWallpaperImage()})`,
                  }}
                >
                  {view.rows.map((r) => (
                    <div className="save-db-slot" key={r.id}>
                      <button
                        type="button"
                        disabled={blocked}
                        aria-pressed={focused === r.id}
                        data-hover-target={JSON.stringify({
                          kind: "encounter",
                          id: r.id,
                        })}
                        title={
                          actions.hover ? undefined : r.details[lang].join("\n")
                        }
                        onClick={() => setFocused(r.id)}
                      >
                        <PokemonSprite
                          pokemon={r.artwork ?? r}
                          alt=""
                          width={40}
                          height={32}
                        />
                        <span>
                          {catalog?.species.find((s) => s.id === r.species)
                            ?.name[lang] ?? r.species}
                          {r.form ? ` (${r.form})` : ""}
                        </span>
                        <small>
                          {r.levelMin}–{r.levelMax} ·{" "}
                          {catalog?.games.find((g) => g.id === r.version)?.name[
                            lang
                          ] ?? r.version}
                        </small>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>{w.none}</p>
              )}
              {row && (
                <details open>
                  <summary>
                    {catalog?.species.find((s) => s.id === row.species)?.name[
                      lang
                    ] ?? row.species}
                  </summary>
                  <dl className="save-encounter-detail">
                    <dt>{w.game}</dt>
                    <dd>
                      {catalog?.games.find((g) => g.id === row.version)?.name[
                        lang
                      ] ?? row.version}
                    </dd>
                    <dt>{w.location}</dt>
                    <dd>{row.location}</dd>
                    <dt>{w.egg}</dt>
                    <dd>{row.egg ? w.yes : w.no}</dd>
                    <dt>{w.shiny}</dt>
                    <dd>{row.shiny ? w.yes : w.no}</dd>
                    <dt>{w.ability}</dt>
                    <dd>
                      {encounterEnumName(
                        catalog?.abilities.find((v) => v.id === row.ability)
                          ?.name ?? String(row.ability),
                        lang,
                      )}
                    </dd>
                  </dl>
                  <pre>{row.details[lang].join("\n")}</pre>
                </details>
              )}
            </>
          )}
          {ticket && (
            <section className="save-encounter-preview" aria-label={w.generate}>
              <h3>{w.generate}</h3>
              <PokemonSprite
                pokemon={ticket.pokemon}
                alt=""
                width={80}
                height={64}
              />
              <p>{ticket.pokemon.speciesName[lang]}</p>
              {prepared && <p>{w.replacement}</p>}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void run(confirm)}
                >
                  {prepared ? w.replace : w.confirm}
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
        </div>
        {message && <p role="status">{message}</p>}
      </section>
    </PokemonHoverSurface>
  );
}
