import { SaveSlotMenu } from "./SaveSlotMenu";
import { SourcePokemonEditor } from "./SourcePokemonEditor";
import { PokemonReadOnlySummary } from "./PokemonReadOnlySummary";
import { PokemonSetDialog } from "./PokemonSetDialog";
import { PokemonLegality } from "./PokemonLegality";
import {
  editorFile,
  pokemonSetWords,
  type PokemonEditorHandle,
  type PokemonSetActions,
  type PokemonSetTicket,
} from "./pokemonSet";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import {
  slotMenuActions,
  slotMenuModifiers,
  slotLegalityAlwaysVisible,
  slotMenuWords,
  type SlotMenuInvocation,
  type SlotAction,
} from "./slotMenu";
import { SaveBoxViewer } from "./SaveBoxViewer";
import { PokemonSearchEditor } from "./PokemonSearchEditor";
import type { PokemonSearchActions } from "./pokemonSearch";
import {
  boxViewIndex,
  boxViewerWords,
  currentBoxEdit,
  swapBoxViews,
} from "./boxViewer";
import { type TextTrashActions } from "./TextTrashEditor";
import { type MoveShopActions } from "./MoveShopEditor";
import { type PokemonSuperTrainingActions } from "./PokemonSuperTrainingEditor";
import { type PlusRecordActions } from "./PlusRecordEditor";
import { type TechRecordActions } from "./TechRecordEditor";
import { playSaveSound } from "./saveSound";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useEffectEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { PokemonFileTools } from "./PokemonFileTools";
import { pokemonAccess, type GbSavePokemonEdit } from "./savePokemonEditing";
import { StorageEditor } from "./StorageEditor";
import { BoxEditor } from "./BoxEditor";
import { BoxArchiveEditor } from "./BoxArchiveEditor";
import { BoxImportEditor } from "./BoxImportEditor";
import { BoxBinaryEditor, type BoxBinaryActions } from "./BoxBinaryEditor";
import type { BoxImportOptions, BoxImportConfirmation } from "./boxImport";
import type { BoxArchiveRequest } from "./boxArchive";
import { type PokemonEdit } from "./PokemonEditor";
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
  BoxEdit,
  StorageEdit,
  SaveReport,
  PokemonLegalityReport,
  PokemonPosition,
  PokemonRawEdit,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function SavePokemonBrowser({
  pokemonSet,
  legality,
  onAnalyze,
  searchActions,
  profileLink,
  report,
  revision,
  busy,
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
  pokemonSet: PokemonSetActions;
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
  onReadExpert(
    position: PokemonPosition,
  ): Promise<import("./pokemonIdentityTools").ExpertCatalog | undefined>;
  onReadTrainerDetails(
    position: PokemonPosition,
  ): Promise<import("./trainerDetails").TrainerDetailsCatalog | undefined>;
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
  const access = pokemonAccess(report);
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const initialBox =
    report.boxCount > 0
      ? boxViewIndex(report.boxOptions.currentBox, report.boxCount)
      : -1;
  const [box, setBox] = useState(initialBox);
  const [secondBox, setSecondBox] = useState(initialBox < 0 ? 0 : initialBox);
  const [selection, setSelection] = useState<PokemonPosition>();
  const [editorSource, setEditorSource] = useState<PokemonPosition | undefined>(
    () => {
      const p =
        report.pokemon.find((p) => p.box === initialBox) ?? report.pokemon[0];
      return p ? { box: p.box, slot: p.slot } : undefined;
    },
  );
  const [editorEpoch, setEditorEpoch] = useState(0),
    [editorReady, setEditorReady] = useState(false);
  const editorHandle = useRef<PokemonEditorHandle | undefined>(undefined),
    reviewToken = useRef<string | undefined>(undefined);
  const [setReview, setSetReview] = useState<{
    ticket: PokemonSetTicket;
    handle: PokemonEditorHandle;
    revision: number;
    settings: string;
  }>();
  const onEditorReady = useCallback(
    (handle: PokemonEditorHandle | undefined) => {
      editorHandle.current = handle;
      setEditorReady(!!handle);
    },
    [],
  );
  const discardReview = useEffectEvent((token: string) =>
    pokemonSet.discard(token),
  );
  useEffect(
    () => () => {
      if (reviewToken.current) discardReview(reviewToken.current);
    },
    [],
  );
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
  const settingsJson = useSaveSettingsJson();
  const [slotMenu, setSlotMenu] = useState<{
    invocation: SlotMenuInvocation;
    revision: number;
    settings: string;
  }>();
  const [slotError, setSlotError] = useState(false),
    [slotAnalysis, setSlotAnalysis] = useState<PokemonPosition>();
  const canSet =
    editorReady && !!editorSource && access.canStorage && !setReview;
  const reviewCurrent =
    !!setReview &&
    setReview.revision === revision &&
    setReview.settings === settingsJson;
  useEffect(() => {
    if (setReview && !reviewCurrent) {
      discardReview(setReview.ticket.token);
      reviewToken.current = undefined;
      queueMicrotask(() =>
        setSetReview((previous) =>
          previous === setReview ? undefined : previous,
        ),
      );
    }
  }, [setReview, reviewCurrent]);
  const menuActions = slotMenu
    ? slotMenuActions(
        report,
        slotMenu.invocation.position,
        slotMenu.invocation.keys,
        slotLegalityAlwaysVisible(settingsJson),
        busy || pending || !!setReview,
        true,
        canSet,
      )
    : [];
  const menuCurrent =
    !!slotMenu &&
    slotMenu.revision === revision &&
    slotMenu.settings === settingsJson &&
    menuActions.length > 0;
  useEffect(() => {
    if (slotMenu && !menuCurrent) {
      queueMicrotask(() =>
        setSlotMenu((previous) =>
          previous === slotMenu ? undefined : previous,
        ),
      );
    }
  }, [slotMenu, menuCurrent]);
  const viewer = view === "dual" && report.boxCount > 0;
  const gallery = view === "all" && report.boxCount > 0,
    locked = busy || pending || !!setReview;
  const selectedPosition = {
    box: detailBox,
    slot: selection?.slot ?? selected?.slot ?? 0,
  };
  const select = (position: PokemonPosition, notifyEmpty = true) => {
    if (locked) return;
    if (
      notifyEmpty &&
      !locked &&
      !report.pokemon.some(
        (p) =>
          p.box === position.box && p.slot === position.slot && p.species > 0,
      )
    )
      playSaveSound("other");
    setSelection(position);
    if (
      report.pokemon.some(
        (p) =>
          p.box === position.box && p.slot === position.slot && p.species > 0,
      )
    ) {
      setEditorSource({ ...position });
      setEditorEpoch((value) => value + 1);
    }
  };
  function openSlotMenu(value: SlotMenuInvocation) {
    const invocation = {
      ...value,
      position: { ...value.position },
      keys: slotMenuModifiers(value.keys),
    };
    if (
      !slotMenuActions(
        report,
        invocation.position,
        invocation.keys,
        slotLegalityAlwaysVisible(settingsJson),
        locked,
        true,
        canSet,
      ).length
    )
      return false;
    setSlotError(false);
    setSlotMenu({ invocation, revision, settings: settingsJson });
    return true;
  }
  function closeSlotMenu(restore: boolean) {
    setSlotMenu(undefined);
    if (restore && slotMenu?.invocation.trigger.isConnected)
      slotMenu.invocation.trigger.focus({ preventScroll: true });
  }
  async function runSlotAction(action: SlotAction) {
    if (
      !slotMenu ||
      !menuCurrent ||
      !menuActions.includes(action) ||
      locked ||
      flight.current
    )
      return;
    const position = slotMenu.invocation.position;
    closeSlotMenu(true);
    if (action === "set") {
      await startSet(position);
      return;
    }
    if (action === "view") {
      select(position, false);
      return;
    }
    if (action === "legality") {
      setSlotAnalysis(position);
    }
    flight.current = true;
    setPending(true);
    setSlotError(false);
    try {
      if (action === "legality") await onAnalyze(position);
      else
        await onStorage({ action: "delete", source: position, target: null });
    } catch {
      if (alive.current) setSlotError(true);
      playSaveSound("other", "hand");
    } finally {
      flight.current = false;
      if (alive.current) setPending(false);
    }
  }
  async function startSet(position: PokemonPosition) {
    const handle = editorHandle.current;
    if (locked || flight.current || !canSet || !handle || !editorSource) return;
    let draft: ReturnType<PokemonEditorHandle["capture"]>;
    try {
      draft = handle.capture();
    } catch {
      setSlotError(true);
      playSaveSound("other", "hand");
      return;
    }
    flight.current = true;
    setPending(true);
    setSlotError(false);
    try {
      const ticket = await pokemonSet.preview({
        source: editorSource,
        target: position,
        capture: draft.capture,
        editorFile: editorFile(draft.snapshot),
      });
      if (!ticket) {
        if (alive.current) setSlotError(true);
        return;
      }
      if (!alive.current) {
        pokemonSet.discard(ticket.token);
        return;
      }
      reviewToken.current = ticket.token;
      setSetReview({ ticket, handle, revision, settings: settingsJson });
    } catch {
      if (alive.current) setSlotError(true);
    } finally {
      flight.current = false;
      if (alive.current) setPending(false);
    }
  }
  function cancelSet() {
    if (setReview) pokemonSet.discard(setReview.ticket.token);
    reviewToken.current = undefined;
    setSetReview(undefined);
  }
  async function confirmSet() {
    if (!setReview || !reviewCurrent || busy || pending || flight.current)
      return;
    const current = setReview;
    flight.current = true;
    setPending(true);
    setSlotError(false);
    try {
      const applied = await pokemonSet.apply({
        token: current.ticket.token,
        sourceHash: current.ticket.sourceHash,
        targetHash: current.ticket.targetHash,
        allowCompatibility: true,
      });
      if (!alive.current) return;
      if (applied) {
        reviewToken.current = undefined;
        setSetReview(undefined);
        current.handle.accept(current.ticket.editorFile);
        playSaveSound("other");
      } else {
        cancelSet();
        setSlotError(true);
      }
    } catch {
      if (alive.current) {
        cancelSet();
        setSlotError(true);
      }
    } finally {
      flight.current = false;
      if (alive.current) setPending(false);
    }
  }
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
      playSaveSound("other");
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
          select(target, false);
          await onStorage(edit);
        }
      } else if (files[0]) {
        select(target, false);
        await onImport(target, files[0]);
      } else throw Error("Invalid box drop.");
    } catch {
      if (alive.current) setGalleryError("dragError");
    } finally {
      flight.current = false;
      if (alive.current) setPending(false);
    }
  }
  return (
    <section
      ref={browserRef}
      className="save-pokemon-browser"
      aria-label={words.pokemon}
    >
      {reviewCurrent && setReview && (
        <PokemonSetDialog
          ticket={setReview.ticket}
          lang={lang}
          busy={busy || pending}
          onCancel={cancelSet}
          onConfirm={() => void confirmSet()}
        />
      )}
      {menuCurrent && slotMenu && (
        <SaveSlotMenu
          invocation={slotMenu.invocation}
          actions={menuActions}
          lang={lang}
          onClose={closeSlotMenu}
          onAction={(action) => void runSlotAction(action)}
        />
      )}
      <div className="save-editor-toolbar">
        <h3>{words.pokemon}</h3>{" "}
        <button
          type="button"
          disabled={locked || !canSet}
          onClick={() => void startSet(selectedPosition)}
        >
          {pokemonSetWords[lang].set}
        </button>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuCurrent}
          disabled={locked || (!selected && !canSet)}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            openSlotMenu({
              position: selectedPosition,
              trigger: event.currentTarget,
              x: rect.left,
              y: rect.bottom,
              keys: slotMenuModifiers(event),
            });
          }}
        >
          {slotMenuWords[lang].menu}
        </button>
      </div>
      <p className="save-editor-note">{words.readPokemon}</p>
      {slotError && (
        <p className="save-editor-error" role="alert">
          {pokemonSetWords[lang].failed}
        </p>
      )}
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
            select(position, false);
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
              onSlotMenu={openSlotMenu}
              onSet={(position) => void startSet(position)}
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
              onSlotMenu={openSlotMenu}
              onSet={(position) => void startSet(position)}
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
              onSlotMenu={openSlotMenu}
              onSet={(position) => void startSet(position)}
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
          {slotAnalysis && (
            <details open>
              <summary>
                {slotMenuWords[lang].legality} ·{" "}
                {slotAnalysis.box === -1
                  ? pokemonSetWords[lang].party
                  : `${pokemonSetWords[lang].box} ${slotAnalysis.box + 1}`}{" "}
                · {slotAnalysis.slot + 1}
              </summary>
              <PokemonLegality
                position={slotAnalysis}
                report={legality}
                busy={locked}
                onAnalyze={onAnalyze}
              />
            </details>
          )}
          {!editorSource && <p>{pokemonSetWords[lang].empty}</p>}
          {selected && !access.canEdit && (
            <PokemonReadOnlySummary
              pokemon={selected}
              generation={report.generation}
              lang={lang}
            />
          )}
          {editorSource && access.canEdit && (
            <SourcePokemonEditor
              key={`${editorSource.box}:${editorSource.slot}:${editorEpoch}`}
              source={editorSource}
              revision={revision}
              disabled={locked}
              lang={lang}
              actions={pokemonSet}
              onReady={onEditorReady}
            />
          )}
          {selected && access.canStorage && (
            <StorageEditor
              key={`storage-${JSON.stringify(selected)}`}
              report={report}
              source={selected}
              busy={locked}
              onApply={onStorage}
            />
          )}
          {profileLink}
        </div>
      </div>
    </section>
  );
}
