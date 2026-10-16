import {
  PokemonAdvancedStatsEditor,
  PokemonBoostRows,
} from "./PokemonAdvancedStatsEditor";
import { PokemonAlphaMoveEditor } from "./PokemonAlphaMoveEditor";
import { saveFailureFeedback } from "./saveFailureFeedback";
import { PokemonDraftContext } from "./pokemonDraftValidation";
import { PokemonDraftRegistry } from "./pokemonDraftRegistry";
import {
  useCallback,
  useEffect,
  useMemo,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { useMysteryGiftChanges } from "./useMysteryGiftChanges";
import { beginSaveRequest } from "./clientActivity";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { PokemonEditor, type PokemonEdit } from "./PokemonEditor";
import { StandalonePokemonClient } from "./standaloneClient";
import {
  MAX_ENTITY_BYTES,
  type StandalonePokemonReport,
  type StandalonePokemonSnapshot,
  type StandalonePokemonRequest,
  type StandaloneAdvancedData,
} from "./standalonePokemon";
import { standaloneWords } from "./standaloneWords";
import { saveEditorResources } from "./locales";
import { PokemonSprite } from "./PokemonSprite";
import { PokemonLegality } from "./PokemonLegality";
import { BattleTemplateWorkspace } from "./BattleTemplateWorkspace";
import {
  parseBattleTemplateImport,
  type BattleTemplateImportActions,
} from "./battleTemplateImport";
import { parseBattleTemplate } from "./battleTemplate";
import { bulkLegalitySourceHash } from "./bulkLegality";
import type { PokemonLegalityReport, PokemonRawEdit } from "./domain";
import { PokemonRawEditor } from "./PokemonRawEditor";
import { PokemonShinyEditor } from "./PokemonShinyEditor";
import { PokemonMarkingsEditor } from "./PokemonMarkingsEditor";
import { useGenderLabel } from "./useGenderLabel";
import { PokemonVitalsEditor } from "./PokemonVitalsEditor";
import { playSaveSound } from "./saveSound";
import { PokemonTrainingEditor } from "./PokemonTrainingEditor";
import { TextTrashEditor, type TextTrashActions } from "./TextTrashEditor";
import { MoveShopEditor, type MoveShopActions } from "./MoveShopEditor";
import {
  PokemonSuperTrainingEditor,
  type PokemonSuperTrainingActions,
} from "./PokemonSuperTrainingEditor";
import { PlusRecordEditor, type PlusRecordActions } from "./PlusRecordEditor";
import { TechRecordEditor, type TechRecordActions } from "./TechRecordEditor";
import { PokemonEncounterEditor } from "./PokemonEncounterEditor";
import { PokemonFormArgumentEditor } from "./PokemonFormArgumentEditor";
import { PokemonRibbonEditor } from "./PokemonRibbonEditor";
import { PokemonMemoryEditor } from "./PokemonMemoryEditor";
import { PokemonTrainerDetailsEditor } from "./PokemonTrainerDetailsEditor";
import { PokemonHistoryEditor } from "./PokemonHistoryEditor";
import { PokemonRelearnEditor } from "./PokemonRelearnEditor";
import { PokemonCareEditor } from "./PokemonCareEditor";
import { PokemonOriginEditor } from "./PokemonOriginEditor";
import { StandaloneEggEditor } from "./StandaloneEggEditor";
import { StandaloneGbEditor } from "./StandaloneGbEditor";
import { StandaloneGbSpecialEditor } from "./StandaloneGbSpecialEditor";

function download(bytes: Uint8Array<ArrayBuffer>, name: string) {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/octet-stream" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function StandalonePokemonPanel({
  seed,
  disabled = false,
  preparedActions = [],
}: {
  seed?: StandalonePokemonSnapshot;
  disabled?: boolean;
  preparedActions?: {
    label: string;
    onPrepare(snapshot: StandalonePokemonSnapshot): Promise<void>;
  }[];
} = {}) {
  const { i18n, t } = useTranslation();
  const genderLabel = useGenderLabel();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = standaloneWords[lang],
    common = saveEditorResources[lang];
  const client = useRef(new StandalonePokemonClient());
  const settingsJson = useSaveSettingsJson();
  const previousSettings = useRef(settingsJson);
  const giftRevision = useMysteryGiftChanges();
  const previousGiftRevision = useRef(giftRevision);
  const original = useRef<StandalonePokemonSnapshot | undefined>(undefined);
  const [working, setWorking] = useState<StandalonePokemonSnapshot>();
  const [history, setHistory] = useState<StandalonePokemonSnapshot[]>([]);
  const [report, setReport] = useState<StandalonePokemonReport>();
  const [legality, setLegality] = useState<PokemonLegalityReport>();
  const [revision, setRevision] = useState(0);
  const [changed, setChanged] = useState(false);
  const [localBusy, setBusy] = useState(false);
  const busy = localBusy || disabled;
  const initialLoaded = useRef(false);
  const running = useRef(false),
    operation = useRef(0);
  const [inputEncrypted, setInputEncrypted] = useState(false);
  const [useFileFormat, setUseFileFormat] = useState(false);
  const [party, setParty] = useState(false),
    [encrypted, setEncrypted] = useState(false);
  const [error, setError] = useState<
    "failed" | "timeout" | "size" | "runtime" | "names"
  >();
  const [status, setStatus] = useState<"applied" | "restored">();
  const dispose = useCallback(() => {
    operation.current++;
    running.current = false;
    initialLoaded.current = false;
    client.current.dispose();
  }, []);
  useEffect(() => dispose, [dispose]);
  const perform = useCallback(
    async function perform<T>(
      action: (id: number) => Promise<T>,
    ): Promise<T | undefined> {
      if (running.current || disabled) return;
      running.current = true;
      setBusy(true);
      setError(undefined);
      setStatus(undefined);
      const id = ++operation.current;
      const finishActivity = beginSaveRequest();
      try {
        return await action(id);
      } catch (cause) {
        saveFailureFeedback(cause, id === operation.current);
        if (id === operation.current)
          setError(
            cause instanceof Error && /API version mismatch/.test(cause.message)
              ? "runtime"
              : cause instanceof Error &&
                  /(?:GB|Pokemon) name/.test(cause.message)
                ? "names"
                : cause instanceof Error && /timed out/.test(cause.message)
                  ? "timeout"
                  : cause instanceof Error && cause.message === "size"
                    ? "size"
                    : "failed",
          );
      } finally {
        finishActivity();
        if (id === operation.current) {
          running.current = false;
          setBusy(false);
        }
      }
    },
    [disabled],
  );
  useEffect(() => {
    if (!seed || disabled || initialLoaded.current) return;
    initialLoaded.current = true;
    void perform(async (id) => {
      const snapshot = { ...seed, bytes: new Uint8Array(seed.bytes) };
      const result = await client.current.run(snapshot.bytes, {
        fileName: snapshot.fileName,
        inputEncrypted: snapshot.inputEncrypted,
        useFileFormat: snapshot.useFileFormat,
      });
      if (id !== operation.current) return;
      original.current = snapshot;
      setWorking(snapshot);
      setHistory([]);
      setReport(result.entity);
      setLegality(undefined);
      setChanged(false);
      setParty(result.entity.party);
      setEncrypted(false);
      setRevision((value) => value + 1);
    });
  }, [seed, disabled, perform]);
  const refreshSettings = useEffectEvent(() => {
    client.current.dispose();
    setLegality(undefined);
    setRevision((value) => value + 1);
    if (!working) return;
    void perform(async (id) => {
      const result = await client.current.run(working.bytes, {
        fileName: working.fileName,
        inputEncrypted: working.inputEncrypted,
        useFileFormat: working.useFileFormat,
      });
      if (id === operation.current) setReport(result.entity);
    });
  });
  useEffect(() => {
    if (
      (settingsJson === previousSettings.current &&
        giftRevision === previousGiftRevision.current) ||
      busy
    )
      return;
    previousSettings.current = settingsJson;
    previousGiftRevision.current = giftRevision;
    refreshSettings();
  }, [settingsJson, giftRevision, busy]);

  const open = (file: File) =>
    perform(async (id) => {
      if (!file.size || file.size > MAX_ENTITY_BYTES) throw new Error("size");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (id !== operation.current) return;
      const snapshot = {
        bytes,
        fileName: file.name,
        inputEncrypted,
        useFileFormat,
      };
      const result = await client.current.run(bytes, {
        fileName: file.name,
        inputEncrypted,
        useFileFormat,
      });
      if (id !== operation.current) return;
      original.current = snapshot;
      setLegality(undefined);
      setChanged(false);
      setWorking(snapshot);
      setHistory([]);
      setReport(result.entity);
      setParty(result.entity.party);
      setEncrypted(false);
      setRevision((value) => value + 1);
    });
  const applyRequest = (
    change: Pick<
      StandalonePokemonRequest,
      | "edit"
      | "raw"
      | "eggTrainer"
      | "gb"
      | "gbSpecial"
      | "moveShopConfirmation"
      | "superTrainingConfirmation"
      | "textTrashConfirmation"
      | "plusRecordConfirmation"
      | "techRecordConfirmation"
      | "battleTemplateImportConfirmation"
    >,
    kind:
      | "entityEdit"
      | "entityRaw"
      | "entityGb"
      | "entityMoveShopCommit"
      | "entitySuperTrainingCommit"
      | "entityTextTrashCommit"
      | "entityPlusRecordCommit"
      | "entityTechRecordCommit"
      | "entityBattleTemplateImportCommit",
    onApplied?: () => void,
  ) =>
    perform(async (id) => {
      if (!working) return;
      const result = await client.current.run(
        working.bytes,
        {
          fileName: working.fileName,
          inputEncrypted: working.inputEncrypted,
          useFileFormat: working.useFileFormat,
          ...change,
        },
        kind,
      );
      if (id !== operation.current) return;
      if (!result.output) throw new Error("Missing edited file");
      setHistory((previous) => [...previous, working].slice(-20));
      setWorking({
        ...working,
        fileName: `${working.fileName.replace(/\.[^.]*$/, "")}.${result.entity.extension}`,
        bytes: result.output,
        inputEncrypted: false,
        useFileFormat: true,
        eggTrainer: change.eggTrainer ?? working.eggTrainer,
        gbLanguage: change.gbSpecial?.language ?? working.gbLanguage,
      });
      setLegality(undefined);
      setChanged(true);
      setReport(result.entity);
      setRevision((value) => value + 1);
      setStatus("applied");
      onApplied?.();
    });
  const apply = (edit: PokemonEdit) => applyRequest({ edit }, "entityEdit");
  const moveShopActions: MoveShopActions = {
    onRead: (target) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            moveShopTarget: target,
          },
          "entityMoveShop",
        );
        if (id !== operation.current) return;
        if (!result.moveShop) throw new Error("Missing Move Shop catalog");
        return result.moveShop;
      }),
    onPreview: (request) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            moveShopRequest: request,
          },
          "entityMoveShopPreview",
        );
        if (id !== operation.current) {
          if (result.moveShopPreview)
            await moveShopActions.onDiscard(result.moveShopPreview.token);
          return;
        }
        if (!result.moveShopPreview)
          throw new Error("Missing Move Shop preview");
        return result.moveShopPreview;
      }),
    onApply: async (confirmation) => {
      let applied = false;
      await applyRequest(
        { moveShopConfirmation: confirmation },
        "entityMoveShopCommit",
        () => {
          applied = true;
        },
      );
      return applied;
    },
    onDiscard: async (token) => {
      if (!working) return;
      await client.current
        .run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            moveShopToken: token,
          },
          "entityMoveShopDiscard",
        )
        .catch(() => undefined);
    },
  };
  const textTrashActions: TextTrashActions = {
    onRead: (target) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            textTrashTarget: target,
          },
          "entityTextTrash",
        );
        if (id !== operation.current) return;
        if (!result.textTrash) throw Error("Missing name catalog");
        return result.textTrash;
      }),
    onDraft: (request) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            textTrashRequest: request,
          },
          "entityTextTrashDraft",
        );
        if (id !== operation.current) return;
        if (!result.textTrashDraft) throw Error("Missing name draft");
        return result.textTrashDraft;
      }),
    onPreview: (request) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            textTrashRequest: request,
          },
          "entityTextTrashPreview",
        );
        if (id !== operation.current) {
          if (result.textTrashPreview)
            await textTrashActions.onDiscard(result.textTrashPreview.token);
          return;
        }
        if (!result.textTrashPreview) throw Error("Missing name preview");
        return result.textTrashPreview;
      }),
    onApply: async (confirmation) => {
      let applied = false;
      await applyRequest(
        { textTrashConfirmation: confirmation },
        "entityTextTrashCommit",
        () => {
          applied = true;
        },
      );
      return applied;
    },
    onDiscard: async (token) => {
      if (!working) return;
      await client.current
        .run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            textTrashToken: token,
          },
          "entityTextTrashDiscard",
        )
        .catch(() => undefined);
    },
  };
  const pokemonSuperTrainingActions: PokemonSuperTrainingActions = {
    onRead: (target) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            superTrainingTarget: target,
          },
          "entitySuperTraining",
        );
        if (id !== operation.current) return;
        if (!result.pokemonSuperTraining)
          throw new Error("Missing super training catalog");
        return result.pokemonSuperTraining;
      }),
    onPreview: (request) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            superTrainingRequest: request,
          },
          "entitySuperTrainingPreview",
        );
        if (id !== operation.current) {
          if (result.pokemonSuperTrainingPreview)
            await pokemonSuperTrainingActions.onDiscard(
              result.pokemonSuperTrainingPreview.token,
            );
          return;
        }
        if (!result.pokemonSuperTrainingPreview)
          throw new Error("Missing super training preview");
        return result.pokemonSuperTrainingPreview;
      }),
    onApply: async (confirmation) => {
      let applied = false;
      await applyRequest(
        { superTrainingConfirmation: confirmation },
        "entitySuperTrainingCommit",
        () => {
          applied = true;
        },
      );
      return applied;
    },
    onDiscard: async (token) => {
      if (!working) return;
      await client.current
        .run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            superTrainingToken: token,
          },
          "entitySuperTrainingDiscard",
        )
        .catch(() => undefined);
    },
  };
  const plusRecordActions: PlusRecordActions = {
    onRead: (target) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            plusRecordTarget: target,
          },
          "entityPlusRecord",
        );
        if (id !== operation.current) return;
        if (!result.plusRecord) throw new Error("Missing plus record catalog");
        return result.plusRecord;
      }),
    onPreview: (request) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            plusRecordRequest: request,
          },
          "entityPlusRecordPreview",
        );
        if (id !== operation.current) {
          if (result.plusRecordPreview)
            await plusRecordActions.onDiscard(result.plusRecordPreview.token);
          return;
        }
        if (!result.plusRecordPreview)
          throw new Error("Missing plus record preview");
        return result.plusRecordPreview;
      }),
    onApply: async (confirmation) => {
      let applied = false;
      await applyRequest(
        { plusRecordConfirmation: confirmation },
        "entityPlusRecordCommit",
        () => {
          applied = true;
        },
      );
      return applied;
    },
    onDiscard: async (token) => {
      if (!working) return;
      await client.current
        .run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            plusRecordToken: token,
          },
          "entityPlusRecordDiscard",
        )
        .catch(() => undefined);
    },
  };
  const techRecordActions: TechRecordActions = {
    onRead: (target) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            techRecordTarget: target,
          },
          "entityTechRecord",
        );
        if (id !== operation.current) return;
        if (!result.techRecord)
          throw new Error("Missing technical record catalog");
        return result.techRecord;
      }),
    onPreview: (request) =>
      perform(async (id) => {
        if (!working) return;
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            techRecordRequest: request,
          },
          "entityTechRecordPreview",
        );
        if (id !== operation.current) {
          if (result.techRecordPreview)
            await techRecordActions.onDiscard(result.techRecordPreview.token);
          return;
        }
        if (!result.techRecordPreview)
          throw new Error("Missing technical record preview");
        return result.techRecordPreview;
      }),
    onApply: async (confirmation) => {
      let applied = false;
      await applyRequest(
        { techRecordConfirmation: confirmation },
        "entityTechRecordCommit",
        () => {
          applied = true;
        },
      );
      return applied;
    },
    onDiscard: async (token) => {
      if (!working) return;
      await client.current
        .run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            techRecordToken: token,
          },
          "entityTechRecordDiscard",
        )
        .catch(() => undefined);
    },
  };
  const applyRaw = (raw: PokemonRawEdit) => applyRequest({ raw }, "entityRaw");
  const readDetails = <K extends keyof StandaloneAdvancedData>(
    readKind: K,
    handler?: number,
    memory?: number,
    version?: number,
    originBall?: number,
  ): Promise<NonNullable<StandaloneAdvancedData[K]> | undefined> =>
    perform(async (id) => {
      if (!working) return;
      const result = await client.current.run(
        working.bytes,
        {
          fileName: working.fileName,
          inputEncrypted: working.inputEncrypted,
          useFileFormat: working.useFileFormat,
          readKind,
          handler,
          memory,
          version,
          originBall,
        },
        "entityDetails",
      );
      if (id !== operation.current) return;
      return result.details?.[readKind] ?? undefined;
    });
  const restore = (reset: boolean) =>
    perform(async (id) => {
      const snapshot = reset ? original.current : history.at(-1);
      if (!snapshot) return;
      const result = await client.current.run(snapshot.bytes, {
        fileName: snapshot.fileName,
        inputEncrypted: snapshot.inputEncrypted,
        useFileFormat: snapshot.useFileFormat,
      });
      if (id !== operation.current) return;
      setWorking(snapshot);
      setReport(result.entity);
      setChanged(snapshot !== original.current);
      setLegality(undefined);
      setHistory((previous) => (reset ? [] : previous.slice(0, -1)));
      setRevision((value) => value + 1);
      setStatus("restored");
    });
  const battleImportActions: BattleTemplateImportActions = {
    preview: (target, text) =>
      perform(async (id) => {
        if (!working) return;
        const sourceHash = bulkLegalitySourceHash(working.bytes);
        const result = await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            battleTemplateImport: { sourceHash, target, text },
          },
          "entityBattleTemplateImportPreview",
        );
        if (id !== operation.current) {
          if (result.battleTemplateImport)
            await client.current.run(
              working.bytes,
              {
                fileName: working.fileName,
                inputEncrypted: working.inputEncrypted,
                useFileFormat: working.useFileFormat,
                battleTemplateImportToken: result.battleTemplateImport.token,
              },
              "entityBattleTemplateImportDiscard",
            );
          return;
        }
        return parseBattleTemplateImport(
          result.battleTemplateImport,
          sourceHash,
          target,
        );
      }),
    apply: async (confirmation) => {
      let applied = false;
      await applyRequest(
        { battleTemplateImportConfirmation: confirmation },
        "entityBattleTemplateImportCommit",
        () => {
          applied = true;
        },
      );
      return applied;
    },
    discard: async (token) => {
      if (working)
        await client.current.run(
          working.bytes,
          {
            fileName: working.fileName,
            inputEncrypted: working.inputEncrypted,
            useFileFormat: working.useFileFormat,
            battleTemplateImportToken: token,
          },
          "entityBattleTemplateImportDiscard",
        );
    },
  };
  const readBattleTemplate = () =>
    perform(async (id) => {
      if (!working) return;
      const source = working;
      const hash = bulkLegalitySourceHash(source.bytes);
      const result = await client.current.run(
        source.bytes,
        {
          fileName: source.fileName,
          inputEncrypted: source.inputEncrypted,
          useFileFormat: source.useFileFormat,
        },
        "entityBattleTemplate",
      );
      if (id !== operation.current) return;
      return parseBattleTemplate(result.battleTemplate, hash, {
        scope: "single",
      });
    });
  const analyze = () =>
    perform(async (id) => {
      if (!working) return;
      setLegality(undefined);
      if (!report?.pokemon.valid || report.pokemon.species === 0) {
        setError("failed");
        playSaveSound("other", "hand");
        return;
      }
      const result = await client.current.run(
        working.bytes,
        {
          fileName: working.fileName,
          inputEncrypted: working.inputEncrypted,
          useFileFormat: working.useFileFormat,
        },
        "entityLegality",
      );
      if (id !== operation.current) return;
      if (!result.legality) throw new Error("Missing legality report");
      setLegality(result.legality);
      playSaveSound("legality");
    });
  const exportFile = () =>
    perform(async (id) => {
      if (!working || !report) return;
      const result = await client.current.run(
        working.bytes,
        {
          fileName: working.fileName,
          inputEncrypted: working.inputEncrypted,
          useFileFormat: working.useFileFormat,
          party,
          encrypted,
        },
        "entityExport",
      );
      if (id !== operation.current) return;
      if (!result.entityFile) throw new Error("Missing exported file");
      const stem = working.fileName.replace(/\.[^.]*$/, "");
      download(
        result.entityFile,
        `${stem}-edited${encrypted ? "-encrypted" : ""}.${report.extension.replace(/^\./, "")}`,
      );
    });
  const prepare = (
    action: (snapshot: StandalonePokemonSnapshot) => Promise<void>,
  ) =>
    perform(async (id) => {
      if (!working || !report) return;
      const result = await client.current.run(
        working.bytes,
        {
          fileName: working.fileName,
          inputEncrypted: working.inputEncrypted,
          useFileFormat: working.useFileFormat,
          party: true,
          encrypted: false,
        },
        "entityExport",
      );
      if (id !== operation.current) return;
      if (!result.entityFile) throw Error("Missing prepared entity");
      await action({
        ...working,
        bytes: new Uint8Array(result.entityFile),
        fileName:
          working.fileName.replace(/\.[^.]*$/, "") +
          "-edited." +
          report.extension.replace(/^\./, ""),
        inputEncrypted: false,
        useFileFormat: true,
      });
    });
  const draftRegistry = useMemo(
    () => new PokemonDraftRegistry(`${working?.fileName ?? ""}:${revision}`),
    [revision, working?.fileName],
  );
  return (
    <PokemonDraftContext value={draftRegistry}>
      <div className="save-editor-panel" aria-busy={busy}>
        <p>{words.intro}</p>
        {!seed && (
          <div className="save-editor-fields">
            <label className="field">
              <span>{words.inputLayout}</span>
              <Select
                disabled={busy}
                value={inputEncrypted ? "raw" : "normal"}
                onChange={(event) =>
                  setInputEncrypted(event.target.value === "raw")
                }
              >
                <option value="normal">{words.normal}</option>
                <option value="raw">{words.rawBk4}</option>
              </Select>
            </label>
            <p className="save-editor-note">{words.inputNote}</p>
            <label className="field">
              <span>{words.formatMode}</span>
              <Select
                disabled={busy}
                value={useFileFormat ? "file" : "auto"}
                onChange={(event) =>
                  setUseFileFormat(event.target.value === "file")
                }
              >
                <option value="auto">{words.autoFormat}</option>
                <option value="file">{words.fileFormat}</option>
              </Select>
            </label>
            <p className="save-editor-note">{words.formatNote}</p>
          </div>
        )}
        <div className="save-editor-toolbar">
          {!seed && (
            <label className="save-editor-file">
              {words.open}
              <input
                type="file"
                aria-label={words.open}
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void open(file);
                }}
              />
            </label>
          )}
          {working &&
            preparedActions.map((action) => (
              <button
                type="button"
                key={action.label}
                disabled={busy}
                onClick={() => void prepare(action.onPrepare)}
              >
                {action.label}
              </button>
            ))}
          {working && (
            <>
              <button
                type="button"
                disabled={busy || !history.length}
                onClick={() => void restore(false)}
              >
                {common.undo}
              </button>
              <button
                type="button"
                disabled={busy || !changed}
                onClick={() => void restore(true)}
              >
                {words.restore}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const source = original.current;
                  if (source) download(source.bytes, source.fileName);
                }}
              >
                {words.original}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  original.current = undefined;
                  setLegality(undefined);
                  setChanged(false);
                  setWorking(undefined);
                  setReport(undefined);
                  setHistory([]);
                  setError(undefined);
                  setStatus(undefined);
                  client.current.dispose();
                }}
              >
                {common.close}
              </button>
            </>
          )}
          {localBusy && (
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
        {busy && <p role="status">{common.loading}</p>}
        {error && (
          <p className="save-editor-error" role="alert">
            {words[error]}
          </p>
        )}
        {status && <p role="status">{words[status]}</p>}
        {report && working && (
          <>
            <div className="save-pokemon-identity">
              <PokemonSprite
                pokemon={report.pokemon}
                alt=""
                width={68}
                height={56}
              />
              <h3>{report.pokemon.speciesName[lang]}</h3>
            </div>
            <p className="save-editor-note">
              {working.fileName} · {report.format} ·{" "}
              {report.generation < 3
                ? words.gbFile
                : report.party
                  ? words.party
                  : words.stored}
            </p>
            <dl className="save-editor-summary">
              {[
                [common.nickname, report.pokemon.nickname || "—"],
                [common.level, report.pokemon.level],
                [common.trainerName, report.pokemon.ot || "—"],
                ...(report.generation < 3
                  ? [["TID", report.pokemon.tid]]
                  : [
                      [
                        "TID / SID",
                        `${report.pokemon.tid} / ${report.pokemon.sid}`,
                      ],
                      [common.nature, report.pokemon.nature[lang]],
                      [common.ability, report.pokemon.ability[lang]],
                    ]),
                ...(report.generation >= 2 || report.pokemon.vitals?.showGender
                  ? [
                      [
                        common.gender,
                        genderLabel(
                          report.pokemon.gender,
                          [common.male, common.female, common.genderless][
                            report.pokemon.gender
                          ],
                        ),
                      ],
                      ...(report.generation >= 2
                        ? [
                            [
                              common.shiny,
                              report.pokemon.shiny ? common.yes : common.no,
                            ],
                          ]
                        : []),
                    ]
                  : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <h3>{common.moves}</h3>
            <ul className="save-pokemon-moves">
              {report.pokemon.moves.map((move, index) => (
                <li key={index}>
                  {move[lang]} · PP {report.pokemon.movePp[index]}
                </li>
              ))}
            </ul>
            <div className="save-pokemon-stats">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{common.pokemon}</th>
                    {(report.generation < 3
                      ? [
                          common.hp,
                          common.attack,
                          common.defense,
                          common.speed,
                          words.special,
                        ]
                      : [
                          common.hp,
                          common.attack,
                          common.defense,
                          common.spAttack,
                          common.spDefense,
                          common.speed,
                        ]
                    ).map((stat) => (
                      <th scope="col" key={stat}>
                        {stat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">
                      {report.generation < 3 ? words.dvs : common.ivs}
                    </th>
                    {(report.generation < 3
                      ? [0, 1, 2, 5, 3].map((i) => report.pokemon.ivs[i])
                      : report.pokemon.ivs
                    ).map((value, index) => (
                      <td key={index}>{value}</td>
                    ))}
                  </tr>
                  {!report.pokemon.advancedStats?.awakening && (
                    <tr>
                      <th scope="row">
                        {report.generation < 3
                          ? words.statExperience
                          : common.evs}
                      </th>
                      {(report.generation < 3
                        ? [0, 1, 2, 5, 3].map((i) => report.pokemon.evs[i])
                        : report.pokemon.evs
                      ).map((value, index) => (
                        <td key={index}>{value}</td>
                      ))}
                    </tr>
                  )}
                  <PokemonBoostRows
                    info={report.pokemon.advancedStats}
                    lang={lang}
                  />
                </tbody>
              </table>
            </div>
            {working && (
              <BattleTemplateWorkspace
                key={`template:${lang}:${settingsJson}`}
                revision={revision}
                lang={lang}
                busy={busy}
                onRead={readBattleTemplate}
                fileTarget={{
                  kind: "file",
                  box: 0,
                  slot: 0,
                  fileName: working.fileName,
                  inputEncrypted: working.inputEncrypted,
                  useFileFormat: working.useFileFormat ?? false,
                }}
                importActions={battleImportActions}
              />
            )}
            <PokemonLegality
              position={report.pokemon}
              report={legality}
              busy={busy}
              onAnalyze={analyze}
            />
            <p className="save-editor-note">{words.legalityContext}</p>
            {report.canEdit ? (
              <>
                {report.generation < 3 ? (
                  <p className="save-editor-note">{words.gbExport}</p>
                ) : (
                  <div className="save-editor-fields">
                    <label className="field">
                      <span>{words.layout}</span>
                      <Select
                        disabled={busy}
                        value={party ? "party" : "stored"}
                        onChange={(event) =>
                          setParty(event.target.value === "party")
                        }
                      >
                        <option value="stored">{words.stored}</option>
                        <option value="party">{words.party}</option>
                      </Select>
                    </label>
                    <label className="field">
                      <span>{words.encoding}</span>
                      <Select
                        disabled={busy}
                        value={encrypted ? "encrypted" : "plain"}
                        onChange={(event) =>
                          setEncrypted(event.target.value === "encrypted")
                        }
                      >
                        <option value="plain">{words.plain}</option>
                        <option value="encrypted">{words.encrypted}</option>
                      </Select>
                    </label>
                  </div>
                )}
                <div className="save-editor-toolbar">
                  <button
                    className="primary"
                    type="button"
                    disabled={busy}
                    onClick={() => void exportFile()}
                  >
                    {words.export}
                  </button>
                </div>
                <p className="save-editor-note">{words.history}</p>
                {report.pokemon.vitals && (
                  <PokemonVitalsEditor
                    key="vitals"
                    info={report.pokemon.vitals}
                    generation={report.generation}
                    disabled={busy}
                    onApply={(vitals) =>
                      report.generation < 3
                        ? applyRequest(
                            { gbSpecial: { action: "vitals", vitals } },
                            "entityGb",
                          )
                        : applyRaw({
                            box: report.pokemon.box,
                            slot: report.pokemon.slot,
                            action: "vitals",
                            vitals,
                          })
                    }
                  />
                )}
                {report.generation < 3 ? (
                  <>
                    <StandaloneGbEditor
                      key={revision}
                      report={report}
                      disabled={busy}
                      onApply={(gb) => applyRequest({ gb }, "entityGb")}
                    />
                    {report.gb && (
                      <StandaloneGbSpecialEditor
                        key={`gb-special-${revision}`}
                        info={report.gb}
                        pokemon={report.pokemon}
                        disabled={busy}
                        initialLanguage={working.gbLanguage}
                        onApply={(gbSpecial) =>
                          applyRequest({ gbSpecial }, "entityGb")
                        }
                      />
                    )}
                  </>
                ) : (
                  <>
                    <PokemonEditor
                      key={revision}
                      pokemon={report.pokemon}
                      moveChoices={report.moveChoices}
                      attributeChoices={report.attributeChoices}
                      disabled={busy}
                      onApply={apply}
                    />
                    <PokemonTrainingEditor
                      key={`training-${revision}`}
                      training={report.pokemon.training}
                      generation={report.generation}
                      position={report.pokemon}
                      disabled={busy}
                      onApply={applyRaw}
                    />
                    {report.format === "PA8" &&
                      report.pokemon.valid &&
                      report.pokemon.species > 0 &&
                      working && (
                        <MoveShopEditor
                          key={`move-shop-${revision}`}
                          target={{
                            kind: "file",
                            box: 0,
                            slot: 0,
                            fileName: working.fileName,
                            inputEncrypted: working.inputEncrypted,
                            useFileFormat: working.useFileFormat ?? false,
                          }}
                          lang={lang}
                          busy={busy}
                          {...moveShopActions}
                        />
                      )}
                    {report.pokemon.valid &&
                      report.pokemon.species > 0 &&
                      working && (
                        <TextTrashEditor
                          key={`text-trash-${revision}`}
                          target={{
                            kind: "file",
                            box: 0,
                            slot: 0,
                            fileName: working.fileName,
                            inputEncrypted: working.inputEncrypted,
                            useFileFormat: working.useFileFormat ?? false,
                          }}
                          fields={
                            report.generation >= 6
                              ? [
                                  "nickname",
                                  "originalTrainer",
                                  "handlingTrainer",
                                ]
                              : ["nickname", "originalTrainer"]
                          }
                          lang={lang}
                          busy={busy}
                          {...textTrashActions}
                        />
                      )}
                    {["PK6", "PK7"].includes(report.format) &&
                      report.pokemon.valid &&
                      report.pokemon.species > 0 &&
                      working && (
                        <PokemonSuperTrainingEditor
                          key={`super-training-${revision}`}
                          target={{
                            kind: "file",
                            box: 0,
                            slot: 0,
                            fileName: working.fileName,
                            inputEncrypted: working.inputEncrypted,
                            useFileFormat: working.useFileFormat ?? false,
                          }}
                          lang={lang}
                          busy={busy}
                          {...pokemonSuperTrainingActions}
                        />
                      )}
                    {report.format === "PA9" &&
                      report.pokemon.valid &&
                      report.pokemon.species > 0 &&
                      working && (
                        <PlusRecordEditor
                          key={`plus-record-${revision}`}
                          target={{
                            kind: "file",
                            box: 0,
                            slot: 0,
                            fileName: working.fileName,
                            inputEncrypted: working.inputEncrypted,
                            useFileFormat: working.useFileFormat ?? false,
                          }}
                          lang={lang}
                          busy={busy}
                          {...plusRecordActions}
                        />
                      )}
                    {["PK8", "PB8", "PA8", "PK9", "PA9"].includes(
                      report.format,
                    ) &&
                      report.pokemon.valid &&
                      report.pokemon.species > 0 &&
                      working && (
                        <TechRecordEditor
                          key={`tech-record-${revision}`}
                          target={{
                            kind: "file",
                            box: 0,
                            slot: 0,
                            fileName: working.fileName,
                            inputEncrypted: working.inputEncrypted,
                            useFileFormat: working.useFileFormat ?? false,
                          }}
                          lang={lang}
                          busy={busy}
                          {...techRecordActions}
                        />
                      )}
                    <PokemonEncounterEditor
                      key={`encounter-${revision}`}
                      encounter={report.pokemon.encounter}
                      position={report.pokemon}
                      disabled={busy}
                      onApply={applyRaw}
                    />
                    <PokemonOriginEditor
                      key={`origin-${revision}`}
                      origin={report.pokemon.origin}
                      position={report.pokemon}
                      disabled={busy}
                      readDisabled={busy}
                      onRead={(_, version, ball) =>
                        readDetails(
                          "origin",
                          undefined,
                          undefined,
                          version,
                          ball,
                        )
                      }
                      onApply={applyRaw}
                    />
                    <StandaloneEggEditor
                      key={`egg-${revision}`}
                      pokemon={report.pokemon}
                      disabled={busy}
                      initialTrainer={working?.eggTrainer}
                      onRead={() => readDetails("eggContext")}
                      onApply={(raw, eggTrainer) =>
                        applyRequest({ raw, eggTrainer }, "entityRaw")
                      }
                    />
                    {report.canMemories && (
                      <PokemonMemoryEditor
                        key={`memory-${revision}`}
                        position={report.pokemon}
                        disabled={busy}
                        readDisabled={busy}
                        onRead={(query) =>
                          readDetails("memory", query.handler, query.memory)
                        }
                        onApply={applyRaw}
                      />
                    )}
                    {!report.canMemories && report.care.length > 0 && (
                      <PokemonCareEditor
                        key={`care-${revision}`}
                        fields={report.care}
                        isEgg={report.pokemon.egg}
                        position={report.pokemon}
                        disabled={busy}
                        onApply={applyRaw}
                      />
                    )}
                    <PokemonTrainerDetailsEditor
                      key={`trainer-details-${working.fileName}`}
                      revision={revision}
                      position={report.pokemon}
                      disabled={busy}
                      readDisabled={busy}
                      onRead={() => readDetails("trainerDetails")}
                      onApply={applyRaw}
                    />
                    {report.generation >= 6 && (
                      <PokemonHistoryEditor
                        key={`history-${revision}`}
                        position={report.pokemon}
                        disabled={busy}
                        readDisabled={busy}
                        onRead={() => readDetails("history")}
                        onApply={applyRaw}
                      />
                    )}
                    <PokemonRibbonEditor
                      key={`ribbons-${revision}`}
                      position={report.pokemon}
                      generation={report.generation}
                      disabled={busy}
                      readDisabled={busy}
                      onRead={() => readDetails("ribbons")}
                      onApply={applyRaw}
                    />
                    {report.pokemon.advancedStats && (
                      <PokemonAdvancedStatsEditor
                        key="advanced-stats"
                        info={report.pokemon.advancedStats}
                        position={report.pokemon}
                        disabled={busy}
                        onApply={applyRaw}
                      />
                    )}
                    {report.pokemon.alphaMove != null && (
                      <PokemonAlphaMoveEditor
                        key={`alpha-move-${revision}`}
                        move={report.pokemon.alphaMove}
                        choices={report.moveChoices}
                        position={report.pokemon}
                        disabled={busy}
                        onApply={applyRaw}
                      />
                    )}
                    <PokemonRelearnEditor
                      key={`relearn-${revision}`}
                      position={report.pokemon}
                      moves={report.pokemon.relearnMoves}
                      choices={report.moveChoices}
                      disabled={busy}
                      onSuggest={() => readDetails("relearn")}
                      onApply={applyRaw}
                    />
                    <PokemonMarkingsEditor
                      key={`markings-${revision}`}
                      pokemon={report.pokemon}
                      lang={lang}
                      disabled={busy}
                      onApply={applyRaw}
                    />
                    <PokemonShinyEditor
                      key={`shiny-${revision}`}
                      position={report.pokemon}
                      disabled={busy}
                      onApply={applyRaw}
                    />
                    <PokemonRawEditor
                      key={`raw-${revision}`}
                      pokemon={report.pokemon}
                      disabled={busy}
                      onApply={applyRaw}
                    />
                    {report.pokemon.formArgument && (
                      <PokemonFormArgumentEditor
                        key={`form-${revision}`}
                        argument={report.pokemon.formArgument}
                        position={report.pokemon}
                        disabled={busy}
                        onApply={applyRaw}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="save-editor-note">{words.readonly}</p>
            )}
          </>
        )}
      </div>
    </PokemonDraftContext>
  );
}
