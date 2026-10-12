import { MailboxEditor } from "./MailboxEditor";
import {
  mailboxWords,
  supportsMailbox,
  type MailConfirmation,
} from "./mailbox";
import { ChatterEditor } from "./ChatterEditor";
import {
  chatterWords,
  supportsChatter,
  type ChatterConfirmation,
} from "./chatter";
import { SaveSectionNavigation } from "./SaveSectionNavigation";
import { RegisteredGroupViewer } from "./RegisteredGroupViewer";
import {
  registeredGroupWords,
  type RegisteredGroupPosition,
} from "./registeredGroups";
import type { SaveSection, SaveSectionItem } from "./saveWorkspace";
import { SuperTrain6Editor } from "./SuperTrain6Editor";
import { supportsSuperTrain6 } from "./superTrain6";
import { st6Words } from "./superTrain6Words";
import { SecretBase6Editor } from "./SecretBase6Editor";
import { supportsSecretBase6 } from "./secretBase6";
import { sb6Words } from "./secretBase6Words";
import { Link6Editor } from "./Link6Editor";
import { supportsLink6 } from "./link6";
import { link6Words } from "./link6Words";
import { Hall6Editor } from "./Hall6Editor";
import { supportsHall6 } from "./hall6";
import { hall6Words } from "./hall6Words";
import { BerryField6XYViewer } from "./BerryField6XYViewer";
import { supportsBerryField6XY, berry6xyWords } from "./berryField6xy";
import { Avenue5Editor } from "./Avenue5Editor";
import { supportsAvenue5, avenue5Words } from "./avenue5";
import { UnityTower5Editor } from "./UnityTower5Editor";
import { supportsUnityTower5, tower5Words } from "./unityTower5";
import { Misc5Editor } from "./Misc5Editor";
import { supportsMisc5 } from "./misc5";
import { misc5Labels } from "./misc5Labels";
import { Medals5Editor } from "./Medals5Editor";
import { supportsMedals5 } from "./medals5";
import { medals5Labels } from "./medals5Labels";
import { GlobalLink5Editor } from "./GlobalLink5Editor";
import { gl5Words, supportsGlobalLink5 } from "./globalLink5";
import { Dlc5Editor } from "./Dlc5Editor";
import { dlc5Words, supportsDlc5 } from "./dlc5";
import { CGear5Editor } from "./CGear5Editor";
import { cgear5Words, supportsCGear5 } from "./cgear5";
import { ZaPokedexEditor } from "./ZaPokedexEditor";
import { SvPokedexEditor } from "./SvPokedexEditor";
import { LegendsPokedexEditor } from "./LegendsPokedexEditor";
import { SwshPokedexEditor } from "./SwshPokedexEditor";
import { BdspPokedexEditor } from "./BdspPokedexEditor";
import { Gen7PokedexEditor } from "./Gen7PokedexEditor";
import { FlagPokedexEditor } from "./FlagPokedexEditor";
import { Gen4PokedexEditor } from "./Gen4PokedexEditor";
import { SimplePokedexEditor } from "./SimplePokedexEditor";
import { SevenStar9Editor } from "./SevenStar9Editor";
import { supportsSevenStar9, isSevenStar9Page } from "./sevenstar9";
import { sevenStar9Words } from "./sevenstar9Words";
import { Raid9Editor } from "./Raid9Editor";
import { supportsRaid9, isRaid9Catalog } from "./raid9";
import { raid9Words } from "./raid9Words";
import { Fashion9Editor } from "./Fashion9Editor";
import { supportsFashion9, isFashion9Page } from "./fashion9";
import { fashion9Words } from "./fashion9Words";
import { Event9aEditor } from "./Event9aEditor";
import { supportsEvent9a } from "./event9a";
import { event9aWords } from "./event9aWords";
import { Donut9aEditor } from "./Donut9aEditor";
import { supportsDonut9a } from "./donut9a";
import { donut9aWords } from "./donut9aWords";
import { Trainer8Editor } from "./Trainer8Editor";
import { supportsTrainer8 } from "./trainer8";
import { trainer8Words } from "./trainer8Words";
import { Trainer8aEditor } from "./Trainer8aEditor";
import { supportsTrainer8a } from "./trainer8a";
import { trainer8aWords } from "./trainer8aWords";
import { Trainer8bEditor } from "./Trainer8bEditor";
import { supportsTrainer8b } from "./trainer8b";
import { trainer8bWords } from "./trainer8bWords";
import { Raid8Editor } from "./Raid8Editor";
import { supportsRaid8 } from "./raid8";
import { raid8Words } from "./raid8Words";
import { Underground8bEditor } from "./Underground8bEditor";
import { supportsUnderground8b } from "./underground8b";
import { underground8bWords } from "./underground8bWords";
import { Seal8bEditor } from "./Seal8bEditor";
import { supportsSeal8b } from "./seal8b";
import { seal8bWords } from "./seal8bWords";
import { Misc8bEditor } from "./Misc8bEditor";
import { supportsMisc8b } from "./misc8b";
import { misc8bWords } from "./misc8bWords";
import { TrainerGGEditor } from "./TrainerGGEditor";
import { supportsTrainerGG } from "./trainerGG";
import { trainerGGWords } from "./trainerGGWords";
import { Trainer7Editor } from "./Trainer7Editor";
import { supportsTrainer7 } from "./trainer7";
import { Trainer6Editor } from "./Trainer6Editor";
import { trainer6Words } from "./trainer6Words";
import { Zygarde7Editor } from "./Zygarde7Editor";
import { Hall7Editor } from "./Hall7Editor";
import { supportsHall7 } from "./hall7";
import { hall7Words } from "./hall7Words";
import { supportsZygarde7 } from "./zygarde7";
import { zygarde7Words } from "./zygarde7Words";
import { supportsTrainer6, tr6IdInput, tr6Tsv } from "./trainer6";
import { TrainerAppearance6Fields } from "./TrainerAppearance6Fields";
import { TrainerDateFields } from "./TrainerDateFields";
import { useCallback, useEffect, useRef, useState } from "react";
import { PropertyBatchEditor } from "./PropertyBatchEditor";
import { FileBatchEditor } from "./FileBatchEditor";
import {
  fileBatchWords,
  readBatchFiles,
  type FileBatchConfirmation,
} from "./fileBatch";
import { propertyBatchWords } from "./propertyBatch";
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
import { EventEditor } from "./EventEditor";
import { supportsEvents, eventWords, validateEventFiles } from "./events";
import { GsBall2Editor } from "./GsBall2Editor";
import { supportsGsBall2, gsBall2Words } from "./gsBall2";
import { Hall3Editor } from "./Hall3Editor";
import { supportsHall3, hall3Words } from "./hall3";
import { Hall1Editor } from "./Hall1Editor";
import { supportsHall1, hall1Words } from "./hall1";
import { EventResetEditor } from "./EventResetEditor";
import { supportsEventReset, eventResetWords } from "./eventReset";
import { Ferry3Editor } from "./Ferry3Editor";
import { supportsFerry3, ferry3Words } from "./ferry3";
import { Misc3Editor } from "./Misc3Editor";
import { supportsMisc3, misc3Words } from "./misc3";
import { SecretBase3Editor } from "./SecretBase3Editor";
import { supportsSecretBase3, secretBase3Words } from "./secretBase3";
import { PokeGear4Editor } from "./PokeGear4Editor";
import { supportsPokeGear4, pokegear4Words } from "./pokegear4";
import { Pokeathlon4Editor } from "./Pokeathlon4Editor";
import { supportsPokeathlon4, pokeathlon4Words } from "./pokeathlon4";
import { BattlePass4Editor } from "./BattlePass4Editor";
import { battlePass4Words } from "./battlePass4";
import { BrTrainer4Editor } from "./BrTrainer4Editor";
import { brTrainer4Words } from "./brTrainer4";
import { BattleVideo4Editor } from "./BattleVideo4Editor";
import { supportsBattleVideo4, video4Words } from "./battleVideo4";
import { Geonet4Editor } from "./Geonet4Editor";
import { geonet4Words, supportsGeonet4 } from "./geonet4";
import { Misc4Editor } from "./Misc4Editor";
import { misc4Words, supportsMisc4 } from "./misc4";
import { Underground4Editor } from "./Underground4Editor";
import { ug4Words, supportsUnderground4 } from "./underground4";
import { HoneyTree4Editor } from "./HoneyTree4Editor";
import { honey4Words, supportsHoneyTree4 } from "./honeyTree4";
import { Br4GearEditor } from "./Br4GearEditor";
import { supportsBr4Gear, br4GearWords, br4Profile } from "./br4";
import { Joyful3Editor } from "./Joyful3Editor";
import { supportsJoyful3, joyful3Words } from "./joyful3";
import { Frontier3Editor } from "./Frontier3Editor";
import { supportsFrontier3, frontier3Words } from "./frontier3";
import { GameRecords3Editor } from "./GameRecords3Editor";
import { supportsGameRecords3, gameRecords3Words } from "./gameRecords3";
import { Paintings3Editor } from "./Paintings3Editor";
import { supportsPaintings3, paintings3Words } from "./paintings3";
import { Decorations3Editor } from "./Decorations3Editor";
import { supportsDecorations3, decorations3Words } from "./decorations3";
import { Roamer3Editor } from "./Roamer3Editor";
import { supportsRoamer3, roamer3Words } from "./roamer3";
import { RoamerEditor } from "./RoamerEditor";
import { supportsRoamer, roamerWords } from "./roamer";
import { RtcEditor } from "./RtcEditor";
import { supportsRtc, rtcWords } from "./rtc";
import { OPowerEditor } from "./OPowerEditor";
import { supportsOPowers, opowerWords } from "./opowers";
import { SaveFoodEditor } from "./SaveFoodEditor";
import { supportsFood, foodWords } from "./saveFood";
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
  const [section, setSection] = useState<SaveSection>("pokemon");
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
  const [trainer6Draft, setTrainer6Draft] = useState(false);
  const [geographyReset, setGeographyReset] = useState(0);
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
        (previous === "mailbox" && !supportsMailbox(result.report.format)) ||
        (previous === "chatter" && !supportsChatter(result.report.format)) ||
        (previous === "registeredGroups" && !result.report.registeredTeams) ||
        (previous === "sevenstar9" &&
          !supportsSevenStar9(result.report.format)) ||
        (previous === "raid9" && !supportsRaid9(result.report.format)) ||
        (previous === "fashion9" && !supportsFashion9(result.report.format)) ||
        (previous === "event9a" && !supportsEvent9a(result.report.format)) ||
        (previous === "donut9a" && !supportsDonut9a(result.report.format)) ||
        (previous === "trainer8" && !supportsTrainer8(result.report.format)) ||
        (previous === "trainer8a" &&
          !supportsTrainer8a(result.report.format)) ||
        (previous === "trainer8b" &&
          !supportsTrainer8b(result.report.format)) ||
        (previous === "raid8" && !supportsRaid8(result.report.format)) ||
        (previous === "underground8b" &&
          !supportsUnderground8b(result.report.format)) ||
        (previous === "seal8b" && !supportsSeal8b(result.report.format)) ||
        (previous === "misc8b" && !supportsMisc8b(result.report.format)) ||
        (previous === "batch" && !result.report.canEdit) ||
        (previous === "pokedex" && !result.report.pokedex) ||
        (previous === "records" && !result.report.trainer.canRecords) ||
        (previous === "food" && !supportsFood(result.report.format)) ||
        (previous === "opowers" && !supportsOPowers(result.report.format)) ||
        (previous === "events" && !supportsEvents(result.report.format)) ||
        (previous === "gsBall2" &&
          !supportsGsBall2(result.report.format, result.report.version)) ||
        (previous === "hall3" && !supportsHall3(result.report.format)) ||
        (previous === "hall1" && !supportsHall1(result.report.format)) ||
        (previous === "eventReset" &&
          !supportsEventReset(result.report.format)) ||
        (previous === "ferry3" && !supportsFerry3(result.report.format)) ||
        (previous === "misc3" && !supportsMisc3(result.report.format)) ||
        (previous === "secretBase3" &&
          !supportsSecretBase3(result.report.format)) ||
        (previous === "pokegear4" &&
          !supportsPokeGear4(result.report.format)) ||
        (previous === "pokeathlon4" &&
          !supportsPokeathlon4(result.report.format)) ||
        (previous === "battlePass4" &&
          !supportsBr4Gear(result.report.format)) ||
        (previous === "brTrainer4" && !supportsBr4Gear(result.report.format)) ||
        (previous === "battleVideo4" &&
          !supportsBattleVideo4(result.report.format)) ||
        (previous === "geonet4" && !supportsGeonet4(result.report.format)) ||
        (previous === "misc4" && !supportsMisc4(result.report.format)) ||
        (previous === "misc5" && !supportsMisc5(result.report.format)) ||
        (previous === "medals5" && !supportsMedals5(result.report.format)) ||
        (previous === "berryField6xy" &&
          !supportsBerryField6XY(result.report.format)) ||
        (previous === "avenue5" && !supportsAvenue5(result.report.format)) ||
        (previous === "superTrain6" &&
          !supportsSuperTrain6(result.report.format)) ||
        (previous === "secretBase6" &&
          !supportsSecretBase6(result.report.format)) ||
        (previous === "link6" && !supportsLink6(result.report.format)) ||
        (previous === "hall6" && !supportsHall6(result.report.format)) ||
        (previous === "zygarde7" && !supportsZygarde7(result.report.format)) ||
        (previous === "trainerGG" &&
          !supportsTrainerGG(result.report.format)) ||
        (previous === "hall7" && !supportsHall7(result.report.format)) ||
        (previous === "unityTower5" &&
          !supportsUnityTower5(result.report.format)) ||
        (previous === "globalLink5" &&
          !supportsGlobalLink5(result.report.format)) ||
        (previous === "dlc5" && !supportsDlc5(result.report.format)) ||
        (previous === "cgear5" && !supportsCGear5(result.report.format)) ||
        (previous === "underground4" &&
          !supportsUnderground4(result.report.format)) ||
        (previous === "honeyTree4" &&
          !supportsHoneyTree4(result.report.format)) ||
        (previous === "br4Gear" && !supportsBr4Gear(result.report.format)) ||
        (previous === "joyful3" && !supportsJoyful3(result.report.format)) ||
        (previous === "frontier3" &&
          !supportsFrontier3(result.report.format)) ||
        (previous === "gameRecords3" &&
          !supportsGameRecords3(result.report.format)) ||
        (previous === "paintings3" &&
          !supportsPaintings3(result.report.format)) ||
        (previous === "decorations3" &&
          !supportsDecorations3(result.report.format)) ||
        (previous === "roamer3" && !supportsRoamer3(result.report.format)) ||
        (previous === "roamer" && !supportsRoamer(result.report.format)) ||
        (previous === "rtc" && !supportsRtc(result.report.format))
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
      const result =
        report.canEdit || report.trainerOnly
          ? await client.current.run(
              working.current ?? original.current,
              JSON.stringify(validateTrainer(draft, report)),
            )
          : await client.current.run(
              working.current ?? original.current,
              undefined,
              "exportWorkingCopy",
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

  const batchLang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const discardPropertyPreview = useCallback((token: string) => {
    if (working.current)
      client.current.discardPropertyPreview(working.current, token);
  }, []);
  const readPropertyBatch = async (
    kind: "propertyCatalog" | "propertyPreview" | "fileCatalog",
    payload?: string,
  ) => {
    let response: import("./domain").SaveEditorResult | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(working.current, payload, kind);
      if (id === operation.current) response = result;
    });
    return response;
  };
  const discardFilePreview = useCallback((token: string) => {
    if (working.current)
      client.current.discardFilePreview(working.current, token);
  }, []);
  const discardBoxImport = useCallback((token: string) => {
    if (working.current)
      client.current.discardBoxImport(working.current, token);
  }, []);
  const discardBoxBinary = useCallback((token: string) => {
    if (working.current)
      client.current.discardBoxBinary(working.current, token);
  }, []);
  const previewBoxBinary = async (
    file: File,
    options: import("./boxBinary").BoxBinaryOptions,
  ) => {
    let response: import("./domain").SaveEditorResult | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      if (file.size === 0 || file.size > MAX_SAVE_BYTES)
        throw new Error("Box binary file exceeds limits.");
      const loaded = await readBatchFiles(
        [file],
        () => id === operation.current,
      );
      if (!loaded || id !== operation.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ ...options, data: loaded[0].data }),
        "boxBinaryPreview",
      );
      if (id === operation.current) response = result;
    });
    return response;
  };
  const previewBoxImport = async (
    files: File[],
    options: import("./boxImport").BoxImportOptions,
  ) => {
    let response: import("./domain").SaveEditorResult | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const loaded = files.length
        ? await readBatchFiles(files, () => id === operation.current)
        : [];
      if (!loaded || id !== operation.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ ...options, files: loaded }),
        "boxImportPreview",
      );
      if (id === operation.current) response = result;
    });
    return response;
  };
  const previewFileBatch = async (files: File[], text: string) => {
    let response: import("./domain").SaveEditorResult | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const loaded = await readBatchFiles(
        files,
        () => id === operation.current,
      );
      if (!loaded || id !== operation.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ files: loaded, text, language: batchLang }),
        "filePreview",
      );
      if (id === operation.current) response = result;
    });
    return response;
  };
  const downloadArchive = async (
    payload: string,
    kind: "fileExport" | "boxArchive" | "boxBinaryExport",
    filename: string,
  ) => {
    let downloaded = false;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(working.current, payload, kind);
      if (id !== operation.current) return;
      const bytes =
        kind === "boxBinaryExport" ? result.boxBinary : result.archive;
      if (!bytes)
        throw new Error(
          kind === "boxBinaryExport"
            ? "Box binary export is missing."
            : "File batch archive is missing.",
        );
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type:
            kind === "boxBinaryExport"
              ? "application/octet-stream"
              : "application/zip",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      downloaded = true;
    });
    return downloaded;
  };
  const downloadFileBatch = (confirmation: FileBatchConfirmation) =>
    downloadArchive(
      JSON.stringify(confirmation),
      "fileExport",
      "PokeRNGKit-Pokemon.zip",
    );
  const downloadBoxes = (request: import("./boxArchive").BoxArchiveRequest) =>
    downloadArchive(
      JSON.stringify(request),
      "boxArchive",
      "PokeRNGKit-Boxes.zip",
    );
  const downloadBoxBinary = (request: { box: number; all: boolean }) =>
    downloadArchive(
      JSON.stringify(request),
      "boxBinaryExport",
      request.all
        ? "PokeRNGKit-PC.bin"
        : `PokeRNGKit-Box-${request.box + 1}.bin`,
    );
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

  const readPokedex9a = async () => {
    let catalog: import("./zaPokedex").Dex9aCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex9a",
      );
      if (id !== operation.current) return;
      if (!result.pokedex9a)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex9a;
    });
    return catalog;
  };
  const readPokedex9 = async () => {
    let catalog: import("./svPokedex").Dex9Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex9",
      );
      if (id !== operation.current) return;
      if (!result.pokedex9)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex9;
    });
    return catalog;
  };
  const readPokedex8a = async () => {
    let catalog: import("./legendsPokedex").Dex8aCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex8a",
      );
      if (id !== operation.current) return;
      if (!result.pokedex8a)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex8a;
    });
    return catalog;
  };
  const readPokedex8 = async () => {
    let catalog: import("./swshPokedex").Dex8Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex8",
      );
      if (id !== operation.current) return;
      if (!result.pokedex8)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex8;
    });
    return catalog;
  };
  const readPokedex8b = async () => {
    let catalog: import("./bdspPokedex").Dex8bCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex8b",
      );
      if (id !== operation.current) return;
      if (!result.pokedex8b)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex8b;
    });
    return catalog;
  };
  const readPokedex7 = async () => {
    let catalog: import("./gen7Pokedex").Dex7Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex7",
      );
      if (id !== operation.current) return;
      if (!result.pokedex7)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex7;
    });
    return catalog;
  };
  const readPokedex6 = async () => {
    let catalog: import("./gen5Pokedex").Dex5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex6",
      );
      if (id !== operation.current) return;
      if (!result.pokedex6)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex6;
    });
    return catalog;
  };
  const readPokedex5 = async () => {
    let catalog: import("./gen5Pokedex").Dex5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex5",
      );
      if (id !== operation.current) return;
      if (!result.pokedex5)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex5;
    });
    return catalog;
  };
  const readPokedex4 = async () => {
    let catalog: import("./gen4Pokedex").Dex4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex4",
      );
      if (id !== operation.current) return;
      if (!result.pokedex4)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex4;
    });
    return catalog;
  };
  const readPokedex = async () => {
    let catalog: import("./simplePokedex").SimpleDexCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ fileName: name }),
        "pokedex",
      );
      if (id !== operation.current) return;
      if (!result.pokedex) throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex;
    });
    return catalog;
  };

  const readEvents = async () => {
    let catalog: import("./events").EventCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ language: batchLang }),
        "events",
      );
      if (id !== operation.current) return;
      if (!result.events) throw new Error("No event catalog was returned.");
      catalog = result.events;
    });
    return catalog;
  };
  const compareEvents = async (old: File, newer: File) => {
    let diff: import("./events").EventDiff | undefined;
    await perform(async (id) => {
      validateEventFiles([old, newer]);
      const files = await readBatchFiles(
        [newer],
        () => id === operation.current,
      );
      if (!files || id !== operation.current) return;
      const bytes = new Uint8Array(await old.arrayBuffer());
      if (id !== operation.current) return;
      const result = await client.current.run(
        bytes,
        JSON.stringify({ newData: files[0].data }),
        "eventsCompare",
      );
      if (id !== operation.current) return;
      if (!result.eventDiff)
        throw new Error("No event comparison was returned.");
      diff = result.eventDiff;
    });
    return diff;
  };
  const readGsBall2 = async () => {
    let catalog: import("./gsBall2").GsBall2Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "gsBall2",
      );
      if (id !== operation.current) return;
      if (!result.gsBall2) throw new Error("No GS Ball catalog was returned.");
      catalog = result.gsBall2;
    });
    return catalog;
  };
  const readHall3 = async (version?: number) => {
    let catalog: import("./hall3").Hall3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ version }),
        "hall3",
      );
      if (id !== operation.current) return;
      if (!result.hall3)
        throw new Error("No Hall of Fame catalog was returned.");
      catalog = result.hall3;
    });
    return catalog;
  };
  const readHall1 = async () => {
    let catalog: import("./hall1").Hall1Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "hall1",
      );
      if (id !== operation.current) return;
      if (!result.hall1)
        throw new Error("No Hall of Fame catalog was returned.");
      catalog = result.hall1;
    });
    return catalog;
  };
  const readEventReset = async () => {
    let catalog: import("./eventReset").EventResetCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ language: batchLang }),
        "eventReset",
      );
      if (id !== operation.current) return;
      if (!result.eventReset)
        throw new Error("No event reset catalog was returned.");
      catalog = result.eventReset;
    });
    return catalog;
  };
  const readFerry3 = async () => {
    let catalog: import("./ferry3").Ferry3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "ferry3",
      );
      if (id !== operation.current) return;
      if (!result.ferry3) throw new Error("No ferry3 catalog was returned.");
      catalog = result.ferry3;
    });
    return catalog;
  };

  const readMisc3 = async () => {
    let catalog: import("./misc3").Misc3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "misc3",
      );
      if (id !== operation.current) return;
      if (!result.misc3) throw new Error("No misc3 catalog was returned.");
      catalog = result.misc3;
    });
    return catalog;
  };

  const suggestSecretBase3 = async (
    query: import("./secretBase3").Base3FormQuery,
  ) => {
    let suggestion: import("./secretBase3").Base3FormSuggestion | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "secretBase3Form",
      );
      if (id !== operation.current) return;
      if (!result.secretBase3Form)
        throw new Error("No Gen3 secret base form preview returned.");
      suggestion = result.secretBase3Form;
    });
    return suggestion;
  };
  const readSecretBase3 = async () => {
    let catalog: import("./secretBase3").SecretBase3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "secretBase3",
      );
      if (id !== operation.current) return;
      if (!result.secretBase3)
        throw new Error("No secretBase3 catalog was returned.");
      catalog = result.secretBase3;
    });
    return catalog;
  };

  const readPokeGear4 = async () => {
    let catalog: import("./pokegear4").PokeGear4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokegear4",
      );
      if (id !== operation.current) return;
      if (!result.pokegear4)
        throw new Error("No pokegear4 catalog was returned.");
      catalog = result.pokegear4;
    });
    return catalog;
  };

  const readPokeathlon4 = async () => {
    let catalog: import("./pokeathlon4").Pokeathlon4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokeathlon4",
      );
      if (id !== operation.current) return;
      if (!result.pokeathlon4)
        throw new Error("No pokeathlon4 catalog was returned.");
      catalog = result.pokeathlon4;
    });
    return catalog;
  };

  const previewBattlePass4 = async (
    edit: import("./battlePass4").BattlePass4Edit,
  ) => {
    let catalog: import("./battlePass4").BattlePass4PokemonPreview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "battlePass4Preview",
      );
      if (id !== operation.current) return;
      if (!result.battlePassPreview)
        throw new Error("No battlePass4 catalog was returned.");
      catalog = result.battlePassPreview;
    });
    return catalog;
  };

  const readBattlePass4 = async (index: number) => {
    let catalog: import("./battlePass4").BattlePass4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ index }),
        "battlePass4",
      );
      if (id !== operation.current) return;
      if (!result.battlePass4)
        throw new Error("No battlePass4 catalog was returned.");
      catalog = result.battlePass4;
    });
    return catalog;
  };

  const readBrTrainer4 = async () => {
    let catalog: import("./brTrainer4").BrTrainer4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "brTrainer4",
      );
      if (id !== operation.current) return;
      if (!result.brTrainer4)
        throw new Error("No brTrainer4 catalog was returned.");
      catalog = result.brTrainer4;
    });
    return catalog;
  };

  const previewVideo4 = async (edit: import("./battleVideo4").Video4Import) => {
    let catalog: import("./battleVideo4").Video4Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "video4Preview",
      );
      if (id !== operation.current) return;
      if (!result.video4Preview)
        throw new Error("No battleVideo4 catalog was returned.");
      catalog = result.video4Preview;
    });
    return catalog;
  };

  const readBattleVideo4 = async (index: number) => {
    let catalog: import("./battleVideo4").Video4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ index }),
        "battleVideo4",
      );
      if (id !== operation.current) return;
      if (!result.battleVideo4)
        throw new Error("No battleVideo4 catalog was returned.");
      catalog = result.battleVideo4;
    });
    return catalog;
  };

  const readGeonet4 = async () => {
    let catalog: import("./geonet4").Geo4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "geonet4",
      );
      if (id !== operation.current) return;
      if (!result.geonet4) throw new Error("No geonet4 catalog was returned.");
      catalog = result.geonet4;
    });
    return catalog;
  };

  const previewMisc4 = async (edit: import("./misc4").Misc4Edit) => {
    let preview: import("./misc4").Misc4Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "misc4Preview",
      );
      if (id !== operation.current) return;
      if (!result.misc4Preview) throw Error("No Misc4 preview was returned.");
      preview = result.misc4Preview;
    });
    return preview;
  };

  const readMisc4 = async () => {
    let catalog: import("./misc4").Misc4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "misc4",
      );
      if (id !== operation.current) return;
      if (!result.misc4) throw new Error("No misc4 catalog was returned.");
      catalog = result.misc4;
    });
    return catalog;
  };

  const readMisc5 = async () => {
    let c: import("./misc5").Misc5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "misc5",
      );
      if (id !== operation.current) return;
      if (!result.misc5) throw Error("No Misc5 catalog was returned.");
      c = result.misc5;
    });
    return c;
  };
  const previewMisc5 = async (edit: import("./misc5").Misc5Edit) => {
    let p: import("./misc5").Misc5Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "misc5Preview",
      );
      if (id !== operation.current) return;
      if (!result.misc5Preview) throw Error("No Misc5 preview was returned.");
      p = result.misc5Preview;
    });
    return p;
  };
  const exportMisc5 = () =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "misc5Export",
      );
      if (id !== operation.current) return;
      if (!result.misc5File) throw Error("No Misc5 file was returned.");
      const url = URL.createObjectURL(new Blob([result.misc5File]));
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = "forest-city.fc5";
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    });

  const readMedals5 = async () => {
    let c: import("./medals5").Medals5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "medals5",
      );
      if (id !== operation.current) return;
      if (!result.medals5) throw Error("No Medals5 catalog was returned.");
      c = result.medals5;
    });
    return c;
  };
  const previewMedals5 = async (edit: import("./medals5").Medals5Edit) => {
    let p: import("./medals5").Medals5Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "medals5Preview",
      );
      if (id !== operation.current) return;
      if (!result.medals5Preview)
        throw Error("No Medals5 preview was returned.");
      p = result.medals5Preview;
    });
    return p;
  };
  const exportMedals5 = () =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "medals5Export",
      );
      if (id !== operation.current) return;
      if (!result.medals5File) throw Error("No Medals5 file was returned.");
      const url = URL.createObjectURL(new Blob([result.medals5File]));
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = "medals.ml5";
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    });

  const readBerryField6XY = async () => {
    let c: import("./berryField6xy").Berry6XYCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "berryField6xy",
      );
      if (id !== operation.current) return;
      if (!result.berryField6xy)
        throw Error("No BerryField6XY catalog was returned.");
      c = result.berryField6xy;
    });
    return c;
  };
  const readAvenue5 = async () => {
    let c: import("./avenue5").Avenue5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "avenue5",
      );
      if (id !== operation.current) return;
      if (!result.avenue5) throw Error("No Avenue5 catalog was returned.");
      c = result.avenue5;
    });
    return c;
  };
  const previewAvenue5 = async (edit: import("./avenue5").Avenue5Edit) => {
    let p: import("./avenue5").Avenue5Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "avenue5Preview",
      );
      if (id !== operation.current) return;
      if (!result.avenue5Preview)
        throw Error("No Avenue5 preview was returned.");
      p = result.avenue5Preview;
    });
    return p;
  };
  const exportAvenue5 = (
    edit: import("./avenue5").Avenue5Edit,
    extension: string,
  ) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "avenue5Export",
      );
      if (id !== operation.current) return;
      if (!result.avenue5File) throw Error("No Avenue5 file was returned.");
      const url = URL.createObjectURL(new Blob([result.avenue5File]));
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download =
          "join-avenue-" +
          edit.group +
          "-" +
          (edit.index + 1) +
          "." +
          extension;
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    });
  const readHall6 = async () => {
    let c: import("./hall6").Hall6Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "hall6",
      );
      if (id !== operation.current) return;
      if (!result.hall6) throw Error("No Hall6 catalog was returned.");
      c = result.hall6;
    });
    return c;
  };
  const previewHall6 = async (edit: import("./hall6").Hall6Edit) => {
    let p: import("./hall6").Hall6Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "hall6Preview",
      );
      if (id !== operation.current) return;
      if (!result.hall6Preview) throw Error("No Hall6 preview was returned.");
      p = result.hall6Preview;
    });
    return p;
  };
  const readHall7 = async () => {
    let c: import("./hall7").Hall7Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "hall7",
      );
      if (id !== operation.current) return;
      if (!result.hall7) throw Error("No Hall7 catalog was returned.");
      c = result.hall7;
    });
    return c;
  };
  const previewHall7 = async (edit: import("./hall7").Hall7Edit) => {
    let p: import("./hall7").Hall7Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "hall7Preview",
      );
      if (id !== operation.current) return;
      if (!result.hall7Preview) throw Error("No Hall7 preview was returned.");
      p = result.hall7Preview;
    });
    return p;
  };
  const readZygarde7 = async () => {
    let c: import("./zygarde7").Zygarde7Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "zygarde7",
      );
      if (id !== operation.current) return;
      if (!result.zygarde7) throw Error("No Zygarde7 catalog was returned.");
      c = result.zygarde7;
    });
    return c;
  };
  const previewZygarde7 = async (edit: import("./zygarde7").Zygarde7Edit) => {
    let p: import("./zygarde7").Zygarde7Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "zygarde7Preview",
      );
      if (id !== operation.current) return;
      if (!result.zygarde7Preview)
        throw Error("No Zygarde7 preview was returned.");
      p = result.zygarde7Preview;
    });
    return p;
  };
  const readSevenStar9 = async (query: import("./sevenstar9").R7Query) => {
    let page: import("./sevenstar9").R7Page | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "sevenstar9",
      );
      if (id !== operation.current) return;
      if (!isSevenStar9Page(result.sevenstar9))
        throw Error("SevenStar9 page missing or invalid.");
      page = result.sevenstar9;
    });
    return page;
  };
  const previewSevenStar9 = async (edit: import("./sevenstar9").R7Edit) => {
    let ticket: import("./sevenstar9").R7Ticket | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const source = working.current;
      const result = await client.current.run(
        source,
        JSON.stringify(edit),
        "sevenstar9Preview",
      );
      if (id !== operation.current) {
        if (result.sevenstar9Ticket) {
          try {
            await client.current.run(
              source,
              result.sevenstar9Ticket.token,
              "sevenstar9Discard",
            );
          } catch {
            /* Disposal has released the preview. */
          }
        }
        return;
      }
      if (!result.sevenstar9Ticket) throw Error("SevenStar9 preview missing.");
      ticket = result.sevenstar9Ticket;
    });
    return ticket;
  };
  const discardSevenStar9 = async (token: string) => {
    try {
      if (working.current)
        await client.current.run(working.current, token, "sevenstar9Discard");
    } catch {
      /* Disposal has released the preview. */
    }
  };
  const readRaid9 = async () => {
    let catalog: import("./raid9").R9Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "raid9",
      );
      if (id !== operation.current) return;
      if (!isRaid9Catalog(result.raid9))
        throw Error("Raid9 catalog missing or invalid.");
      catalog = result.raid9;
    });
    return catalog;
  };
  const previewRaid9 = async (edit: import("./raid9").R9Edit) => {
    let ticket: import("./raid9").R9Ticket | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const source = working.current;
      const result = await client.current.run(
        source,
        JSON.stringify(edit),
        "raid9Preview",
      );
      if (id !== operation.current) {
        if (result.raid9Ticket) {
          try {
            await client.current.run(
              source,
              result.raid9Ticket.token,
              "raid9Discard",
            );
          } catch {
            /* A disposed Worker has already released its preview. */
          }
        }
        return;
      }
      if (!result.raid9Ticket) throw Error("Raid9 preview missing.");
      ticket = result.raid9Ticket;
    });
    return ticket;
  };
  const discardRaid9 = async (token: string) => {
    try {
      if (working.current)
        await client.current.run(working.current, token, "raid9Discard");
    } catch {
      /* A disposed Worker has already released its preview. */
    }
  };
  const readFashion9 = async (query: import("./fashion9").F9ReadQuery) => {
    let page: import("./fashion9").F9Page | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "fashion9",
      );
      if (id !== operation.current) return;
      if (!isFashion9Page(result.fashion9))
        throw Error("Fashion9 page missing or invalid.");
      page = result.fashion9;
    });
    return page;
  };
  const previewFashion9 = async (edit: import("./fashion9").F9Edit) => {
    let ticket: import("./fashion9").F9Ticket | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const source = working.current;
      const result = await client.current.run(
        source,
        JSON.stringify(edit),
        "fashion9Preview",
      );
      if (id !== operation.current) {
        if (result.fashion9Ticket) {
          try {
            await client.current.run(
              source,
              result.fashion9Ticket.token,
              "fashion9Discard",
            );
          } catch {
            /* A disposed Worker has already released its preview. */
          }
        }
        return;
      }
      if (!result.fashion9Ticket) throw Error("Fashion9 preview missing.");
      ticket = result.fashion9Ticket;
    });
    return ticket;
  };
  const discardFashion9 = async (token: string) => {
    try {
      if (working.current)
        await client.current.run(working.current, token, "fashion9Discard");
    } catch {
      /* A disposed Worker has already released its preview. */
    }
  };
  const readEvent9a = async (query: import("./event9a").Ew9aReadQuery) => {
    let page: import("./event9a").Ew9aPage | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "event9a",
      );
      if (id !== operation.current) return;
      if (!result.event9a) throw Error("Event9a page missing.");
      page = result.event9a;
    });
    return page;
  };
  const previewEvent9a = async (edit: import("./event9a").Ew9aEdit) => {
    let ticket: import("./event9a").Ew9aTicket | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "event9aPreview",
      );
      if (id !== operation.current) return;
      if (!result.event9aTicket) throw Error("Event9a preview missing.");
      ticket = result.event9aTicket;
    });
    return ticket;
  };
  const discardEvent9a = async (token: string) => {
    try {
      if (working.current)
        await client.current.run(working.current, token, "event9aDiscard");
    } catch {
      /* Disposed Workers have already released their preview. */
    }
  };
  const compareEvent9a = async (old: File, newer: File, names: string) => {
    let comparison: import("./event9a").Ew9aComparison | undefined;
    await perform(async (id) => {
      if (
        [old, newer].some(
          (file) =>
            !Number.isSafeInteger(file.size) ||
            file.size < 1 ||
            file.size > MAX_SAVE_BYTES,
        )
      )
        throw Error(
          "Event9a comparison files must be between 1 byte and 32 MiB.",
        );
      const files = await readBatchFiles(
        [newer],
        () => id === operation.current,
      );
      if (!files || id !== operation.current) return;
      const bytes = new Uint8Array(await old.arrayBuffer());
      if (id !== operation.current) return;
      const result = await client.current.run(
        bytes,
        JSON.stringify({ updatedData: files[0].data, names }),
        "event9aCompare",
      );
      if (id !== operation.current) return;
      if (!result.event9aComparison) throw Error("Event9a comparison missing.");
      comparison = result.event9aComparison;
    });
    return comparison;
  };
  const readDonut9a = async () => {
    let c: import("./donut9a").Dn9aCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "donut9a",
      );
      if (id !== operation.current) return;
      if (!result.donut9a) throw Error("No Donut9a catalog was returned.");
      c = result.donut9a;
    });
    return c;
  };
  const previewDonut9a = async (edit: import("./donut9a").Dn9aEdit) => {
    let p: import("./donut9a").Dn9aTicket | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "donut9aPreview",
      );
      if (id !== operation.current) return;
      if (!result.donut9aTicket)
        throw Error("No Donut9a preview was returned.");
      p = result.donut9aTicket;
    });
    return p;
  };
  const discardDonut9a = async (token: string) => {
    try {
      if (working.current)
        await client.current.run(working.current, token, "donut9aDiscard");
    } catch {
      /* A disposed/replaced Worker has already released its preview. */
    }
  };
  const exportDonut9a = async (index: number, text: boolean) => {
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        String(index),
        "donut9aExport",
      );
      if (id !== operation.current) return;
      if (!result.donut9aFile) throw Error("No Donut9a export was returned.");
      const value = text
        ? new TextEncoder().encode(
            Array.from(result.donut9aFile, (b) =>
              b.toString(16).toUpperCase().padStart(2, "0"),
            ).join(" "),
          )
        : result.donut9aFile;
      const url = URL.createObjectURL(
        new Blob([value], {
          type: text ? "text/plain;charset=utf-8" : "application/octet-stream",
        }),
      );
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download =
          String(index + 1).padStart(3, "0") + (text ? ".donut.txt" : ".donut");
        a.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  };
  const readTrainer8 = async () => {
    let c: import("./trainer8").Tr8Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "trainer8",
      );
      if (id !== operation.current) return;
      if (!result.trainer8) throw Error("No Trainer8 catalog was returned.");
      c = result.trainer8;
    });
    return c;
  };
  const previewTrainer8 = async (edit: import("./trainer8").Tr8Edit) => {
    let p: import("./trainer8").Tr8Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "trainer8Preview",
      );
      if (id !== operation.current) return;
      if (!result.trainer8Preview)
        throw Error("No Trainer8 preview was returned.");
      p = result.trainer8Preview;
    });
    return p;
  };
  const readTrainer8a = async () => {
    let c: import("./trainer8a").Tr8aCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "trainer8a",
      );
      if (id !== operation.current) return;
      if (!result.trainer8a) throw Error("No Trainer8a catalog was returned.");
      c = result.trainer8a;
    });
    return c;
  };
  const previewTrainer8a = async (edit: import("./trainer8a").Tr8aEdit) => {
    let p: import("./trainer8a").Tr8aPreview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "trainer8aPreview",
      );
      if (id !== operation.current) return;
      if (!result.trainer8aPreview)
        throw Error("No Trainer8a preview was returned.");
      p = result.trainer8aPreview;
    });
    return p;
  };
  const readTrainer8b = async () => {
    let c: import("./trainer8b").Tr8bCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "trainer8b",
      );
      if (id !== operation.current) return;
      if (!result.trainer8b) throw Error("No Trainer8b catalog was returned.");
      c = result.trainer8b;
    });
    return c;
  };
  const previewTrainer8b = async (edit: import("./trainer8b").Tr8bEdit) => {
    let p: import("./trainer8b").Tr8bPreview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "trainer8bPreview",
      );
      if (id !== operation.current) return;
      if (!result.trainer8bPreview)
        throw Error("No Trainer8b preview was returned.");
      p = result.trainer8bPreview;
    });
    return p;
  };
  const readRaid8 = async () => {
    let c: import("./raid8").Raid8Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "raid8",
      );
      if (id !== operation.current) return;
      if (!result.raid8) throw Error("No Raid8 catalog was returned.");
      c = result.raid8;
    });
    return c;
  };
  const previewRaid8 = async (edit: import("./raid8").Raid8Edit) => {
    let p: import("./raid8").Raid8Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "raid8Preview",
      );
      if (id !== operation.current) return;
      if (!result.raid8Preview) throw Error("No Raid8 preview was returned.");
      p = result.raid8Preview;
    });
    return p;
  };
  const readUnderground8b = async () => {
    let c: import("./underground8b").Ug8bCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "underground8b",
      );
      if (id !== operation.current) return;
      if (!result.underground8b)
        throw Error("No Underground8b catalog was returned.");
      c = result.underground8b;
    });
    return c;
  };
  const previewUnderground8b = async (
    edit: import("./underground8b").Ug8bEdit,
  ) => {
    let p: import("./underground8b").Ug8bPreview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "underground8bPreview",
      );
      if (id !== operation.current) return;
      if (!result.underground8bPreview)
        throw Error("No Underground8b preview was returned.");
      p = result.underground8bPreview;
    });
    return p;
  };
  const readSeal8b = async () => {
    let c: import("./seal8b").Seal8bCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "seal8b",
      );
      if (id !== operation.current) return;
      if (!result.seal8b) throw Error("No Seal8b catalog was returned.");
      c = result.seal8b;
    });
    return c;
  };
  const previewSeal8b = async (edit: import("./seal8b").Seal8bEdit) => {
    let p: import("./seal8b").Seal8bPreview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "seal8bPreview",
      );
      if (id !== operation.current) return;
      if (!result.seal8bPreview) throw Error("No Seal8b preview was returned.");
      p = result.seal8bPreview;
    });
    return p;
  };
  const readMisc8b = async () => {
    let c: import("./misc8b").Misc8bCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "misc8b",
      );
      if (id !== operation.current) return;
      if (!result.misc8b) throw Error("No Misc8b catalog was returned.");
      c = result.misc8b;
    });
    return c;
  };
  const previewMisc8b = async (edit: import("./misc8b").Misc8bEdit) => {
    let p: import("./misc8b").Misc8bPreview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "misc8bPreview",
      );
      if (id !== operation.current) return;
      if (!result.misc8bPreview) throw Error("No Misc8b preview was returned.");
      p = result.misc8bPreview;
    });
    return p;
  };
  const readTrainerGG = async () => {
    let c: import("./trainerGG").TrGGCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "trainerGG",
      );
      if (id !== operation.current) return;
      if (!result.trainerGG) throw Error("No TrainerGG catalog was returned.");
      c = result.trainerGG;
    });
    return c;
  };
  const previewTrainerGG = async (edit: import("./trainerGG").TrGGEdit) => {
    let p: import("./trainerGG").TrGGPreview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "trainerGGPreview",
      );
      if (id !== operation.current) return;
      if (!result.trainerGGPreview)
        throw Error("No TrainerGG preview was returned.");
      p = result.trainerGGPreview;
    });
    return p;
  };
  const exportTrainerGG = async (index?: number) => {
    let downloaded = false;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        index === undefined ? undefined : String(index),
        index === undefined ? "trainerGGArchive" : "trainerGGExport",
      );
      if (id !== operation.current) return;
      const file = result.goParkFiles?.[0];
      const data =
        index === undefined
          ? result.archive
          : file
            ? Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0))
            : undefined;
      if (!data) throw Error("TrainerGG export is missing.");
      const url = URL.createObjectURL(
        new Blob([data], {
          type:
            index === undefined
              ? "application/zip"
              : "application/octet-stream",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = index === undefined ? "PokeRNGKit-GO-Park.zip" : file!.name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      downloaded = true;
    });
    return downloaded;
  };
  const readTrainer7 = async () => {
    let c: import("./trainer7").Tr7Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "trainer7",
      );
      if (id !== operation.current) return;
      if (!result.trainer7) throw Error("No Trainer7 catalog was returned.");
      c = result.trainer7;
    });
    return c;
  };
  const previewTrainer7 = async (edit: import("./trainer7").Tr7Edit) => {
    let p: import("./trainer7").Tr7Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "trainer7Preview",
      );
      if (id !== operation.current) return;
      if (!result.trainer7Preview)
        throw Error("No Trainer7 preview was returned.");
      p = result.trainer7Preview;
    });
    return p;
  };
  const readTrainer6 = async () => {
    let c: import("./trainer6").Tr6Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "trainer6",
      );
      if (id !== operation.current) return;
      if (!result.trainer6) throw Error("No Trainer6 catalog was returned.");
      c = result.trainer6;
    });
    return c;
  };
  const previewTrainer6 = async (edit: import("./trainer6").Tr6Edit) => {
    let p: import("./trainer6").Tr6Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "trainer6Preview",
      );
      if (id !== operation.current) return;
      if (!result.trainer6Preview)
        throw Error("No Trainer6 preview was returned.");
      p = result.trainer6Preview;
    });
    return p;
  };
  const readSuperTrain6 = async () => {
    let c: import("./superTrain6").St6Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "superTrain6",
      );
      if (id !== operation.current) return;
      if (!result.superTrain6)
        throw Error("No SuperTrain6 catalog was returned.");
      c = result.superTrain6;
    });
    return c;
  };
  const previewSuperTrain6 = async (edit: import("./superTrain6").St6Edit) => {
    let p: import("./superTrain6").St6Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "superTrain6Preview",
      );
      if (id !== operation.current) return;
      if (!result.superTrain6Preview)
        throw Error("No SuperTrain6 preview was returned.");
      p = result.superTrain6Preview;
    });
    return p;
  };
  const readLink6 = async () => {
    let c: import("./link6").Link6Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "link6",
      );
      if (id !== operation.current) return;
      if (!result.link6) throw Error("No Link6 catalog was returned.");
      c = result.link6;
    });
    return c;
  };
  const previewLink6 = async (edit: import("./link6").Link6Edit) => {
    let p: import("./link6").Link6Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "link6Preview",
      );
      if (id !== operation.current) return;
      if (!result.link6Preview) throw Error("No Link6 preview was returned.");
      p = result.link6Preview;
    });
    return p;
  };
  const exportLink6 = (edit: import("./link6").Link6Edit) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "link6Export",
      );
      if (id !== operation.current) return;
      if (!result.link6File) throw Error("No Link6 file was returned.");
      const url = URL.createObjectURL(new Blob([result.link6File]));
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = "pokemon-link.pl6";
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    });
  const readSecretBase6 = async () => {
    let c: import("./secretBase6").Sb6Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "secretBase6",
      );
      if (id !== operation.current) return;
      if (!result.secretBase6)
        throw Error("No SecretBase6 catalog was returned.");
      c = result.secretBase6;
    });
    return c;
  };
  const previewSecretBase6 = async (edit: import("./secretBase6").Sb6Edit) => {
    let p: import("./secretBase6").Sb6Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "secretBase6Preview",
      );
      if (id !== operation.current) return;
      if (!result.secretBase6Preview)
        throw Error("No SecretBase6 preview was returned.");
      p = result.secretBase6Preview;
    });
    return p;
  };
  const exportSecretBase6 = (
    edit: import("./secretBase6").Sb6Edit,
    fileName: string,
  ) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "secretBase6Export",
      );
      if (id !== operation.current) return;
      if (!result.secretBase6File)
        throw Error("No SecretBase6 file was returned.");
      const url = URL.createObjectURL(new Blob([result.secretBase6File]));
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    });
  const readUnityTower5 = async () => {
    let c: import("./unityTower5").Tower5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "unityTower5",
      );
      if (id !== operation.current) return;
      if (!result.unityTower5)
        throw Error("No UnityTower5 catalog was returned.");
      c = result.unityTower5;
    });
    return c;
  };
  const previewUnityTower5 = async (
    edit: import("./unityTower5").Tower5Edit,
  ) => {
    let p: import("./unityTower5").Tower5Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "unityTower5Preview",
      );
      if (id !== operation.current) return;
      if (!result.unityTower5Preview)
        throw Error("No UnityTower5 preview was returned.");
      p = result.unityTower5Preview;
    });
    return p;
  };
  const readGlobalLink5 = async () => {
    let c: import("./globalLink5").Gl5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "globalLink5",
      );
      if (id !== operation.current) return;
      if (!result.globalLink5)
        throw Error("No GlobalLink5 catalog was returned.");
      c = result.globalLink5;
    });
    return c;
  };
  const previewGlobalLink5 = async (edit: import("./globalLink5").Gl5Edit) => {
    let p: import("./globalLink5").Gl5Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "globalLink5Preview",
      );
      if (id !== operation.current) return;
      if (!result.globalLink5Preview)
        throw Error("No GlobalLink5 preview was returned.");
      p = result.globalLink5Preview;
    });
    return p;
  };
  const readDlc5 = async () => {
    let c: import("./dlc5").Dlc5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "dlc5",
      );
      if (id !== operation.current) return;
      if (!result.dlc5) throw Error("No Dlc5 catalog was returned.");
      c = result.dlc5;
    });
    return c;
  };
  const previewDlc5 = async (edit: import("./dlc5").Dlc5Edit) => {
    let p: import("./dlc5").Dlc5Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "dlc5Preview",
      );
      if (id !== operation.current) return;
      if (!result.dlc5Preview) throw Error("No Dlc5 preview was returned.");
      p = result.dlc5Preview;
    });
    return p;
  };
  const exportDlc5 = (query: import("./dlc5").Dlc5Export) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "dlc5Export",
      );
      if (id !== operation.current) return;
      if (!result.dlc5File) throw Error("No Dlc5 file was returned.");
      const binary = atob(result.dlc5File.data),
        bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes]));
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = result.dlc5File.fileName;
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    });
  const readCGear5 = async () => {
    let catalog: import("./cgear5").CGear5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "cgear5",
      );
      if (id !== operation.current) return;
      if (!result.cgear5) throw Error("No CGear5 catalog was returned.");
      catalog = result.cgear5;
    });
    return catalog;
  };
  const previewCGear5 = async (edit: import("./cgear5").CGear5Edit) => {
    let preview: import("./cgear5").CGear5Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "cgear5Preview",
      );
      if (id !== operation.current) return;
      if (!result.cgear5Preview) throw Error("No CGear5 preview was returned.");
      preview = result.cgear5Preview;
    });
    return preview;
  };
  const exportCGear5 = (extension: string) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "cgear5Export",
      );
      if (id !== operation.current) return;
      if (!result.cgear5File) throw Error("No CGear5 file was returned.");
      const url = URL.createObjectURL(new Blob([result.cgear5File]));
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = "C-Gear." + extension;
        a.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    });

  const previewUnderground4 = async (
    edit: import("./underground4").Ug4Edit,
  ) => {
    let preview: import("./underground4").Ug4Preview | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "underground4Preview",
      );
      if (id !== operation.current) return;
      if (!result.underground4Preview)
        throw Error("No Underground4 preview was returned.");
      preview = result.underground4Preview;
    });
    return preview;
  };

  const readUnderground4 = async () => {
    let catalog: import("./underground4").Ug4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "underground4",
      );
      if (id !== operation.current) return;
      if (!result.underground4)
        throw new Error("No underground4 catalog was returned.");
      catalog = result.underground4;
    });
    return catalog;
  };

  const readHoneyTree4 = async () => {
    let catalog: import("./honeyTree4").Honey4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "honeyTree4",
      );
      if (id !== operation.current) return;
      if (!result.honeyTree4)
        throw new Error("No honeyTree4 catalog was returned.");
      catalog = result.honeyTree4;
    });
    return catalog;
  };

  const readBr4Gear = async () => {
    let catalog: import("./br4").Br4GearCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "br4Gear",
      );
      if (id !== operation.current) return;
      if (!result.br4Gear) throw new Error("No br4Gear catalog was returned.");
      catalog = result.br4Gear;
    });
    return catalog;
  };

  const readJoyful3 = async () => {
    let catalog: import("./joyful3").Joyful3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "joyful3",
      );
      if (id !== operation.current) return;
      if (!result.joyful3) throw new Error("No joyful3 catalog was returned.");
      catalog = result.joyful3;
    });
    return catalog;
  };

  const readFrontier3 = async () => {
    let catalog: import("./frontier3").Frontier3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "frontier3",
      );
      if (id !== operation.current) return;
      if (!result.frontier3)
        throw new Error("No frontier3 catalog was returned.");
      catalog = result.frontier3;
    });
    return catalog;
  };

  const readGameRecords3 = async () => {
    let catalog: import("./gameRecords3").GameRecord3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "gameRecords3",
      );
      if (id !== operation.current) return;
      if (!result.gameRecords3)
        throw new Error("No gameRecords3 catalog was returned.");
      catalog = result.gameRecords3;
    });
    return catalog;
  };

  const readPaintings3 = async () => {
    let catalog: import("./paintings3").Painting3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "paintings3",
      );
      if (id !== operation.current) return;
      if (!result.paintings3)
        throw new Error("No paintings3 catalog was returned.");
      catalog = result.paintings3;
    });
    return catalog;
  };

  const readDecorations3 = async () => {
    let catalog: import("./decorations3").Decoration3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "decorations3",
      );
      if (id !== operation.current) return;
      if (!result.decorations3)
        throw new Error("No decorations3 catalog was returned.");
      catalog = result.decorations3;
    });
    return catalog;
  };

  const readRoamer3 = async () => {
    let catalog: import("./roamer3").Roamer3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "roamer3",
      );
      if (id !== operation.current) return;
      if (!result.roamer3) throw new Error("No roamer3 catalog was returned.");
      catalog = result.roamer3;
    });
    return catalog;
  };

  const readRoamer = async () => {
    let catalog: import("./roamer").RoamerCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "roamer",
      );
      if (id !== operation.current) return;
      if (!result.roamer) throw new Error("No roamer catalog was returned.");
      catalog = result.roamer;
    });
    return catalog;
  };

  const readRtc = async () => {
    let catalog: import("./rtc").RtcCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "rtc",
      );
      if (id !== operation.current) return;
      if (!result.rtc) throw new Error("No clock catalog was returned.");
      catalog = result.rtc;
    });
    return catalog;
  };

  const readOPowers = async () => {
    let catalog: import("./opowers").OPowerCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "opowers",
      );
      if (id !== operation.current) return;
      if (!result.opowers) throw new Error("No O-Power catalog was returned.");
      catalog = result.opowers;
    });
    return catalog;
  };

  const readFood = async () => {
    let catalog: import("./saveFood").SaveFoodCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "food",
      );
      if (id !== operation.current) return;
      if (!result.food) throw new Error("No food catalog was returned.");
      catalog = result.food;
    });
    return catalog;
  };

  const readMailbox = async () => {
    let catalog: import("./mailbox").MailCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "mailbox",
      );
      if (id !== operation.current) return;
      if (!result.mailbox) throw new Error("Mailbox catalog was not returned.");
      catalog = result.mailbox;
    });
    return catalog;
  };
  const discardMailbox = async (token: string) => {
    if (!working.current) return;
    await client.current
      .run(working.current, token, "mailboxDiscard")
      .catch(() => undefined);
  };
  const previewMailbox = async (edit: import("./mailbox").MailRequest) => {
    let ticket: import("./mailbox").MailTicket | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "mailboxPreview",
      );
      if (id !== operation.current) {
        if (result.mailboxPreview)
          await discardMailbox(result.mailboxPreview.token);
        return;
      }
      if (!result.mailboxPreview)
        throw new Error("Mailbox preview was not returned.");
      ticket = result.mailboxPreview;
    });
    return ticket;
  };
  const applyMailbox = async (edit: MailConfirmation) => {
    let applied = false;
    await applyWorkingEdit(edit, "mailboxCommit", () => {
      applied = true;
    });
    return applied;
  };
  const readChatter = async () => {
    let catalog: import("./chatter").ChatterCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "chatter",
      );
      if (id !== operation.current) return;
      if (!result.chatter) throw new Error("Chatter catalog was not returned.");
      catalog = result.chatter;
    });
    return catalog;
  };
  const discardChatter = async (token: string) => {
    if (!working.current) return;
    await client.current
      .run(working.current, token, "chatterDiscard")
      .catch(() => undefined);
  };
  const previewChatter = async (edit: import("./chatter").ChatterRequest) => {
    let ticket: import("./chatter").ChatterTicket | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(edit),
        "chatterPreview",
      );
      if (id !== operation.current) {
        if (result.chatterPreview)
          await discardChatter(result.chatterPreview.token);
        return;
      }
      if (!result.chatterPreview)
        throw new Error("Chatter preview was not returned.");
      ticket = result.chatterPreview;
    });
    return ticket;
  };
  const applyChatter = async (edit: ChatterConfirmation) => {
    let applied = false;
    await applyWorkingEdit(edit, "chatterCommit", () => {
      applied = true;
    });
    return applied;
  };
  const readRegisteredGroups = async () => {
    let catalog:
      import("./registeredGroups").RegisteredGroupCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "registeredGroups",
      );
      if (id !== operation.current) return;
      if (!result.registeredGroups)
        throw new Error("Registered teams were not returned.");
      catalog = result.registeredGroups;
    });
    return catalog;
  };
  const analyzeRegisteredGroup = async (position: RegisteredGroupPosition) => {
    let analysis:
      import("./registeredGroups").RegisteredGroupAnalysis | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "registeredGroupAnalyze",
      );
      if (id !== operation.current) return;
      if (!result.registeredGroupAnalysis)
        throw new Error("Registered team analysis was not returned.");
      analysis = result.registeredGroupAnalysis;
    });
    return analysis;
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
      | MailConfirmation
      | ChatterConfirmation
      | PokemonEdit
      | PokemonRawEdit
      | BoxEdit
      | import("./propertyBatch").PropertyBatchConfirmation
      | import("./boxImport").BoxImportConfirmation
      | import("./domain").BagEdit
      | import("./domain").BagOperation
      | import("./zaPokedex").Dex9aEdit
      | import("./svPokedex").Dex9Edit
      | import("./legendsPokedex").Dex8aEdit
      | import("./swshPokedex").Dex8Edit
      | import("./bdspPokedex").Dex8bEdit
      | import("./gen7Pokedex").Dex7Edit
      | import("./gen5Pokedex").Dex5Edit
      | import("./gen4Pokedex").Dex4Edit
      | import("./simplePokedex").SimpleDexEdit
      | import("./events").EventEdit
      | import("./gsBall2").GsBall2Edit
      | import("./hall3").Hall3Edit
      | import("./hall1").Hall1Edit
      | import("./eventReset").EventResetEdit
      | import("./ferry3").Ferry3Edit
      | import("./misc3").Misc3Edit
      | import("./secretBase3").SecretBase3Edit
      | import("./pokegear4").PokeGear4Edit
      | import("./pokeathlon4").Pokeathlon4Edit
      | import("./battlePass4").BattlePass4Edit
      | import("./brTrainer4").BrTrainer4Edit
      | import("./battleVideo4").Video4Import
      | import("./geonet4").Geo4Edit
      | import("./misc4").Misc4Edit
      | import("./misc5").Misc5Edit
      | import("./medals5").Medals5Edit
      | import("./avenue5").Avenue5Edit
      | import("./sevenstar9").R7Confirmation
      | import("./raid9").R9Confirmation
      | import("./fashion9").F9Confirmation
      | import("./event9a").Ew9aConfirmation
      | import("./donut9a").Dn9aConfirmation
      | import("./trainer8").Tr8Edit
      | import("./trainer8a").Tr8aEdit
      | import("./trainer8b").Tr8bEdit
      | import("./raid8").Raid8Edit
      | import("./underground8b").Ug8bEdit
      | import("./seal8b").Seal8bEdit
      | import("./misc8b").Misc8bEdit
      | import("./trainerGG").TrGGEdit
      | import("./trainer7").Tr7Edit
      | import("./trainer6").Tr6Edit
      | import("./zygarde7").Zygarde7Edit
      | import("./hall7").Hall7Edit
      | import("./superTrain6").St6Edit
      | import("./secretBase6").Sb6Edit
      | import("./link6").Link6Edit
      | import("./hall6").Hall6Edit
      | import("./unityTower5").Tower5Edit
      | import("./globalLink5").Gl5Edit
      | import("./dlc5").Dlc5Edit
      | import("./cgear5").CGear5Edit
      | import("./underground4").Ug4Edit
      | import("./honeyTree4").Honey4Edit
      | import("./br4").Br4GearEdit
      | import("./joyful3").Joyful3Edit
      | import("./frontier3").Frontier3Edit
      | import("./gameRecords3").GameRecord3Edit
      | import("./paintings3").Painting3Edit
      | import("./decorations3").Decoration3Edit
      | import("./roamer3").Roamer3Edit
      | import("./roamer").RoamerEdit
      | import("./rtc").RtcEdit
      | import("./opowers").OPowerEdit
      | import("./saveFood").SaveFoodEdit
      | import("./domain").SaveRecordEdit
      | ReturnType<typeof validateTrainer>
      | StorageEdit
      | (() => Promise<PokemonImport | ReturnType<typeof validateTrainer>>),
    kind:
      | "mailboxCommit"
      | "chatterCommit"
      | "boxBinaryCommit"
      | "boxImportCommit"
      | "propertyCommit"
      | "pokemon"
      | "pokemonRaw"
      | "box"
      | "storage"
      | "pokemonImport"
      | "inventoryEdit"
      | "inventoryBatch"
      | "pokedex9aEdit"
      | "pokedex9Edit"
      | "pokedex8aEdit"
      | "pokedex8Edit"
      | "pokedex8bEdit"
      | "pokedex7Edit"
      | "pokedex6Edit"
      | "pokedex5Edit"
      | "pokedex4Edit"
      | "pokedexEdit"
      | "eventsEdit"
      | "gsBall2Edit"
      | "hall3Edit"
      | "hall1Edit"
      | "eventResetEdit"
      | "ferry3Edit"
      | "misc3Edit"
      | "secretBase3Edit"
      | "pokegear4Edit"
      | "pokeathlon4Edit"
      | "battlePass4Edit"
      | "brTrainer4Edit"
      | "video4Import"
      | "geonet4Edit"
      | "misc4Edit"
      | "misc5Edit"
      | "medals5Edit"
      | "avenue5Edit"
      | "sevenstar9Commit"
      | "raid9Commit"
      | "fashion9Commit"
      | "event9aCommit"
      | "donut9aCommit"
      | "trainer8Edit"
      | "trainer8aEdit"
      | "trainer8bEdit"
      | "raid8Edit"
      | "underground8bEdit"
      | "seal8bEdit"
      | "misc8bEdit"
      | "trainerGGEdit"
      | "trainer7Edit"
      | "trainer6Edit"
      | "zygarde7Edit"
      | "hall7Edit"
      | "superTrain6Edit"
      | "secretBase6Edit"
      | "link6Edit"
      | "hall6Edit"
      | "unityTower5Edit"
      | "globalLink5Edit"
      | "dlc5Edit"
      | "cgear5Edit"
      | "underground4Edit"
      | "honeyTree4Edit"
      | "br4GearEdit"
      | "joyful3Edit"
      | "frontier3Edit"
      | "gameRecords3Edit"
      | "paintings3Edit"
      | "decorations3Edit"
      | "roamer3Edit"
      | "roamerEdit"
      | "rtcEdit"
      | "opowersEdit"
      | "foodEdit"
      | "recordEdit"
      | "trainer",
    onApplied?: () => void,
  ) => {
    return perform(async (id) => {
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
      onApplied?.();
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
  };
  const importPokemon = (position: PokemonPosition, file: File) =>
    applyWorkingEdit(async () => {
      if (!file.size || file.size > 1024 * 1024)
        throw new Error("Entity file size is invalid.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return { ...position, fileName: file.name, data: btoa(binary) };
    }, "pokemonImport");

  const exportVideo4 = (index: number, decrypted: boolean) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ index, decrypted }),
        "video4Export",
      );
      if (id !== operation.current) return;
      if (!result.video4File) throw new Error("Entity file export failed.");
      const bytes = Uint8Array.from(atob(result.video4File.data), (char) =>
        char.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/octet-stream" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.video4File.fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    });

  const exportBattlePass4 = (index: number, slot?: number) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ index, slot }),
        "battlePass4Export",
      );
      if (id !== operation.current) return;
      if (!result.battlePassFile) throw new Error("Entity file export failed.");
      const bytes = Uint8Array.from(atob(result.battlePassFile.data), (char) =>
        char.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/octet-stream" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.battlePassFile.fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    });

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
      const result = await client.current.run(
        bytes,
        undefined,
        "inspectWorking",
      );
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

  const selectBRPlayer = (profile: number) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(br4Profile(profile)),
        "brProfile",
      );
      if (id !== operation.current) return;
      setReport(result.report);
      setDraft(trainerDraft(result.report));
      setLegality(undefined);
      setWorkingRevision((previous) => previous + 1);
      setFileRevision((previous) => previous + 1);
    });

  const profileLinkPanel = report ? (
    <section className="save-editor-profile" aria-label={t("profile")}>
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
                    {words.games[game as keyof typeof words.games] ?? game}
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
                  onChange={(e) => setReviewDefaults(e.target.checked)}
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
              (target === "new" && (!reviewDefaults || !profileName.trim()))
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
  ) : null;

  const sectionItems: SaveSectionItem[] = report
    ? [
        {
          id: "mailbox",
          label: mailboxWords[batchLang].title,
          available: supportsMailbox(report.format),
        },
        {
          id: "chatter",
          label: chatterWords[batchLang].title,
          available: supportsChatter(report.format),
        },
        { id: "pokemon", label: words.pokemon, available: Boolean(true) },
        {
          id: "registeredGroups",
          label:
            registeredGroupWords[
              i18n.language.startsWith("zh")
                ? "zh"
                : i18n.language.startsWith("ja")
                  ? "ja"
                  : "en"
            ].title,
          available: Boolean(report.registeredTeams),
        },
        { id: "trainer", label: words.trainer, available: Boolean(true) },
        { id: "inventory", label: words.inventory, available: Boolean(true) },
        {
          id: "batch",
          label: propertyBatchWords[batchLang].title,
          available: Boolean(report.canEdit),
        },
        {
          id: "files",
          label: fileBatchWords[batchLang].title,
          available: Boolean(true),
        },
        {
          id: "pokedex",
          label: words.pokedexTitle,
          available: Boolean(report.pokedex),
        },
        {
          id: "events",
          label: eventWords[batchLang].title,
          available: Boolean(supportsEvents(report.format)),
        },
        {
          id: "gsBall2",
          label: gsBall2Words[batchLang].title,
          available: Boolean(supportsGsBall2(report.format, report.version)),
        },
        {
          id: "hall3",
          label: hall3Words[batchLang].title,
          available: Boolean(supportsHall3(report.format)),
        },
        {
          id: "hall1",
          label: hall1Words[batchLang].title,
          available: Boolean(supportsHall1(report.format)),
        },
        {
          id: "eventReset",
          label: eventResetWords[batchLang].title,
          available: Boolean(supportsEventReset(report.format)),
        },
        {
          id: "ferry3",
          label: ferry3Words[batchLang].title,
          available: Boolean(supportsFerry3(report.format)),
        },
        {
          id: "misc3",
          label: misc3Words[batchLang].title,
          available: Boolean(supportsMisc3(report.format)),
        },
        {
          id: "secretBase3",
          label: secretBase3Words[batchLang].title,
          available: Boolean(supportsSecretBase3(report.format)),
        },
        {
          id: "pokegear4",
          label: pokegear4Words[batchLang].title,
          available: Boolean(supportsPokeGear4(report.format)),
        },
        {
          id: "pokeathlon4",
          label: pokeathlon4Words[batchLang].title,
          available: Boolean(supportsPokeathlon4(report.format)),
        },
        {
          id: "battlePass4",
          label: battlePass4Words[batchLang].title,
          available: Boolean(supportsBr4Gear(report.format)),
        },
        {
          id: "brTrainer4",
          label: brTrainer4Words[batchLang].title,
          available: Boolean(supportsBr4Gear(report.format)),
        },
        {
          id: "battleVideo4",
          label: video4Words[batchLang].title,
          available: Boolean(supportsBattleVideo4(report.format)),
        },
        {
          id: "geonet4",
          label: geonet4Words[batchLang].title,
          available: Boolean(supportsGeonet4(report.format)),
        },
        {
          id: "misc4",
          label: misc4Words[batchLang].title,
          available: Boolean(supportsMisc4(report.format)),
        },
        {
          id: "misc5",
          label: misc5Labels[batchLang].title,
          available: Boolean(supportsMisc5(report.format)),
        },
        {
          id: "medals5",
          label: medals5Labels[batchLang].title,
          available: Boolean(supportsMedals5(report.format)),
        },
        {
          id: "berryField6xy",
          label: berry6xyWords[batchLang].title,
          available: Boolean(supportsBerryField6XY(report.format)),
        },
        {
          id: "avenue5",
          label: avenue5Words[batchLang].title,
          available: Boolean(supportsAvenue5(report.format)),
        },
        {
          id: "superTrain6",
          label: st6Words[batchLang].title,
          available: Boolean(supportsSuperTrain6(report.format)),
        },
        {
          id: "secretBase6",
          label: sb6Words[batchLang].title,
          available: Boolean(supportsSecretBase6(report.format)),
        },
        {
          id: "link6",
          label: link6Words[batchLang].title,
          available: Boolean(supportsLink6(report.format)),
        },
        {
          id: "hall6",
          label: hall6Words[batchLang].title,
          available: Boolean(supportsHall6(report.format)),
        },
        {
          id: "zygarde7",
          label:
            report.format === "SAV7USUM"
              ? zygarde7Words[batchLang].stickers
              : zygarde7Words[batchLang].cells,
          available: Boolean(supportsZygarde7(report.format)),
        },
        {
          id: "sevenstar9",
          label: sevenStar9Words[batchLang].title,
          available: Boolean(supportsSevenStar9(report.format)),
        },
        {
          id: "raid9",
          label: raid9Words[batchLang].title,
          available: Boolean(supportsRaid9(report.format)),
        },
        {
          id: "fashion9",
          label: fashion9Words[batchLang].title,
          available: Boolean(supportsFashion9(report.format)),
        },
        {
          id: "event9a",
          label: event9aWords[batchLang].title,
          available: Boolean(supportsEvent9a(report.format)),
        },
        {
          id: "donut9a",
          label: donut9aWords[batchLang].title,
          available: Boolean(supportsDonut9a(report.format)),
        },
        {
          id: "trainer8",
          label: trainer8Words[batchLang].title,
          available: Boolean(supportsTrainer8(report.format)),
        },
        {
          id: "trainer8a",
          label: trainer8aWords[batchLang].title,
          available: Boolean(supportsTrainer8a(report.format)),
        },
        {
          id: "trainer8b",
          label: trainer8bWords[batchLang].title,
          available: Boolean(supportsTrainer8b(report.format)),
        },
        {
          id: "raid8",
          label: raid8Words[batchLang].title,
          available: Boolean(supportsRaid8(report.format)),
        },
        {
          id: "underground8b",
          label: underground8bWords[batchLang].title,
          available: Boolean(supportsUnderground8b(report.format)),
        },
        {
          id: "seal8b",
          label: seal8bWords[batchLang].title,
          available: Boolean(supportsSeal8b(report.format)),
        },
        {
          id: "misc8b",
          label: misc8bWords[batchLang].title,
          available: Boolean(supportsMisc8b(report.format)),
        },
        {
          id: "trainerGG",
          label: trainerGGWords[batchLang].title,
          available: Boolean(supportsTrainerGG(report.format)),
        },
        {
          id: "hall7",
          label: hall7Words[batchLang].title,
          available: Boolean(supportsHall7(report.format)),
        },
        {
          id: "unityTower5",
          label: tower5Words[batchLang].title,
          available: Boolean(supportsUnityTower5(report.format)),
        },
        {
          id: "globalLink5",
          label: gl5Words[batchLang].title,
          available: Boolean(supportsGlobalLink5(report.format)),
        },
        {
          id: "dlc5",
          label: dlc5Words[batchLang].title,
          available: Boolean(supportsDlc5(report.format)),
        },
        {
          id: "cgear5",
          label: cgear5Words[batchLang].title,
          available: Boolean(supportsCGear5(report.format)),
        },
        {
          id: "underground4",
          label: ug4Words[batchLang].title,
          available: Boolean(supportsUnderground4(report.format)),
        },
        {
          id: "honeyTree4",
          label: honey4Words[batchLang].title,
          available: Boolean(supportsHoneyTree4(report.format)),
        },
        {
          id: "br4Gear",
          label: br4GearWords[batchLang].title,
          available: Boolean(supportsBr4Gear(report.format)),
        },
        {
          id: "joyful3",
          label: joyful3Words[batchLang].title,
          available: Boolean(supportsJoyful3(report.format)),
        },
        {
          id: "frontier3",
          label: frontier3Words[batchLang].title,
          available: Boolean(supportsFrontier3(report.format)),
        },
        {
          id: "gameRecords3",
          label: gameRecords3Words[batchLang].title,
          available: Boolean(supportsGameRecords3(report.format)),
        },
        {
          id: "paintings3",
          label: paintings3Words[batchLang].title,
          available: Boolean(supportsPaintings3(report.format)),
        },
        {
          id: "decorations3",
          label: decorations3Words[batchLang].title,
          available: Boolean(supportsDecorations3(report.format)),
        },
        {
          id: "roamer3",
          label: roamer3Words[batchLang].title,
          available: Boolean(supportsRoamer3(report.format)),
        },
        {
          id: "roamer",
          label: roamerWords[batchLang].title,
          available: Boolean(supportsRoamer(report.format)),
        },
        {
          id: "rtc",
          label: rtcWords[batchLang].title,
          available: Boolean(supportsRtc(report.format)),
        },
        {
          id: "opowers",
          label: opowerWords[batchLang].title,
          available: Boolean(supportsOPowers(report.format)),
        },
        {
          id: "food",
          label: foodWords[batchLang].title,
          available: Boolean(supportsFood(report.format)),
        },
        {
          id: "records",
          label: words.recordsTitle,
          available: Boolean(report.trainer.canRecords),
        },
      ]
    : [];

  return (
    <div
      className="save-editor-panel save-file-workspace"
      data-open={Boolean(report)}
      aria-busy={busy}
    >
      {!report && <p>{words.intro}</p>}
      <div className="save-editor-toolbar">
        {report && (
          <button
            type="button"
            className="primary"
            disabled={
              busy ||
              !(
                report.canEdit ||
                report.boxOptions.canSetCurrentBox ||
                report.trainerOnly ||
                report.pokedex?.canEdit ||
                report.brProfiles?.canEdit
              )
            }
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
      {report?.brProfiles && (
        <>
          <label className="field">
            <span>{br4GearWords[batchLang].player}</span>
            <Select
              value={report.brProfiles.active}
              disabled={busy}
              onChange={(event) =>
                void selectBRPlayer(Number(event.target.value))
              }
            >
              {report.brProfiles.choices.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.id + 1} ·{" "}
                  {profile.name || br4GearWords[batchLang].empty}
                </option>
              ))}
            </Select>
          </label>
          <p>{br4GearWords[batchLang].profileNote}</p>
        </>
      )}

      {!report && <p className="save-editor-note">{words.choose}</p>}
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
          <p className="save-open-file">{name}</p>
          {!report.checksumsValid && (
            <p role="alert" className="save-editor-error">
              {words.invalid}
            </p>
          )}
          <div className="save-editor-body">
            <SaveSectionNavigation
              items={sectionItems}
              selected={section}
              busy={busy}
              lang={batchLang}
              onSelect={setSection}
            />
            <div
              className="save-section-content"
              id="save-section-content"
              role="region"
              aria-label={
                sectionItems.find((item) => item.id === section)?.label ??
                words.title
              }
            >
              {section === "files" ? (
                <FileBatchEditor
                  key={
                    name +
                    ":" +
                    fileRevision +
                    ":" +
                    workingRevision +
                    ":" +
                    batchLang
                  }
                  busy={busy}
                  lang={batchLang}
                  onCatalog={() => readPropertyBatch("fileCatalog")}
                  onPreview={previewFileBatch}
                  onDownload={downloadFileBatch}
                  onDiscard={discardFilePreview}
                />
              ) : section === "batch" && report.canEdit ? (
                <PropertyBatchEditor
                  key={
                    name +
                    ":" +
                    fileRevision +
                    ":" +
                    workingRevision +
                    ":" +
                    batchLang
                  }
                  report={report}
                  busy={busy}
                  lang={batchLang}
                  onRead={readPropertyBatch}
                  onDiscard={discardPropertyPreview}
                  onApply={(edit) => applyWorkingEdit(edit, "propertyCommit")}
                />
              ) : section === "pokedex" && report.pokedex?.kind === "za" ? (
                <ZaPokedexEditor
                  key={name + ":" + fileRevision}
                  revision={workingRevision}
                  busy={busy}
                  onRead={readPokedex9a}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex9aEdit")}
                />
              ) : section === "pokedex" && report.pokedex?.kind === "sv" ? (
                <SvPokedexEditor
                  key={name + ":" + fileRevision}
                  revision={workingRevision}
                  busy={busy}
                  onRead={readPokedex9}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex9Edit")}
                />
              ) : section === "pokedex" &&
                report.pokedex?.kind === "legends" ? (
                <LegendsPokedexEditor
                  key={name + ":" + fileRevision}
                  revision={workingRevision}
                  busy={busy}
                  onRead={readPokedex8a}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex8aEdit")}
                />
              ) : section === "pokedex" && report.pokedex?.kind === "swsh" ? (
                <SwshPokedexEditor
                  key={name + ":" + fileRevision}
                  revision={workingRevision}
                  busy={busy}
                  onRead={readPokedex8}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex8Edit")}
                />
              ) : section === "pokedex" && report.pokedex?.kind === "bdsp" ? (
                <BdspPokedexEditor
                  key={`${name}:${fileRevision}`}
                  revision={workingRevision}
                  busy={busy}
                  onRead={readPokedex8b}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex8bEdit")}
                />
              ) : section === "pokedex" && report.pokedex?.kind === "gen7" ? (
                <Gen7PokedexEditor
                  key={`${name}:${fileRevision}`}
                  revision={workingRevision}
                  busy={busy}
                  onRead={readPokedex7}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex7Edit")}
                />
              ) : section === "pokedex" && report.pokedex?.kind === "gen6" ? (
                <FlagPokedexEditor
                  key={`${name}:${fileRevision}`}
                  kind={report.format === "SAV6AO" ? "oras" : "xy"}
                  revision={workingRevision}
                  busy={busy}
                  saveLanguage={report.language}
                  onRead={readPokedex6}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex6Edit")}
                />
              ) : section === "pokedex" && report.pokedex?.kind === "gen5" ? (
                <FlagPokedexEditor
                  key={`${name}:${fileRevision}`}
                  revision={workingRevision}
                  busy={busy}
                  saveLanguage={report.language}
                  onRead={readPokedex5}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex5Edit")}
                />
              ) : section === "pokedex" && report.pokedex?.kind === "gen4" ? (
                <Gen4PokedexEditor
                  key={`${name}:${fileRevision}`}
                  revision={workingRevision}
                  busy={busy}
                  onRead={readPokedex4}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedex4Edit")}
                />
              ) : section === "pokedex" && report.pokedex ? (
                <SimplePokedexEditor
                  key={`${name}:${fileRevision}`}
                  revision={workingRevision}
                  fileName={name}
                  busy={busy}
                  onRead={readPokedex}
                  onApply={(edit) => applyWorkingEdit(edit, "pokedexEdit")}
                />
              ) : section === "events" && supportsEvents(report.format) ? (
                <EventEditor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readEvents}
                  onApply={(edit) => applyWorkingEdit(edit, "eventsEdit")}
                  onCompare={compareEvents}
                />
              ) : section === "gsBall2" &&
                supportsGsBall2(report.format, report.version) ? (
                <GsBall2Editor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readGsBall2}
                  onEnable={() =>
                    applyWorkingEdit({ action: "enableGsBall" }, "gsBall2Edit")
                  }
                />
              ) : section === "hall3" && supportsHall3(report.format) ? (
                <Hall3Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readHall3}
                  onApply={(edit) => applyWorkingEdit(edit, "hall3Edit")}
                />
              ) : section === "hall1" && supportsHall1(report.format) ? (
                <Hall1Editor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readHall1}
                  onApply={(edit) => applyWorkingEdit(edit, "hall1Edit")}
                />
              ) : section === "eventReset" &&
                supportsEventReset(report.format) ? (
                <EventResetEditor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readEventReset}
                  onApply={(edit) => applyWorkingEdit(edit, "eventResetEdit")}
                />
              ) : section === "ferry3" && supportsFerry3(report.format) ? (
                <Ferry3Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readFerry3}
                  onApply={(edit) => applyWorkingEdit(edit, "ferry3Edit")}
                />
              ) : section === "misc3" && supportsMisc3(report.format) ? (
                <Misc3Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readMisc3}
                  onApply={(edit) => applyWorkingEdit(edit, "misc3Edit")}
                />
              ) : section === "secretBase3" &&
                supportsSecretBase3(report.format) ? (
                <SecretBase3Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readSecretBase3}
                  onSuggest={suggestSecretBase3}
                  onApply={(edit) => applyWorkingEdit(edit, "secretBase3Edit")}
                />
              ) : section === "pokegear4" &&
                supportsPokeGear4(report.format) ? (
                <PokeGear4Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readPokeGear4}
                  onApply={(edit) => applyWorkingEdit(edit, "pokegear4Edit")}
                />
              ) : section === "pokeathlon4" &&
                supportsPokeathlon4(report.format) ? (
                <Pokeathlon4Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readPokeathlon4}
                  onApply={(edit) => applyWorkingEdit(edit, "pokeathlon4Edit")}
                />
              ) : section === "battlePass4" &&
                supportsBr4Gear(report.format) ? (
                <BattlePass4Editor
                  key={report.brProfiles?.active}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readBattlePass4}
                  onPreview={previewBattlePass4}
                  onApply={(edit) => applyWorkingEdit(edit, "battlePass4Edit")}
                  onExport={exportBattlePass4}
                />
              ) : section === "brTrainer4" && supportsBr4Gear(report.format) ? (
                <BrTrainer4Editor
                  key={report.brProfiles?.active}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readBrTrainer4}
                  onApply={(edit) => applyWorkingEdit(edit, "brTrainer4Edit")}
                />
              ) : section === "battleVideo4" &&
                supportsBattleVideo4(report.format) ? (
                <BattleVideo4Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readBattleVideo4}
                  onPreview={previewVideo4}
                  onApply={(edit) => applyWorkingEdit(edit, "video4Import")}
                  onExport={exportVideo4}
                />
              ) : section === "geonet4" && supportsGeonet4(report.format) ? (
                <Geonet4Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readGeonet4}
                  onApply={(edit) => applyWorkingEdit(edit, "geonet4Edit")}
                />
              ) : section === "misc4" && supportsMisc4(report.format) ? (
                <Misc4Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readMisc4}
                  onPreview={previewMisc4}
                  onApply={(edit) => applyWorkingEdit(edit, "misc4Edit")}
                  onRelated={setSection}
                />
              ) : section === "misc5" && supportsMisc5(report.format) ? (
                <Misc5Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readMisc5}
                  onPreview={previewMisc5}
                  onExport={exportMisc5}
                  onApply={(edit) => applyWorkingEdit(edit, "misc5Edit")}
                />
              ) : section === "medals5" && supportsMedals5(report.format) ? (
                <Medals5Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readMedals5}
                  onPreview={previewMedals5}
                  onExport={exportMedals5}
                  onApply={(edit) => applyWorkingEdit(edit, "medals5Edit")}
                />
              ) : section === "berryField6xy" &&
                supportsBerryField6XY(report.format) ? (
                <BerryField6XYViewer
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readBerryField6XY}
                />
              ) : section === "avenue5" && supportsAvenue5(report.format) ? (
                <Avenue5Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readAvenue5}
                  onPreview={previewAvenue5}
                  onApply={(edit) => applyWorkingEdit(edit, "avenue5Edit")}
                  onExport={exportAvenue5}
                />
              ) : section === "superTrain6" &&
                supportsSuperTrain6(report.format) ? (
                <SuperTrain6Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readSuperTrain6}
                  onPreview={previewSuperTrain6}
                  onApply={(edit) => applyWorkingEdit(edit, "superTrain6Edit")}
                />
              ) : section === "secretBase6" &&
                supportsSecretBase6(report.format) ? (
                <SecretBase6Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readSecretBase6}
                  onPreview={previewSecretBase6}
                  onApply={(edit) => applyWorkingEdit(edit, "secretBase6Edit")}
                  onExport={exportSecretBase6}
                />
              ) : section === "link6" && supportsLink6(report.format) ? (
                <Link6Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readLink6}
                  onPreview={previewLink6}
                  onApply={(edit) => applyWorkingEdit(edit, "link6Edit")}
                  onExport={exportLink6}
                />
              ) : section === "sevenstar9" &&
                supportsSevenStar9(report.format) ? (
                <SevenStar9Editor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readSevenStar9}
                  onPreview={previewSevenStar9}
                  onApply={(e) => applyWorkingEdit(e, "sevenstar9Commit")}
                  onDiscard={discardSevenStar9}
                />
              ) : section === "raid9" && supportsRaid9(report.format) ? (
                <Raid9Editor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readRaid9}
                  onPreview={previewRaid9}
                  onApply={(e) => applyWorkingEdit(e, "raid9Commit")}
                  onDiscard={discardRaid9}
                />
              ) : section === "fashion9" && supportsFashion9(report.format) ? (
                <Fashion9Editor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readFashion9}
                  onPreview={previewFashion9}
                  onApply={(e) => applyWorkingEdit(e, "fashion9Commit")}
                  onDiscard={discardFashion9}
                />
              ) : section === "event9a" && supportsEvent9a(report.format) ? (
                <Event9aEditor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readEvent9a}
                  onPreview={previewEvent9a}
                  onApply={(e) => applyWorkingEdit(e, "event9aCommit")}
                  onDiscard={discardEvent9a}
                  onCompare={compareEvent9a}
                />
              ) : section === "donut9a" && supportsDonut9a(report.format) ? (
                <Donut9aEditor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readDonut9a}
                  onPreview={previewDonut9a}
                  onApply={(e) => applyWorkingEdit(e, "donut9aCommit")}
                  onDiscard={discardDonut9a}
                  onExport={exportDonut9a}
                />
              ) : section === "trainer8" && supportsTrainer8(report.format) ? (
                <Trainer8Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readTrainer8}
                  onPreview={previewTrainer8}
                  onApply={(e) => applyWorkingEdit(e, "trainer8Edit")}
                />
              ) : section === "trainer8a" &&
                supportsTrainer8a(report.format) ? (
                <Trainer8aEditor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readTrainer8a}
                  onPreview={previewTrainer8a}
                  onApply={(e) => applyWorkingEdit(e, "trainer8aEdit")}
                />
              ) : section === "trainer8b" &&
                supportsTrainer8b(report.format) ? (
                <Trainer8bEditor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readTrainer8b}
                  onPreview={previewTrainer8b}
                  onApply={(e) => applyWorkingEdit(e, "trainer8bEdit")}
                />
              ) : section === "raid8" && supportsRaid8(report.format) ? (
                <Raid8Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readRaid8}
                  onPreview={previewRaid8}
                  onApply={(e) => applyWorkingEdit(e, "raid8Edit")}
                />
              ) : section === "underground8b" &&
                supportsUnderground8b(report.format) ? (
                <Underground8bEditor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readUnderground8b}
                  onPreview={previewUnderground8b}
                  onApply={(e) => applyWorkingEdit(e, "underground8bEdit")}
                />
              ) : section === "seal8b" && supportsSeal8b(report.format) ? (
                <Seal8bEditor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readSeal8b}
                  onPreview={previewSeal8b}
                  onApply={(e) => applyWorkingEdit(e, "seal8bEdit")}
                />
              ) : section === "misc8b" && supportsMisc8b(report.format) ? (
                <Misc8bEditor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readMisc8b}
                  onPreview={previewMisc8b}
                  onApply={(e) => applyWorkingEdit(e, "misc8bEdit")}
                />
              ) : section === "trainerGG" &&
                supportsTrainerGG(report.format) ? (
                <TrainerGGEditor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readTrainerGG}
                  onPreview={previewTrainerGG}
                  onApply={(edit) => applyWorkingEdit(edit, "trainerGGEdit")}
                  onExport={exportTrainerGG}
                />
              ) : section === "hall7" && supportsHall7(report.format) ? (
                <Hall7Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readHall7}
                  onPreview={previewHall7}
                  onApply={(edit) => applyWorkingEdit(edit, "hall7Edit")}
                />
              ) : section === "zygarde7" && supportsZygarde7(report.format) ? (
                <Zygarde7Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readZygarde7}
                  onPreview={previewZygarde7}
                  onApply={(edit) => applyWorkingEdit(edit, "zygarde7Edit")}
                />
              ) : section === "hall6" && supportsHall6(report.format) ? (
                <Hall6Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readHall6}
                  onPreview={previewHall6}
                  onApply={(edit) => applyWorkingEdit(edit, "hall6Edit")}
                />
              ) : section === "unityTower5" &&
                supportsUnityTower5(report.format) ? (
                <UnityTower5Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readUnityTower5}
                  onPreview={previewUnityTower5}
                  onApply={(edit) => applyWorkingEdit(edit, "unityTower5Edit")}
                />
              ) : section === "globalLink5" &&
                supportsGlobalLink5(report.format) ? (
                <GlobalLink5Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readGlobalLink5}
                  onPreview={previewGlobalLink5}
                  onApply={(edit) => applyWorkingEdit(edit, "globalLink5Edit")}
                />
              ) : section === "dlc5" && supportsDlc5(report.format) ? (
                <Dlc5Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readDlc5}
                  onPreview={previewDlc5}
                  onApply={(edit) => applyWorkingEdit(edit, "dlc5Edit")}
                  onExport={exportDlc5}
                  onCGear={() => setSection("cgear5")}
                />
              ) : section === "cgear5" && supportsCGear5(report.format) ? (
                <CGear5Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readCGear5}
                  onPreview={previewCGear5}
                  onApply={(edit) => applyWorkingEdit(edit, "cgear5Edit")}
                  onExport={exportCGear5}
                />
              ) : section === "underground4" &&
                supportsUnderground4(report.format) ? (
                <Underground4Editor
                  key={report.format + "." + batchLang}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readUnderground4}
                  onPreview={previewUnderground4}
                  onApply={(edit) => applyWorkingEdit(edit, "underground4Edit")}
                />
              ) : section === "honeyTree4" &&
                supportsHoneyTree4(report.format) ? (
                <HoneyTree4Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readHoneyTree4}
                  onApply={(edit) => applyWorkingEdit(edit, "honeyTree4Edit")}
                />
              ) : section === "br4Gear" && supportsBr4Gear(report.format) ? (
                <Br4GearEditor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readBr4Gear}
                  onApply={(edit) => applyWorkingEdit(edit, "br4GearEdit")}
                />
              ) : section === "joyful3" && supportsJoyful3(report.format) ? (
                <Joyful3Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readJoyful3}
                  onApply={(edit) => applyWorkingEdit(edit, "joyful3Edit")}
                />
              ) : section === "frontier3" &&
                supportsFrontier3(report.format) ? (
                <Frontier3Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readFrontier3}
                  onApply={(edit) => applyWorkingEdit(edit, "frontier3Edit")}
                />
              ) : section === "gameRecords3" &&
                supportsGameRecords3(report.format) ? (
                <GameRecords3Editor
                  key={report.format}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readGameRecords3}
                  onApply={(edit) => applyWorkingEdit(edit, "gameRecords3Edit")}
                />
              ) : section === "paintings3" &&
                supportsPaintings3(report.format) ? (
                <Paintings3Editor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readPaintings3}
                  onApply={(edit) => applyWorkingEdit(edit, "paintings3Edit")}
                />
              ) : section === "decorations3" &&
                supportsDecorations3(report.format) ? (
                <Decorations3Editor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readDecorations3}
                  onApply={(edit) => applyWorkingEdit(edit, "decorations3Edit")}
                />
              ) : section === "roamer3" && supportsRoamer3(report.format) ? (
                <Roamer3Editor
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readRoamer3}
                  onApply={(edit) => applyWorkingEdit(edit, "roamer3Edit")}
                />
              ) : section === "roamer" && supportsRoamer(report.format) ? (
                <RoamerEditor
                  revision={workingRevision}
                  busy={busy}
                  canEdit={report.canEdit}
                  lang={batchLang}
                  onRead={readRoamer}
                  onApply={(edit) => applyWorkingEdit(edit, "roamerEdit")}
                />
              ) : section === "rtc" && supportsRtc(report.format) ? (
                <RtcEditor
                  revision={workingRevision}
                  busy={busy}
                  canEdit={report.canEdit}
                  lang={batchLang}
                  onRead={readRtc}
                  onApply={(edit) => applyWorkingEdit(edit, "rtcEdit")}
                />
              ) : section === "opowers" && supportsOPowers(report.format) ? (
                <OPowerEditor
                  revision={workingRevision}
                  busy={busy}
                  canEdit={report.canEdit}
                  lang={batchLang}
                  onRead={readOPowers}
                  onApply={(edit) => applyWorkingEdit(edit, "opowersEdit")}
                />
              ) : section === "food" && supportsFood(report.format) ? (
                <SaveFoodEditor
                  key={`${name}:${fileRevision}`}
                  revision={workingRevision}
                  busy={busy}
                  canEdit={report.canEdit}
                  lang={batchLang}
                  onRead={readFood}
                  onApply={(edit) => applyWorkingEdit(edit, "foodEdit")}
                />
              ) : section === "records" && report.trainer.canRecords ? (
                <SaveRecordEditor
                  key={`${name}:${fileRevision}`}
                  revision={workingRevision}
                  busy={busy}
                  canEdit={report.canEdit || !!report.trainerOnly}
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
              ) : section === "mailbox" ? (
                <MailboxEditor
                  key={name + ":" + fileRevision}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readMailbox}
                  onPreview={previewMailbox}
                  onApply={applyMailbox}
                  onDiscard={discardMailbox}
                />
              ) : section === "chatter" ? (
                <ChatterEditor
                  key={name + ":" + fileRevision}
                  revision={workingRevision}
                  busy={busy}
                  lang={batchLang}
                  onRead={readChatter}
                  onPreview={previewChatter}
                  onApply={applyChatter}
                  onDiscard={discardChatter}
                />
              ) : section === "registeredGroups" && report.registeredTeams ? (
                <RegisteredGroupViewer
                  key={`${name}:${fileRevision}`}
                  revision={workingRevision}
                  busy={busy}
                  onRead={readRegisteredGroups}
                  onAnalyze={analyzeRegisteredGroup}
                />
              ) : section === "pokemon" ? (
                <SavePokemonBrowser
                  profileLink={profileLinkPanel}
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
                  onExportBoxes={downloadBoxes}
                  onPreviewBoxImport={previewBoxImport}
                  onApplyBoxImport={(confirmation) =>
                    applyWorkingEdit(confirmation, "boxImportCommit")
                  }
                  onDiscardBoxImport={discardBoxImport}
                  onPreviewBoxBinary={previewBoxBinary}
                  onApplyBoxBinary={(confirmation) =>
                    applyWorkingEdit(confirmation, "boxBinaryCommit")
                  }
                  onDiscardBoxBinary={discardBoxBinary}
                  onExportBoxBinary={downloadBoxBinary}
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
                              words.games[game as keyof typeof words.games] ??
                              game,
                          )
                          .join(" / ") ||
                          (report.format === "SAV4BR"
                            ? words.br4Game
                            : report.version)}{" "}
                        · {words.generation} {report.generation}
                      </dd>
                    </div>
                    <div>
                      <dt>{words.checksums}</dt>
                      <dd>
                        {report.checksumsValid ? words.valid : words.invalid}
                      </dd>
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
                    <p>
                      {report.trainerOnly
                        ? trainer6Words[batchLang].demoScope
                        : report.format === "SAV4BR"
                          ? br4GearWords[batchLang].scoped
                          : report.format === "SAV1"
                            ? words.pokedexResetOnly
                            : report.format === "SAV7b"
                              ? trainerGGWords[batchLang].scope
                              : report.format === "SAV2"
                                ? words.pokedexEventsOnly
                                : report.pokedex?.canEdit
                                  ? words.pokedexOnly
                                  : words.readonly}
                    </p>
                  )}
                  <fieldset
                    disabled={
                      busy ||
                      !(report.canEdit || report.trainerOnly) ||
                      trainer6Draft
                    }
                    className="save-editor-fields"
                  >
                    <legend>{words.trainer}</legend>
                    <label className="field">
                      <span>{words.trainerName}</span>
                      <input
                        value={draft.ot}
                        maxLength={report.maxNameLength}
                        onChange={(e) =>
                          setDraft({ ...draft, ot: e.target.value })
                        }
                      />
                    </label>
                    {(
                      [
                        ["tid", words.tid, 65535],
                        ["sid", words.sid, 65535],
                        ["money", words.money, report.maxMoney],
                      ] as const
                    ).map(([key, label, max]) => (
                      <label
                        className={
                          key === "money" && supportsTrainer6(report.format)
                            ? "field save-trainer6-money"
                            : "field"
                        }
                        key={key}
                      >
                        <span>{label}</span>
                        <input
                          inputMode="numeric"
                          value={draft[key]}
                          maxLength={String(max).length}
                          title={
                            supportsTrainer6(report.format) && key !== "money"
                              ? `TSV: ${tr6Tsv(draft.tid, draft.sid)}`
                              : undefined
                          }
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              [key]:
                                supportsTrainer6(report.format) &&
                                key !== "money"
                                  ? tr6IdInput(e.target.value)
                                  : e.target.value,
                            })
                          }
                        />
                        {key === "money" && supportsTrainer6(report.format) && (
                          <button
                            type="button"
                            aria-label={`${label}: ${max}`}
                            onClick={() =>
                              setDraft({ ...draft, money: String(max) })
                            }
                          >
                            +
                          </button>
                        )}
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
                          {words.trainerCurrencyNames[field.key]} · 0–
                          {field.max}
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
                      key={`${name}:${fileRevision}:${workingRevision}:${geographyReset}`}
                      report={report}
                      draft={draft}
                      disabled={
                        busy ||
                        !(report.canEdit || report.trainerOnly) ||
                        trainer6Draft
                      }
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
                            <option value={draft.gender}>
                              #{draft.gender}
                            </option>
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
                      disabled={
                        busy ||
                        !(report.canEdit || report.trainerOnly) ||
                        trainer6Draft
                      }
                    >
                      <legend>{words.trainerBadges}</legend>
                      {Array.from(
                        { length: report.trainer.badges.count },
                        (_, index) => (
                          <label className="save-editor-checkbox" key={index}>
                            <input
                              type="checkbox"
                              checked={
                                (Number(draft.badges) & (1 << index)) !== 0
                              }
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
                              {words.trainerBadge.replace(
                                "{n}",
                                String(index + 1),
                              )}
                            </span>
                          </label>
                        ),
                      )}
                      <p className="save-editor-note">
                        {words.trainerBadgesNote}
                      </p>
                    </fieldset>
                  )}
                  <TrainerGameOptionFields
                    report={report}
                    draft={draft}
                    disabled={
                      busy ||
                      !(report.canEdit || report.trainerOnly) ||
                      trainer6Draft
                    }
                    onChange={setDraft}
                  />
                  <TrainerAppearance6Fields
                    report={report}
                    draft={draft}
                    disabled={
                      busy ||
                      !(report.canEdit || report.trainerOnly) ||
                      trainer6Draft
                    }
                    onChange={setDraft}
                  />
                  <TrainerDateFields
                    report={report}
                    draft={draft}
                    disabled={
                      busy ||
                      !(report.canEdit || report.trainerOnly) ||
                      trainer6Draft
                    }
                    onChange={setDraft}
                  />
                  <TrainerPositionFields
                    report={report}
                    draft={draft}
                    disabled={
                      busy ||
                      !(report.canEdit || report.trainerOnly) ||
                      trainer6Draft
                    }
                    onChange={setDraft}
                  />
                  <p className="save-editor-note">{words.ids}</p>
                  {report.trainer.languages.length > 0 && (
                    <p className="save-editor-note">
                      {words.trainerLanguageNote}
                    </p>
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
                        !(report.canEdit || report.trainerOnly) ||
                        trainer6Draft ||
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
                      disabled={
                        busy ||
                        !(report.canEdit || report.trainerOnly) ||
                        trainer6Draft
                      }
                      onClick={() => {
                        setDraft(trainerDraft(report));
                        setGeographyReset((value) => value + 1);
                        setError("");
                      }}
                    >
                      <RotateCcw size={18} aria-hidden="true" /> {words.reset}
                    </button>
                  </div>
                  {supportsTrainer7(report.format) && (
                    <Trainer7Editor
                      key={`${name}:${fileRevision}:${report.format}`}
                      revision={workingRevision}
                      busy={busy || !trainerDraftMatches(draft, report)}
                      lang={batchLang}
                      onRead={readTrainer7}
                      onPreview={previewTrainer7}
                      onApply={(edit) => applyWorkingEdit(edit, "trainer7Edit")}
                      onDirtyChange={setTrainer6Draft}
                    />
                  )}
                  {supportsTrainer6(report.format) && (
                    <Trainer6Editor
                      key={`${name}:${fileRevision}:${report.format}`}
                      revision={workingRevision}
                      busy={busy || !trainerDraftMatches(draft, report)}
                      lang={batchLang}
                      onRead={readTrainer6}
                      onPreview={previewTrainer6}
                      onApply={(edit) => applyWorkingEdit(edit, "trainer6Edit")}
                      onDirtyChange={setTrainer6Draft}
                    />
                  )}
                  {profileLinkPanel}
                </>
              )}
            </div>
          </div>
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
