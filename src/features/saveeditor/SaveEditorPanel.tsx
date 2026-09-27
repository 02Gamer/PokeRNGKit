import { TrainerAppearance6Fields } from "./TrainerAppearance6Fields";
import { TrainerDateFields } from "./TrainerDateFields";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileUp, RotateCcw, Unplug } from "lucide-react";
import { Select } from "../shared/Select";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import { SaveEditorClient } from "./client";
import {
  exportSaveName,
  MAX_SAVE_BYTES,
  saveGameChoices,
  reconcileSaveGame,
  trainerDraft,
  trainerDraftMatches,
  rebaseTrainerDraft,
  validateTrainer,
  type OriginCatalog,
  type SaveReport,
  type BoxEdit,
  type StorageEdit,
  type PokemonImport,
  type PokemonLegalityReport,
  type PokemonPosition,
  type PokemonRawEdit,
  type TrainerDraft,
} from "./domain";
import { profileLink, type SaveProfileControllers } from "./profileLink";
import "./SaveEditorPanel.css";
import { saveEditorResources, localizeSaveError } from "./locales";
import type { PokemonEdit } from "./PokemonEditor";
import { SavePokemonBrowser } from "./SavePokemonBrowser";
import { SaveInventoryBrowser } from "./SaveInventoryBrowser";
import { TrainerGeographyFields } from "./TrainerGeographyFields";
import { SaveRecordEditor } from "./SaveRecordEditor";
import { TrainerGameOptionFields } from "./TrainerGameOptionFields";
import { TrainerPositionFields } from "./TrainerPositionFields";

