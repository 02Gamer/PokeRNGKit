import { SaveBoxViewer } from "./SaveBoxViewer";
import { PokemonSearchEditor } from "./PokemonSearchEditor";
import type { PokemonSearchActions } from "./pokemonSearch";
import {
  boxViewIndex,
  boxViewerWords,
  currentBoxEdit,
  swapBoxViews,
} from "./boxViewer";
import { PokemonTrainingEditor } from "./PokemonTrainingEditor";
import { TextTrashEditor, type TextTrashActions } from "./TextTrashEditor";
import { MoveShopEditor, type MoveShopActions } from "./MoveShopEditor";
import {
  PokemonSuperTrainingEditor,
  type PokemonSuperTrainingActions,
} from "./PokemonSuperTrainingEditor";
import { PlusRecordEditor, type PlusRecordActions } from "./PlusRecordEditor";
import { TechRecordEditor, type TechRecordActions } from "./TechRecordEditor";
import { PokemonHistoryEditor } from "./PokemonHistoryEditor";
import { PokemonMemoryEditor } from "./PokemonMemoryEditor";
import { PokemonRibbonEditor } from "./PokemonRibbonEditor";
import { PokemonRelearnEditor } from "./PokemonRelearnEditor";
import { PokemonShinyEditor } from "./PokemonShinyEditor";
import { PokemonMarkingsEditor } from "./PokemonMarkingsEditor";
import { useGenderLabel } from "./useGenderLabel";
import { PokemonVitalsEditor } from "./PokemonVitalsEditor";
import { PokemonEggEditor } from "./PokemonEggEditor";
import { PokemonOriginEditor } from "./PokemonOriginEditor";
import { PokemonEncounterEditor } from "./PokemonEncounterEditor";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PokemonFileTools } from "./PokemonFileTools";
import { PokemonRawEditor } from "./PokemonRawEditor";
import { pokemonAccess, type GbSavePokemonEdit } from "./savePokemonEditing";
import { StandaloneGbEditor } from "./StandaloneGbEditor";
import { StandaloneGbSpecialEditor } from "./StandaloneGbSpecialEditor";
import { standaloneWords } from "./standaloneWords";
import { PokemonFormArgumentEditor } from "./PokemonFormArgumentEditor";
import { StorageEditor } from "./StorageEditor";
import { BoxEditor } from "./BoxEditor";
import { BoxArchiveEditor } from "./BoxArchiveEditor";
import { BoxImportEditor } from "./BoxImportEditor";
import { BoxBinaryEditor, type BoxBinaryActions } from "./BoxBinaryEditor";
import type { BoxImportOptions, BoxImportConfirmation } from "./boxImport";
import type { BoxArchiveRequest } from "./boxArchive";
import { PokemonLegality } from "./PokemonLegality";
import { PokemonEditor, type PokemonEdit } from "./PokemonEditor";
import { PokemonSprite } from "./PokemonSprite";
import { useSavePrivacy } from "./useSavePrivacy";
import { SaveBoxGrid } from "./SaveBoxGrid";
import { SaveBoxGallery } from "./SaveBoxGallery";
import {
  BOX_SLOT_DRAG_TYPE,
  boxDropEdit,
  decodeBoxDrag,
  type GalleryDropMode,
  type GalleryModifiers,
} from "./boxGallery";
import { boxGalleryWords } from "./boxGalleryWords";
import { Select } from "../shared/Select";
import type {
  OriginCatalog,
  LocalizedText,
  BoxEdit,
  StorageEdit,
  SaveReport,
  PokemonLegalityReport,
  PokemonPosition,
  PokemonRawEdit,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function SavePokemonBrowser({
  searchActions,
  moveShop,
  pokemonSuperTraining,
  textTrash,
  plusRecord,
  techRecord,
  profileLink,
  report,
  revision,
  busy,
  onApply,
  onApplyRaw,
  onApplyGb,
  legality,
  onReadOrigin,
  onSuggestRelearn,
  onReadRibbons,
  onReadHistory,
  onReadMemory,
  onAnalyze,
  onApplyBox,
  onStorage,
  onImport,
  onExport,
  onExportBoxes,
  onPreviewBoxImport,
  onApplyBoxImport,
  onDiscardBoxImport,
  onPreviewBoxBinary,
  onApplyBoxBinary,
  onDiscardBoxBinary,
  onExportBoxBinary,
}: {
  searchActions: PokemonSearchActions;
  moveShop: MoveShopActions;
  pokemonSuperTraining: PokemonSuperTrainingActions;
  textTrash: TextTrashActions;
  plusRecord: PlusRecordActions;
  techRecord: TechRecordActions;
  profileLink?: ReactNode;
  report: SaveReport;
  revision: number;
  busy: boolean;
  onApply(edit: PokemonEdit): Promise<void>;
  onApplyRaw(edit: PokemonRawEdit): Promise<void>;
  onApplyGb(edit: GbSavePokemonEdit): Promise<void>;
  onApplyBox(edit: BoxEdit): Promise<void>;
  onStorage(edit: StorageEdit): Promise<void>;
  onImport(position: PokemonPosition, file: File): Promise<void>;
  onExport(position: PokemonPosition): Promise<void>;
  onExportBoxes(request: BoxArchiveRequest): Promise<boolean>;
  onPreviewBoxImport(
    files: File[],
    options: BoxImportOptions,
  ): Promise<import("./domain").SaveEditorResult | undefined>;
  onApplyBoxImport(confirmation: BoxImportConfirmation): Promise<void>;
  onDiscardBoxImport(token: string): void;
  onPreviewBoxBinary: BoxBinaryActions["onPreviewBoxBinary"];
  onApplyBoxBinary: BoxBinaryActions["onApplyBoxBinary"];
  onDiscardBoxBinary: BoxBinaryActions["onDiscardBoxBinary"];
  onExportBoxBinary: BoxBinaryActions["onExportBoxBinary"];
  legality?: PokemonLegalityReport;
  onSuggestRelearn(position: PokemonPosition): Promise<number[] | undefined>;
  onReadHistory(
    position: PokemonPosition,
  ): Promise<import("./domain").HistoryCatalog | undefined>;
  onReadMemory(
    query: import("./domain").MemoryQuery,
  ): Promise<import("./domain").MemoryCatalog | undefined>;
  onReadRibbons(
    position: PokemonPosition,
  ): Promise<import("./domain").RibbonCatalog | undefined>;
  onReadOrigin(
    position: PokemonPosition,
    version?: number,
    ball?: number,
  ): Promise<OriginCatalog | undefined>;
  onAnalyze(position: PokemonPosition): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const genderLabel = useGenderLabel();
  const privacy = useSavePrivacy();
  const access = pokemonAccess(report);
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const name = (value: LocalizedText) => value[lang];
  const initialBox =
    report.boxCount > 0
      ? boxViewIndex(report.boxOptions.currentBox, report.boxCount)
      : -1;
  const [box, setBox] = useState(initialBox);
  const [secondBox, setSecondBox] = useState(initialBox < 0 ? 0 : initialBox);
  const [selection, setSelection] = useState<PokemonPosition>();
  const [searchMatches, setSearchMatches] = useState<{
    revision: number;
    positions: PokemonPosition[];
  }>();
  const [searchFocus, setSearchFocus] = useState<PokemonPosition>();
  const browserRef = useRef<HTMLElement>(null);
  const matches =
    searchMatches?.revision === revision
      ? new Set(searchMatches.positions.map((p) => `${p.box}:${p.slot}`))
      : undefined;
  useEffect(() => {
    if (!searchFocus) return;
    browserRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-box="${searchFocus.box}"] button[data-slot="${searchFocus.slot}"]`,
      )
      ?.focus();
  }, [searchFocus]);
  const entries = report.pokemon.filter((p) => p.box === box);
  const detailBox = selection?.box ?? box;
  const selected = selection
    ? report.pokemon.find(
        (p) => p.box === selection.box && p.slot === selection.slot,
      )
    : entries[0];
  const toolBox = detailBox;
  const filePosition = {
    box: detailBox,
    slot:
      detailBox === -1
        ? Math.min(selection?.slot ?? selected?.slot ?? 0, report.partyCount)
        : (selection?.slot ?? selected?.slot ?? 0),
  };
  const galleryWords = boxGalleryWords[lang];
  const [view, setView] = useState<"single" | "all" | "dual">("single");
  const viewerWords = boxViewerWords[lang];
  const [mode, setMode] = useState<GalleryDropMode>("auto");
  const [pending, setPending] = useState(false),
    [galleryError, setGalleryError] = useState<
      "" | "dragError" | "readonly" | "swapError"
    >("");
  const [scope] = useState(() => {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  });
  const flight = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const viewer = view === "dual" && report.boxCount > 0;
  const gallery = view === "all" && report.boxCount > 0,
    locked = busy || pending;
  const selectedPosition = {
    box: detailBox,
    slot: selection?.slot ?? selected?.slot ?? 0,
  };
  const select = (position: PokemonPosition) => setSelection(position);
  const chooseMain = (next: number) => {
    if (
      locked ||
      flight.current ||
      !Number.isInteger(next) ||
      next < -1 ||
      next >= report.boxCount
    )
      return;
    setBox(next);
    setSelection(undefined);
    if (next >= 0) {
      const edit = currentBoxEdit(report, next);
      if (edit) void swap(edit);
    }
  };
  const chooseSecond = (next: number) => {
    if (
      locked ||
      !Number.isInteger(next) ||
      next < 0 ||
      next >= report.boxCount
    )
      return;
    setSecondBox(next);
    setSelection({ box: next, slot: 0 });
  };
  const swapViews = () => {
    if (locked || flight.current) return;
    const next = swapBoxViews(box, secondBox, report.boxCount);
    setSecondBox(next.secondary);
    chooseMain(next.main);
  };
  async function swap(edit: BoxEdit) {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setGalleryError("");
    try {
      await onApplyBox(edit);
    } catch {
      if (alive.current) setGalleryError("swapError");
    } finally {
      flight.current = false;
      if (alive.current) setPending(false);
    }
  }
  async function drop(
    target: PokemonPosition,
    transfer: DataTransfer,
    keys: GalleryModifiers,
  ) {
    if (locked || flight.current) return;
    if (!access.canStorage || !report.checksumsValid) {
      setGalleryError("readonly");
      return;
    }
    const payload = transfer.getData(BOX_SLOT_DRAG_TYPE),
      files = Array.from(transfer.files);
    flight.current = true;
    setPending(true);
    setGalleryError("");
    try {
      if (payload) {
        const source = decodeBoxDrag(payload, scope, revision, report);
        const edit = boxDropEdit(report, source, target, mode, keys);
        if (edit) {
          select(target);
          await onStorage(edit);
        }
      } else if (files[0]) {
        select(target);
        await onImport(target, files[0]);
      } else throw Error("Invalid box drop.");
    } catch {
      if (alive.current) setGalleryError("dragError");
    } finally {
      flight.current = false;
      if (alive.current) setPending(false);
    }
  }
  const statIndices =
    report.generation < 3 ? [0, 1, 2, 5, 3] : [0, 1, 2, 3, 4, 5];
  const stats =
    report.generation < 3
      ? [
          words.hp,
          words.attack,
          words.defense,
          words.speed,
          standaloneWords[lang].special,
        ]
      : [
          words.hp,
          words.attack,
          words.defense,
          words.spAttack,
          words.spDefense,
          words.speed,
        ];
  return (
    <section
      ref={browserRef}
      className="save-pokemon-browser"
      aria-label={words.pokemon}
    >
      <h3>{words.pokemon}</h3>
      <p className="save-editor-note">{words.readPokemon}</p>
      {report.boxCount > 0 && (
        <PokemonSearchEditor
          revision={revision}
          position={
            selected ? { box: selected.box, slot: selected.slot } : undefined
          }
          box={box}
          busy={locked}
          lang={lang}
          actions={searchActions}
          onMatches={(positions) =>
            setSearchMatches(positions ? { revision, positions } : undefined)
          }
          onLocate={(position) => {
            setBox(position.box);
            setSelection(position);
            setView("single");
            setSearchFocus(position);
          }}
        />
      )}
      {report.boxCount > 0 && (
        <div
          className="save-editor-toolbar save-box-view-modes"
          role="group"
          aria-label={words.box}
        >
          <button
            type="button"
            disabled={locked}
            aria-pressed={view === "single"}
            onClick={() => setView("single")}
          >
            {galleryWords.current}
          </button>
          <button
            type="button"
            disabled={locked}
            aria-pressed={gallery}
            onClick={() => setView("all")}
          >
            {galleryWords.all}
          </button>
          <button
            type="button"
            disabled={locked}
            aria-pressed={viewer}
            onClick={() => {
              if (box < 0) chooseMain(initialBox);
              setView("dual");
            }}
          >
            {viewerWords.viewer}
          </button>
        </div>
      )}
      <label className="field" hidden={viewer}>
        <span>
          {words.party} / {words.box}
        </span>
        <Select
          value={box}
          disabled={locked}
          onChange={(e) => chooseMain(Number(e.target.value))}
        >
          <option value={-1}>
            {words.party} ({report.pokemon.filter((p) => p.box === -1).length})
          </option>
          {Array.from({ length: report.boxCount }, (_, i) => (
            <option key={i} value={i}>
              {report.boxes[i]?.name || `${words.box} ${i + 1}`} (
              {report.pokemon.filter((p) => p.box === i).length})
            </option>
          ))}
        </Select>
      </label>
      {report.boxCount > 0 && (gallery || box >= 0) && (
        <div className="save-box-drop-control">
          <label>
            <span>{galleryWords.mode}</span>
            <Select
              value={mode}
              disabled={locked || !access.canStorage || !report.checksumsValid}
              onChange={(e) => setMode(e.target.value as GalleryDropMode)}
            >
              {(["auto", "copy", "overwrite"] as const).map((m) => (
                <option key={m} value={m}>
                  {galleryWords.modes[m]}
                </option>
              ))}
            </Select>
          </label>
          <p>{galleryWords.hint}</p>
        </div>
      )}
      {pending && <p role="status">{galleryWords.pending}</p>}
      {galleryError && (
        <p role="alert" className="save-editor-error">
          {galleryWords[galleryError]}
        </p>
      )}
      <div className="save-storage-tools">
        {toolBox >= 0 && report.canEdit && (
          <BoxEditor
            key={JSON.stringify([
              toolBox,
              report.boxes[toolBox],
              report.boxOptions,
              revision,
            ])}
            report={report}
            box={toolBox}
            busy={busy}
            onApply={onApplyBox}
          />
        )}
        {report.boxCount > 0 && report.checksumsValid && (
          <BoxArchiveEditor
            key={`archive-${toolBox}:${revision}`}
            box={toolBox}
            busy={busy}
            onExport={onExportBoxes}
          />
        )}
        {report.boxCount > 0 && report.canEdit && report.checksumsValid && (
          <BoxImportEditor
            key={`import-${toolBox}:${revision}:${lang}`}
            report={report}
            box={toolBox}
            busy={busy}
            lang={lang}
            onPreview={onPreviewBoxImport}
            onApply={onApplyBoxImport}
            onDiscard={onDiscardBoxImport}
          />
        )}
        {report.boxCount > 0 && report.checksumsValid && (
          <BoxBinaryEditor
            key={`binary-${toolBox}:${revision}:${lang}`}
            box={toolBox}
            canEdit={report.canEdit}
            busy={busy}
            lang={lang}
            onPreviewBoxBinary={onPreviewBoxBinary}
            onApplyBoxBinary={onApplyBoxBinary}
            onDiscardBoxBinary={onDiscardBoxBinary}
            onExportBoxBinary={onExportBoxBinary}
          />
        )}
        <PokemonFileTools
          key={`file-${toolBox}:${filePosition.slot}`}
          position={filePosition}
          canImport={access.canImport}
          canExport={report.checksumsValid && !!selected?.valid}
          busy={busy}
          onImport={async (position, file) => {
            await onImport(position, file);
            setSelection(position);
          }}
          onExport={onExport}
        />
      </div>
      <div
        className="save-pokemon-workspace"
        data-gallery={gallery}
        data-viewer={viewer}
      >
        <div className="save-pokemon-storage">
          {viewer ? (
            <SaveBoxViewer
              searchMatches={matches}
              report={report}
              main={boxViewIndex(box, report.boxCount)}
              secondary={boxViewIndex(secondBox, report.boxCount)}
              selected={selectedPosition}
              busy={locked}
              lang={lang}
              revision={revision}
              scope={scope}
              onMain={chooseMain}
              onSecondary={chooseSecond}
              onSelect={select}
              onSwapViews={swapViews}
              onDrop={drop}
            />
          ) : gallery ? (
            <SaveBoxGallery
              searchMatches={matches}
              report={report}
              revision={revision}
              scope={scope}
              selected={selectedPosition}
              busy={locked}
              lang={lang}
              onSelect={select}
              onSwap={swap}
              onDrop={drop}
            />
          ) : (
            <SaveBoxGrid
              searchMatches={matches}
              report={report}
              box={box}
              entries={entries}
              selected={selectedPosition}
              busy={locked}
              lang={lang}
              revision={revision}
              scope={scope}
              onSelect={select}
              onDrop={drop}
            />
          )}
          {!gallery && !viewer && (
            <p className="save-editor-note">
              {entries.length} / {box === -1 ? 6 : report.boxSlotCount}
            </p>
          )}
        </div>
        <div className="save-pokemon-detail">
          {!selected && <p>{words.empty}</p>}
          {selected && (
            <>
              {!selected.valid && (
                <p role="alert" className="save-editor-error">
                  {words.invalidPokemon}
                </p>
              )}
              <div className="save-pokemon-identity">
                <PokemonSprite
                  pokemon={selected}
                  alt=""
                  width={68}
                  height={56}
                />
                <h4>
                  {name(selected.speciesName)} · {words.level} {selected.level}
                </h4>
              </div>
              <dl className="save-editor-summary">
                {[
                  [
                    words.species,
                    `${name(selected.speciesName)} #${selected.species}`,
                  ],
                  [words.nickname, selected.nickname || "—"],
                  [words.level, selected.level],
                  [words.form, selected.form],
                  ...((selected.vitals?.showGender ?? report.generation !== 1)
                    ? [
                        [
                          words.gender,
                          genderLabel(
                            selected.gender,
                            [words.male, words.female, words.genderless][
                              selected.gender
                            ],
                          ),
                        ],
                      ]
                    : []),
                  [words.shiny, selected.shiny ? words.yes : words.no],
                  [words.egg, selected.egg ? words.yes : words.no],
                  [words.nature, name(selected.nature)],
                  [words.ability, name(selected.ability)],
                  [words.item, name(selected.item)],
                  [words.originalTrainer, selected.ot],
                  [words.tid, selected.tid],
                  [words.sid, selected.sid],
                  ...(privacy.hideSecretDetails
                    ? []
                    : [
                        [
                          "PID",
                          selected.pid
                            .toString(16)
                            .toUpperCase()
                            .padStart(8, "0"),
                        ],
                      ]),
                  [words.experience, selected.experience],
                  [
                    selected.egg ? words.hatchCounter : words.friendship,
                    selected.friendship,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {access.canStorage && (
                <StorageEditor
                  key={`storage-${JSON.stringify(selected)}`}
                  report={report}
                  source={selected}
                  busy={busy}
                  onApply={onStorage}
                />
              )}
              <PokemonLegality
                position={selected}
                report={legality}
                busy={busy}
                onAnalyze={onAnalyze}
              />
              {selected.vitals && access.editor !== "none" && (
                <PokemonVitalsEditor
                  key={`vitals-${selected.box}-${selected.slot}`}
                  info={selected.vitals}
                  generation={report.generation}
                  disabled={busy || !access.canEdit || !selected.valid}
                  onApply={(vitals) =>
                    access.editor === "gb"
                      ? onApplyGb({
                          box: selected.box,
                          slot: selected.slot,
                          special: { action: "vitals", vitals },
                        })
                      : onApplyRaw({
                          box: selected.box,
                          slot: selected.slot,
                          action: "vitals",
                          vitals,
                        })
                  }
                />
              )}
              {access.editor === "gb" ? (
                <>
                  <StandaloneGbEditor
                    key={`gb-${JSON.stringify(selected)}`}
                    report={{
                      pokemon: selected,
                      generation: report.generation,
                      attributeChoices: report.attributeChoices,
                      moveChoices: report.moveChoices,
                    }}
                    disabled={busy || !access.canEdit || !selected.valid}
                    onApply={(basic) =>
                      onApplyGb({
                        box: selected.box,
                        slot: selected.slot,
                        basic,
                      })
                    }
                  />
                  {report.gbInfo && selected.gbFields && (
                    <StandaloneGbSpecialEditor
                      key={`gb-special-${JSON.stringify(selected)}`}
                      pokemon={selected}
                      info={{
                        ...report.gbInfo,
                        fields: selected.gbFields,
                        language: selected.gbLanguage ?? report.gbInfo.language,
                      }}
                      disabled={busy || !access.canEdit || !selected.valid}
                      initialLanguage={selected.gbLanguage ?? report.language}
                      onApply={(special) =>
                        onApplyGb({
                          box: selected.box,
                          slot: selected.slot,
                          special,
                        })
                      }
                    />
                  )}
                </>
              ) : access.editor === "standard" ? (
                <>
                  <PokemonEditor
                    key={`pokemon-${JSON.stringify(selected)}`}
                    pokemon={selected}
                    moveChoices={report.moveChoices}
                    attributeChoices={report.attributeChoices}
                    disabled={busy || !access.canEdit || !selected.valid}
                    onApply={onApply}
                  />
                  <PokemonEggEditor
                    key={`egg-${JSON.stringify(selected)}`}
                    egg={selected.eggInfo}
                    position={{ box: selected.box, slot: selected.slot }}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onApply={onApplyRaw}
                  />
                  <PokemonOriginEditor
                    readDisabled={busy || !selected.valid}
                    key={`origin-${JSON.stringify(selected)}`}
                    origin={selected.origin}
                    position={{ box: selected.box, slot: selected.slot }}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onRead={onReadOrigin}
                    onApply={onApplyRaw}
                  />
                  <PokemonTrainingEditor
                    key={`training-${revision}-${JSON.stringify(selected)}`}
                    training={selected.training}
                    generation={report.generation}
                    position={{ box: selected.box, slot: selected.slot }}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onApply={onApplyRaw}
                  />
                  {report.format === "SAV8LA" &&
                    selected.valid &&
                    selected.species > 0 && (
                      <MoveShopEditor
                        key={`move-shop-${revision}-${selected.box}-${selected.slot}`}
                        target={{
                          kind: "save",
                          box: selected.box,
                          slot: selected.slot,
                          fileName: null,
                          inputEncrypted: false,
                          useFileFormat: false,
                        }}
                        lang={lang}
                        busy={busy}
                        {...moveShop}
                      />
                    )}
                  {selected.valid && selected.species > 0 && (
                    <TextTrashEditor
                      key={`text-trash-${revision}-${selected.box}-${selected.slot}`}
                      target={{
                        kind: "save",
                        box: selected.box,
                        slot: selected.slot,
                        fileName: null,
                        inputEncrypted: false,
                        useFileFormat: false,
                      }}
                      fields={
                        report.generation >= 6
                          ? ["nickname", "originalTrainer", "handlingTrainer"]
                          : ["nickname", "originalTrainer"]
                      }
                      lang={lang}
                      busy={busy}
                      {...textTrash}
                    />
                  )}
                  {[
                    "SAV6XY",
                    "SAV6AO",
                    "SAV6AODemo",
                    "SAV7SM",
                    "SAV7USUM",
                  ].includes(report.format) &&
                    selected.valid &&
                    selected.species > 0 && (
                      <PokemonSuperTrainingEditor
                        key={`super-training-${revision}-${selected.box}-${selected.slot}`}
                        target={{
                          kind: "save",
                          box: selected.box,
                          slot: selected.slot,
                          fileName: null,
                          inputEncrypted: false,
                          useFileFormat: false,
                        }}
                        lang={lang}
                        busy={busy}
                        {...pokemonSuperTraining}
                      />
                    )}
                  {report.format === "SAV9ZA" &&
                    selected.valid &&
                    selected.species > 0 && (
                      <PlusRecordEditor
                        key={`plus-record-${revision}-${selected.box}-${selected.slot}`}
                        target={{
                          kind: "save",
                          box: selected.box,
                          slot: selected.slot,
                          fileName: null,
                          inputEncrypted: false,
                          useFileFormat: false,
                        }}
                        lang={lang}
                        busy={busy}
                        {...plusRecord}
                      />
                    )}
                  {[
                    "SAV8SWSH",
                    "SAV8BS",
                    "SAV8LA",
                    "SAV9SV",
                    "SAV9ZA",
                  ].includes(report.format) &&
                    selected.valid &&
                    selected.species > 0 && (
                      <TechRecordEditor
                        key={`tech-record-${revision}-${selected.box}-${selected.slot}`}
                        target={{
                          kind: "save",
                          box: selected.box,
                          slot: selected.slot,
                          fileName: null,
                          inputEncrypted: false,
                          useFileFormat: false,
                        }}
                        lang={lang}
                        busy={busy}
                        {...techRecord}
                      />
                    )}
                  <PokemonEncounterEditor
                    key={`encounter-${JSON.stringify(selected)}`}
                    encounter={selected.encounter}
                    position={{ box: selected.box, slot: selected.slot }}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onApply={onApplyRaw}
                  />
                  {report.generation >= 6 && (
                    <PokemonMemoryEditor
                      readDisabled={busy || !selected.valid}
                      key={`memory-${revision}-${JSON.stringify(selected)}`}
                      position={{ box: selected.box, slot: selected.slot }}
                      disabled={busy || !access.canRaw || !selected.valid}
                      onApply={onApplyRaw}
                      onRead={onReadMemory}
                    />
                  )}
                  {report.generation >= 6 && (
                    <PokemonHistoryEditor
                      readDisabled={busy || !selected.valid}
                      key={`history-${revision}-${JSON.stringify(selected)}`}
                      position={{ box: selected.box, slot: selected.slot }}
                      disabled={busy || !access.canRaw || !selected.valid}
                      onRead={onReadHistory}
                      onApply={onApplyRaw}
                    />
                  )}
                  <PokemonRibbonEditor
                    readDisabled={busy || !selected.valid}
                    key={`ribbons-${revision}-${JSON.stringify(selected)}`}
                    position={{ box: selected.box, slot: selected.slot }}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onApply={onApplyRaw}
                    onRead={onReadRibbons}
                    generation={report.generation}
                  />
                  <PokemonRelearnEditor
                    key={`relearn-${JSON.stringify(selected)}`}
                    moves={selected.relearnMoves}
                    choices={report.moveChoices}
                    position={{ box: selected.box, slot: selected.slot }}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onApply={onApplyRaw}
                    onSuggest={onSuggestRelearn}
                  />
                  <PokemonMarkingsEditor
                    key={`markings-${JSON.stringify(selected)}`}
                    pokemon={selected}
                    lang={lang}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onApply={onApplyRaw}
                  />
                  <PokemonShinyEditor
                    key={`shiny-${JSON.stringify(selected)}`}
                    position={{ box: selected.box, slot: selected.slot }}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onApply={onApplyRaw}
                  />
                  <PokemonRawEditor
                    key={`raw-${JSON.stringify(selected)}`}
                    pokemon={selected}
                    disabled={busy || !access.canRaw || !selected.valid}
                    onApply={onApplyRaw}
                  />
                  {selected.formArgument && (
                    <PokemonFormArgumentEditor
                      key={`form-argument-${JSON.stringify(selected)}`}
                      argument={selected.formArgument}
                      position={selected}
                      disabled={busy || !access.canRaw || !selected.valid}
                      onApply={onApplyRaw}
                    />
                  )}
                </>
              ) : null}
              <h4>{words.moves}</h4>
              <ul className="save-pokemon-moves">
                {selected.moves.map((move, i) => (
                  <li key={i}>
                    {name(move)} · PP {selected.movePp[i]}
                  </li>
                ))}
              </ul>
              <div className="save-pokemon-stats">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{words.pokemon}</th>
                      {stats.map((s) => (
                        <th scope="col" key={s}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">
                        {report.generation < 3
                          ? standaloneWords[lang].dvs
                          : words.ivs}
                      </th>
                      {statIndices.map((i) => (
                        <td key={i}>{selected.ivs[i]}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">
                        {report.generation < 3
                          ? standaloneWords[lang].statExperience
                          : words.evs}
                      </th>
                      {statIndices.map((i) => (
                        <td key={i}>{selected.evs[i]}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
          {profileLink}
        </div>
      </div>
    </section>
  );
}