export function SaveEditorPanel(
  controllers: Omit<SaveProfileControllers, "gen5">,
) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const gen5 = useGen5Profiles();
  const client = useRef(new SaveEditorClient());
  const original = useRef<Uint8Array | undefined>(undefined);
  const working = useRef<Uint8Array | undefined>(undefined);
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const operation = useRef(0);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [cancellable, setCancellable] = useState(false);
  const [name, setName] = useState("");
  const [fileRevision, setFileRevision] = useState(0);
  const [report, setReport] = useState<SaveReport>();
  const [workingRevision, setWorkingRevision] = useState(0);
  const [legality, setLegality] = useState<PokemonLegalityReport>();
  const [section, setSection] = useState<
    "pokemon" | "trainer" | "inventory" | "records"
  >("pokemon");
  const [draft, setDraft] = useState<TrainerDraft>({
    nickname: "",
    fashionGender: "",
    gameVersion: "",
    saved: "",
    started: "",
    fame: "",
    rotation: "",
    scaleX: "",
    scaleZ: "",
    scaleY: "",
    map: "",
    x: "",
    z: "",
    y: "",
    textSpeed: "",
    battleStyle: "",
    sound: "",
    battleEffects: "",
    bp: "",
    pokeMiles: "",
    festivalCoins: "",
    watts: "",
    badges: "",
    country: "",
    region: "",
    consoleRegion: "",
    language: "",
    ot: "",
    tid: "",
    sid: "",
    money: "",
    gender: "",
    hours: "",
    minutes: "",
    seconds: "",
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState("");
  const [target, setTarget] = useState("new");
  const [profileName, setProfileName] = useState("");
  const [reviewDefaults, setReviewDefaults] = useState(false);
  const link = report
    ? profileLink(report, version, { ...controllers, gen5 })
    : undefined;
  const choices = report ? saveGameChoices(report) : [];

  useEffect(() => {
    const instance = client.current;
    const lifecycle = operation;
    return () => {
      lifecycle.current++;
      instance.dispose();
    };
  }, []);

  const perform = async (
    action: (id: number) => Promise<void>,
    canCancel = true,
  ) => {
    if (running.current) return;
    const id = ++operation.current;
    running.current = true;
    setBusy(true);
    setCancellable(canCancel);
    setError("");
    setStatus("");
    try {
      await action(id);
    } catch (cause) {
      if (id === operation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (id === operation.current) {
        running.current = false;
        setBusy(false);
      }
    }
  };

  const openFile = (file: File) =>
    perform(async (id) => {
      if (!file.size || file.size > MAX_SAVE_BYTES)
        throw new Error("Save file must be between 1 byte and 32 MiB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (id !== operation.current) return;
      const result = await client.current.run(bytes);
      if (id !== operation.current) return;
      original.current = bytes;
      working.current = bytes;
      setHistory([]);
      setReport(result.report);
      setVersion((previous) => reconcileSaveGame(previous, result.report));
      if (report && report.version !== result.report.version) {
        setTarget("new");
        setReviewDefaults(false);
      }
      setSection((previous) =>
        previous === "records" && !result.report.trainer.canRecords
          ? "trainer"
          : previous,
      );
      setWorkingRevision((previous) => previous + 1);
      setLegality(undefined);
      setDraft(trainerDraft(result.report));
      setName(file.name);
      setFileRevision((previous) => previous + 1);
      setProfileName(`${result.report.ot} · ${result.report.version}`);
      const games = saveGameChoices(result.report);
      setVersion(games.length === 1 ? games[0] : "");
      setTarget("new");
      setReviewDefaults(false);
    });

  const exportFile = () =>
    perform(async (id) => {
      if (!report || !original.current) return;
      const edit = validateTrainer(draft, report);
      const result = await client.current.run(
        working.current ?? original.current,
        JSON.stringify(edit),
      );
      if (id !== operation.current) return;
      if (!result.output) throw new Error("No output was returned.");
      const blob = new Blob([new Uint8Array(result.output)], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportSaveName(name);
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus("exported");
    });

  const readInventory = async () => {
    let inventory: import("./domain").BagReport | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "inventory",
      );
      if (id !== operation.current) return;
      if (!result.inventory) throw new Error("No inventory was returned.");
      inventory = result.inventory;
    });
    return inventory;
  };

  const readRecords = async () => {
    let catalog: import("./domain").SaveRecordCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "records",
      );
      if (id !== operation.current) return;
      if (!result.records) throw new Error("No game records were returned.");
      catalog = result.records;
    });
    return catalog;
  };

  const readHistory = async (query: import("./domain").PokemonPosition) => {
    let catalog: import("./domain").HistoryCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "historyCatalog",
      );
      if (id !== operation.current) return;
      if (!result.historyCatalog)
        throw new Error("No history catalog was returned.");
      catalog = result.historyCatalog;
    });
    return catalog;
  };

  const readMemory = async (query: import("./domain").MemoryQuery) => {
    let catalog: import("./domain").MemoryCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "memoryCatalog",
      );
      if (id !== operation.current) return;
      if (!result.memoryCatalog)
        throw new Error("No memory catalog was returned.");
      catalog = result.memoryCatalog;
    });
    return catalog;
  };

  const readRibbons = async (position: PokemonPosition) => {
    let ribbons: import("./domain").RibbonCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "ribbons",
      );
      if (id !== operation.current) return;
      if (!result.ribbons) throw new Error("No ribbon catalog was returned.");
      ribbons = result.ribbons;
    });
    return ribbons;
  };

  const suggestRelearn = async (
    position: PokemonPosition,
  ): Promise<number[] | undefined> => {
    let moves: number[] | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "relearnSuggestion",
      );
      if (id !== operation.current) return;
      if (!result.relearnSuggestion)
        throw new Error("No relearn suggestion was returned.");
      moves = result.relearnSuggestion;
    });
    return moves;
  };

  const readOrigin = async (
    position: PokemonPosition,
    version?: number,
  ): Promise<OriginCatalog | undefined> => {
    let catalog: OriginCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ ...position, version }),
        "originCatalog",
      );
      if (id !== operation.current) return;
      if (!result.originCatalog)
        throw new Error("No origin catalog was returned.");
      catalog = result.originCatalog;
    });
    return catalog;
  };

  const analyzePokemon = (position: PokemonPosition) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "legality",
      );
      if (id !== operation.current) return;
      if (!result.legality) throw new Error("No legality report was returned.");
      setLegality(result.legality);
    });

  const applyWorkingEdit = (
    edit:
      | PokemonEdit
      | PokemonRawEdit
      | BoxEdit
      | import("./domain").BagEdit
      | import("./domain").BagOperation
      | import("./domain").SaveRecordEdit
      | ReturnType<typeof validateTrainer>
      | StorageEdit
      | (() => Promise<PokemonImport | ReturnType<typeof validateTrainer>>),
    kind:
      | "pokemon"
      | "pokemonRaw"
      | "box"
      | "storage"
      | "pokemonImport"
      | "inventoryEdit"
      | "inventoryBatch"
      | "recordEdit"
      | "trainer",
  ) =>
    perform(async (id) => {
      if (!working.current) return;
      const before = working.current;
      const values = typeof edit === "function" ? await edit() : edit;
      if (id !== operation.current) return;
      const result = await client.current.run(
        before,
        JSON.stringify(values),
        kind,
      );
      if (id !== operation.current) return;
      if (!result.output) throw new Error("No output was returned.");
      setHistory((previous) => {
        const next = [...previous, before];
        while (
          next.length > 1 &&
          (next.length > 20 ||
            next.reduce((size, bytes) => size + bytes.byteLength, 0) >
              64 * 1024 * 1024)
        )
          next.shift();
        return next;
      });
      working.current = result.output;
      setReport(result.report);
      setVersion((previous) => reconcileSaveGame(previous, result.report));
      if (report && report.version !== result.report.version) {
        setTarget("new");
        setReviewDefaults(false);
      }
      setDraft((previous) =>
        kind === "trainer" || !report
          ? trainerDraft(result.report)
          : rebaseTrainerDraft(previous, report, result.report),
      );
      setWorkingRevision((previous) => previous + 1);
      setLegality(undefined);
      setStatus("pokemonSaved");
    });
  const importPokemon = (position: PokemonPosition, file: File) =>
    applyWorkingEdit(async () => {
      if (!file.size || file.size > 1024 * 1024)
        throw new Error("Entity file size is invalid.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return { ...position, fileName: file.name, data: btoa(binary) };
    }, "pokemonImport");

  const exportPokemon = (position: PokemonPosition) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "pokemonExport",
      );
      if (id !== operation.current) return;
      if (!result.pokemonFile) throw new Error("Entity file export failed.");
      const bytes = Uint8Array.from(atob(result.pokemonFile.data), (char) =>
        char.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/octet-stream" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.pokemonFile.fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    });

  const restoreWorking = (originalSave = false) =>
    perform(async (id) => {
      const bytes = originalSave ? original.current : history.at(-1);
      if (!bytes) return;
      const result = await client.current.run(bytes);
      if (id !== operation.current) return;
      working.current = bytes;
      setReport(result.report);
      setVersion((previous) => reconcileSaveGame(previous, result.report));
      if (report && report.version !== result.report.version) {
        setTarget("new");
        setReviewDefaults(false);
      }
      setWorkingRevision((previous) => previous + 1);
      setLegality(undefined);
      setHistory((previous) => (originalSave ? [] : previous.slice(0, -1)));
      setDraft((previous) =>
        originalSave || !report
          ? trainerDraft(result.report)
          : rebaseTrainerDraft(previous, report, result.report),
      );
    });

  return (
    <div className="save-editor-panel" aria-busy={busy}>
      <p>{words.intro}</p>
      <div className="save-editor-toolbar">
        {report && (
          <button
            type="button"
            className="primary"
            disabled={busy || !report.canEdit}
            onClick={() => void exportFile()}
          >
            <Download size={18} aria-hidden="true" /> {words.export}
          </button>
        )}
        {report && (
          <>
            <button
              type="button"
              disabled={busy || history.length === 0}
              onClick={() => void restoreWorking()}
            >
              {words.undo}
            </button>
            <button
              type="button"
              disabled={busy || history.length === 0}
              onClick={() => void restoreWorking(true)}
            >
              {words.restoreSave}
            </button>
          </>
        )}
        <label className="save-editor-file">
          <FileUp size={18} aria-hidden="true" /> {words.open}
          <input
            type="file"
            aria-label={words.open}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void openFile(file);
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !report}
          onClick={() => {
            original.current = undefined;
            working.current = undefined;
            setHistory([]);
            setReport(undefined);
            setLegality(undefined);
            setName("");
            setError("");
            setStatus("");
            client.current.dispose();
          }}
        >
          <Unplug size={18} aria-hidden="true" /> {words.close}
        </button>
        {busy && cancellable && (
          <button
            type="button"
            onClick={() => {
              operation.current++;
              client.current.dispose();
              running.current = false;
              setBusy(false);
            }}
          >
            {t("cancel")}
          </button>
        )}
      </div>
      <p className="save-editor-note">{words.choose}</p>
      {busy && <p role="status">{words.loading}</p>}
      {error && (
        <p role="alert" className="save-editor-error">
          {localizeSaveError(error, words)}
        </p>
      )}
      {status && (
        <p role="status">
          {words[status as "exported" | "linked" | "pokemonSaved"]}
        </p>
      )}
      {report && (
        <>
          <h3>{name}</h3>
          {!report.checksumsValid && (
            <p role="alert" className="save-editor-error">
              {words.invalid}
            </p>
          )}
          <div
            className="save-editor-toolbar"
            role="group"
            aria-label={words.title}
          >
            <button
              type="button"
              aria-pressed={section === "pokemon"}
              onClick={() => setSection("pokemon")}
            >
              {words.pokemon}
            </button>
            <button
              type="button"
              aria-pressed={section === "trainer"}
              onClick={() => setSection("trainer")}
            >
              {words.trainer}
            </button>
            <button
              type="button"
              aria-pressed={section === "inventory"}
              onClick={() => setSection("inventory")}
            >
              {words.inventory}
            </button>
            {report.trainer.canRecords && (
              <button
                type="button"
                aria-pressed={section === "records"}
                onClick={() => setSection("records")}
              >
                {words.recordsTitle}
              </button>
            )}
          </div>
          {section === "records" && report.trainer.canRecords ? (
            <SaveRecordEditor
              key={`${name}:${fileRevision}`}
              revision={workingRevision}
              busy={busy}
              canEdit={report.canEdit}
              onRead={readRecords}
              onApply={(edit) => applyWorkingEdit(edit, "recordEdit")}
            />
          ) : section === "inventory" ? (
            <SaveInventoryBrowser
              key={workingRevision}
              busy={busy}
              onRead={readInventory}
              onBatch={(edit) => applyWorkingEdit(edit, "inventoryBatch")}
              canEdit={report.canEdit}
              onApply={(edit) => applyWorkingEdit(edit, "inventoryEdit")}
            />
          ) : section === "pokemon" ? (
            <SavePokemonBrowser
              key={`${name}:${fileRevision}`}
              report={report}
              revision={workingRevision}
              busy={busy}
              onApply={(edit) => applyWorkingEdit(edit, "pokemon")}
              onApplyRaw={(edit) => applyWorkingEdit(edit, "pokemonRaw")}
              onApplyBox={(edit) => applyWorkingEdit(edit, "box")}
              onStorage={(edit) => applyWorkingEdit(edit, "storage")}
              onImport={importPokemon}
              onExport={exportPokemon}
              legality={legality}
              onReadOrigin={readOrigin}
              onSuggestRelearn={suggestRelearn}
              onReadRibbons={readRibbons}
              onReadHistory={readHistory}
              onReadMemory={readMemory}
              onAnalyze={analyzePokemon}
            />
          ) : (
            <>
              <dl className="save-editor-summary">
                <div>
                  <dt>{t("game")}</dt>
                  <dd>
                    {choices
                      .map(
                        (game) =>
                          words.games[game as keyof typeof words.games] ?? game,
                      )
                      .join(" / ") || report.version}{" "}
                    · {words.generation} {report.generation}
                  </dd>
                </div>
                <div>
                  <dt>{words.checksums}</dt>
                  <dd>{report.checksumsValid ? words.valid : words.invalid}</dd>
                </div>
                <div>
                  <dt>{words.displayIds}</dt>
                  <dd>
                    {report.displayTid} / {report.displaySid}
                  </dd>
                </div>
                <div>
                  <dt>{words.playTime}</dt>
                  <dd>{report.playTime}</dd>
                </div>
                <div>
                  <dt>{words.partyBoxes}</dt>
                  <dd>
                    {report.partyCount} / {report.boxCount}
                  </dd>
                </div>
              </dl>
              {report.checksumsValid && !report.canEdit && (
                <p>{words.readonly}</p>
              )}
              <fieldset
                disabled={busy || !report.canEdit}
                className="save-editor-fields"
              >
                <legend>{words.trainer}</legend>
                <label className="field">
                  <span>{words.trainerName}</span>
                  <input
                    value={draft.ot}
                    maxLength={report.maxNameLength}
                    onChange={(e) => setDraft({ ...draft, ot: e.target.value })}
                  />
                </label>
                {(
                  [
                    ["tid", words.tid, 65535],
                    ["sid", words.sid, 65535],
                    ["money", words.money, report.maxMoney],
                  ] as const
                ).map(([key, label, max]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      inputMode="numeric"
                      value={draft[key]}
                      maxLength={String(max).length}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                {report.trainer.gameVersion.choices.length > 0 && (
                  <label className="field">
                    <span>{words.trainerGameVersion}</span>
                    <Select
                      value={draft.gameVersion}
                      onChange={(e) =>
                        setDraft({ ...draft, gameVersion: e.target.value })
                      }
                    >
                      {!report.trainer.gameVersion.choices.some(
                        (c) => String(c.id) === draft.gameVersion,
                      ) && (
                        <option value={draft.gameVersion}>
                          #{draft.gameVersion}
                        </option>
                      )}
                      {report.trainer.gameVersion.choices.map((c) => (
                        <option key={c.id} value={c.id}>
                          {
                            c.name[
                              i18n.language.startsWith("zh")
                                ? "zh"
                                : i18n.language.startsWith("ja")
                                  ? "ja"
                                  : "en"
                            ]
                          }
                        </option>
                      ))}
                    </Select>
                    <span className="save-editor-note">
                      {words.trainerGameVersionNote}
                    </span>
                  </label>
                )}
                {report.trainer.languages.length > 0 && (
                  <label className="field">
                    <span>{words.trainerLanguage}</span>
                    <Select
                      value={draft.language}
                      onChange={(e) =>
                        setDraft({ ...draft, language: e.target.value })
                      }
                    >
                      {!report.trainer.languages.some(
                        (choice) => String(choice.id) === draft.language,
                      ) && (
                        <option value={draft.language}>
                          #{draft.language}
                        </option>
                      )}
                      {report.trainer.languages.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {
                            choice.name[
                              i18n.language.startsWith("zh")
                                ? "zh"
                                : i18n.language.startsWith("ja")
                                  ? "ja"
                                  : "en"
                            ]
                          }
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
                {report.trainer.currencies.map((field) => (
                  <label className="field" key={field.key}>
                    <span>
                      {words.trainerCurrencyNames[field.key]} · 0–{field.max}
                    </span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={String(field.max).length}
                      value={draft[field.key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [field.key]: e.target.value })
                      }
                    />
                    {words.trainerCurrencyNotes[field.key] && (
                      <span className="save-editor-note">
                        {words.trainerCurrencyNotes[field.key]}
                      </span>
                    )}
                  </label>
                ))}
                <TrainerGeographyFields
                  report={report}
                  draft={draft}
                  onChange={setDraft}
                />
                {report.trainer.canGender && (
                  <label className="field">
                    <span>{words.gender}</span>
                    <Select
                      value={draft.gender}
                      onChange={(e) =>
                        setDraft({ ...draft, gender: e.target.value })
                      }
                    >
                      {!["0", "1"].includes(draft.gender) && (
                        <option value={draft.gender}>#{draft.gender}</option>
                      )}
                      <option value="0">{words.trainerMale}</option>
                      <option value="1">{words.trainerFemale}</option>
                    </Select>
                  </label>
                )}
                {report.trainer.canPlayTime &&
                  (
                    [
                      ["hours", words.trainerHours, 65535],
                      ["minutes", words.trainerMinutes, 99],
                      ["seconds", words.trainerSeconds, 99],
                    ] as const
                  ).map(([key, label, max]) => (
                    <label className="field" key={key}>
                      <span>
                        {label} · 0–{max}
                      </span>
                      <input
                        inputMode="numeric"
                        maxLength={String(max).length}
                        value={draft[key]}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
              </fieldset>
              {report.trainer.badges && (
                <fieldset
                  className="save-editor-fields save-trainer-badges"
                  disabled={busy || !report.canEdit}
                >
                  <legend>{words.trainerBadges}</legend>
                  {Array.from(
                    { length: report.trainer.badges.count },
                    (_, index) => (
                      <label className="save-editor-checkbox" key={index}>
                        <input
                          type="checkbox"
                          checked={(Number(draft.badges) & (1 << index)) !== 0}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              badges: String(
                                e.target.checked
                                  ? Number(draft.badges) | (1 << index)
                                  : Number(draft.badges) & ~(1 << index),
                              ),
                            })
                          }
                        />
                        <span>
                          {words.trainerBadge.replace("{n}", String(index + 1))}
                        </span>
                      </label>
                    ),
                  )}
                  <p className="save-editor-note">{words.trainerBadgesNote}</p>
                </fieldset>
              )}
              <TrainerGameOptionFields
                report={report}
                draft={draft}
                disabled={busy || !report.canEdit}
                onChange={setDraft}
              />
              <TrainerAppearance6Fields
                report={report}
                draft={draft}
                disabled={busy || !report.canEdit}
                onChange={setDraft}
              />
              <TrainerDateFields
                report={report}
                draft={draft}
                disabled={busy || !report.canEdit}
                onChange={setDraft}
              />
              <TrainerPositionFields
                report={report}
                draft={draft}
                disabled={busy || !report.canEdit}
                onChange={setDraft}
              />
              <p className="save-editor-note">{words.ids}</p>
              {report.trainer.languages.length > 0 && (
                <p className="save-editor-note">{words.trainerLanguageNote}</p>
              )}
              {report.trainer.canPlayTime && (
                <p className="save-editor-note">{words.trainerTimeNote}</p>
              )}
              {report.format === "SAV8SWSH" && (
                <p className="save-editor-note">
                  {words.trainerAppearanceNote}
                </p>
              )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={
                    busy ||
                    !report.canEdit ||
                    trainerDraftMatches(draft, report)
                  }
                  onClick={() =>
                    void applyWorkingEdit(
                      async () => validateTrainer(draft, report),
                      "trainer",
                    )
                  }
                >
                  {words.applyTrainer}
                </button>
                <button
                  type="button"
                  disabled={busy || !report.canEdit}
                  onClick={() => {
                    setDraft(trainerDraft(report));
                    setError("");
                  }}
                >
                  <RotateCcw size={18} aria-hidden="true" /> {words.reset}
                </button>
              </div>
              <section
                className="save-editor-profile"
                aria-label={t("profile")}
              >
                <h3>{t("profile")}</h3>
                <p className="save-editor-note">{words.link}</p>
                {choices.length === 0 ? (
                  <p>{words.unsupported}</p>
                ) : (
                  <>
                    {choices.length > 1 && <p>{words.ambiguous}</p>}
                    <div className="save-editor-fields">
                      <label className="field">
                        <span>{t("game")}</span>
                        <Select
                          value={version}
                          disabled={busy}
                          onChange={(e) => {
                            setVersion(e.target.value);
                            setTarget("new");
                          }}
                        >
                          <option value="">—</option>
                          {choices.map((game) => (
                            <option key={game} value={game}>
                              {words.games[game as keyof typeof words.games] ??
                                game}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <label className="field">
                        <span>{t("profile")}</span>
                        <Select
                          value={target}
                          disabled={busy || !link || link.loading}
                          onChange={(e) => setTarget(e.target.value)}
                        >
                          <option value="new">{t("newProfile")}</option>
                          {link?.profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                      {target === "new" && (
                        <label className="field">
                          <span>{words.profileName}</span>
                          <input
                            value={profileName}
                            disabled={busy}
                            onChange={(e) => setProfileName(e.target.value)}
                          />
                        </label>
                      )}
                    </div>
                    {target === "new" && (
                      <>
                        <p className="save-editor-note">{words.defaults}</p>
                        <label className="save-editor-review">
                          <input
                            type="checkbox"
                            checked={reviewDefaults}
                            disabled={busy}
                            onChange={(e) =>
                              setReviewDefaults(e.target.checked)
                            }
                          />
                          {words.acknowledge}
                        </label>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={
                        busy ||
                        !link ||
                        link.loading ||
                        (target === "new" &&
                          (!reviewDefaults || !profileName.trim()))
                      }
                      onClick={() =>
                        void perform(async (id) => {
                          await link!.save(target, profileName);
                          if (id === operation.current) setStatus("linked");
                        }, false)
                      }
                    >
                      {words.apply}
                    </button>
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
      <p className="save-editor-note">
        <a
          href="https://github.com/kwsch/PKHeX"
          target="_blank"
          rel="noreferrer"
        >
          PKHeX
        </a>{" "}
        · GPL-3.0-or-later
      </p>
    </div>
  );
}
