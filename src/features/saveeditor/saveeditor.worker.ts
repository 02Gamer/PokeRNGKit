import type { SaveEditorRequestKind } from "./requestKinds";
import type { SaveReport, PokemonLegalityReport } from "./domain";
import { browserCryptography } from "./browserCryptography";
import type {
  StandalonePokemonReport,
  StandalonePokemonRequest,
} from "./standalonePokemon";

interface SaveExports {
  PokeRNGKit: {
    SaveEditor: {
      Program: {
        ConfigureBrowserCrypto(): void;
        ResetBRProfile(): void;
        ConfigureBRProfile(profile: number): void;
        SelectBRProfile(data: Uint8Array, profile: number): string;
        AnalyzeStandalonePokemon(data: Uint8Array, json: string): string;
        EditStandalonePokemonRaw(data: Uint8Array, json: string): Uint8Array;
        EditStandalonePokemonGb(data: Uint8Array, json: string): Uint8Array;
        ReadStandalonePokemonAdvanced(data: Uint8Array, json: string): string;
        InspectStandalonePokemon(data: Uint8Array, json: string): string;
        ReadBlockAccessor(data: Uint8Array, json: string): string;
        PreviewBlockAccessor(data: Uint8Array, json: string): string;
        CommitBlockAccessor(data: Uint8Array, json: string): Uint8Array;
        DiscardBlockAccessor(token: string): void;
        ReadTrainer9a(data: Uint8Array): string;
        PreviewTrainer9a(data: Uint8Array, json: string): string;
        CommitTrainer9a(data: Uint8Array, json: string): Uint8Array;
        DiscardTrainer9a(token: string): void;
        ReadTrainer9(data: Uint8Array): string;
        PreviewTrainer9(data: Uint8Array, json: string): string;
        CommitTrainer9(data: Uint8Array, json: string): Uint8Array;
        DiscardTrainer9(token: string): void;
        ReadFestivalPlaza(data: Uint8Array): string;
        PreviewFestivalPlaza(data: Uint8Array, json: string): string;
        CommitFestivalPlaza(data: Uint8Array, json: string): Uint8Array;
        DiscardFestivalPlaza(token: string): void;
        ReadMailbox(data: Uint8Array): string;
        PreviewMailbox(data: Uint8Array, json: string): string;
        CommitMailbox(data: Uint8Array, json: string): Uint8Array;
        DiscardMailbox(token: string): void;
        ReadChatter(data: Uint8Array): string;
        PreviewChatter(data: Uint8Array, json: string): string;
        CommitChatter(data: Uint8Array, json: string): Uint8Array;
        DiscardChatter(token: string): void;
        ReadRegisteredGroups(data: Uint8Array): string;
        AnalyzeRegisteredGroup(data: Uint8Array, json: string): string;
        EditStandalonePokemon(data: Uint8Array, json: string): Uint8Array;
        ExportStandalonePokemon(data: Uint8Array, json: string): Uint8Array;
        ExportBoxBinary(data: Uint8Array, json: string): Uint8Array;
        PreviewBoxBinary(data: Uint8Array, json: string): string;
        CommitBoxBinary(data: Uint8Array, json: string): Uint8Array;
        DiscardBoxBinary(token: string): void;
        PreviewBoxImport(data: Uint8Array, json: string): string;
        CommitBoxImport(data: Uint8Array, json: string): Uint8Array;
        DiscardBoxImport(token: string): void;
        PreviewFileBatch(data: Uint8Array, json: string): string;
        ExportFileBatch(json: string): Uint8Array;
        DiscardFileBatch(token: string): void;
        ReadFileBatchCatalog(): string;
        Inspect(data: Uint8Array): string;
        ReadPokedex9a(data: Uint8Array): string;
        EditPokedex9a(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex9(data: Uint8Array): string;
        EditPokedex9(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex8a(data: Uint8Array): string;
        EditPokedex8a(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex8(data: Uint8Array): string;
        EditPokedex8(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex8b(data: Uint8Array): string;
        EditPokedex8b(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex7(data: Uint8Array): string;
        EditPokedex7(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex6(data: Uint8Array): string;
        EditPokedex6(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex5(data: Uint8Array): string;
        EditPokedex5(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex4(data: Uint8Array): string;
        EditPokedex4(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex(data: Uint8Array, json: string): string;
        EditPokedex(data: Uint8Array, json: string): Uint8Array;
        ExportWorkingCopy(data: Uint8Array): Uint8Array;
        ReadInventory(data: Uint8Array): string;
        ReadEvents(data: Uint8Array, json: string): string;
        EditEvents(data: Uint8Array, json: string): Uint8Array;
        CompareEvents(data: Uint8Array, json: string): string;
        ReadGsBall2(data: Uint8Array): string;
        EnableGsBall2(data: Uint8Array): Uint8Array;
        ReadHall3(data: Uint8Array, json: string): string;
        EditHall3(data: Uint8Array, json: string): Uint8Array;
        ReadHall1(data: Uint8Array): string;
        EditHall1(data: Uint8Array, json: string): Uint8Array;
        ReadEventReset(data: Uint8Array, json: string): string;
        EditEventReset(data: Uint8Array, json: string): Uint8Array;
        ReadFerry3(data: Uint8Array): string;
        EditFerry3(data: Uint8Array, json: string): Uint8Array;
        ReadMisc3(data: Uint8Array): string;
        EditMisc3(data: Uint8Array, json: string): Uint8Array;
        ReadSecretBase3(data: Uint8Array): string;
        SuggestSecretBase3Form(data: Uint8Array, json: string): string;
        EditSecretBase3(data: Uint8Array, json: string): Uint8Array;
        ReadPokeGear4(data: Uint8Array): string;
        EditPokeGear4(data: Uint8Array, json: string): Uint8Array;
        ReadPokeathlon4(data: Uint8Array): string;
        EditPokeathlon4(data: Uint8Array, json: string): Uint8Array;
        PreviewBattlePassPokemon4(data: Uint8Array, json: string): string;
        ReadBattlePass4(data: Uint8Array, json: string): string;
        EditBattlePass4(data: Uint8Array, json: string): Uint8Array;
        ExportBattlePass4(data: Uint8Array, index: number): string;
        ExportBattlePassPokemon4(
          data: Uint8Array,
          index: number,
          slot: number,
        ): string;
        ReadBrTrainer4(data: Uint8Array): string;
        EditBrTrainer4(data: Uint8Array, json: string): Uint8Array;
        ReadBattleVideo4(data: Uint8Array, json: string): string;
        PreviewBattleVideo4(data: Uint8Array, json: string): string;
        ImportBattleVideo4(data: Uint8Array, json: string): Uint8Array;
        ExportBattleVideo4(data: Uint8Array, json: string): string;
        ReadGeonet4(data: Uint8Array): string;
        EditGeonet4(data: Uint8Array, json: string): Uint8Array;
        ReadMisc4(data: Uint8Array): string;
        PreviewMisc4(data: Uint8Array, json: string): string;
        EditMisc4(data: Uint8Array, json: string): Uint8Array;
        ReadMisc5(data: Uint8Array): string;
        PreviewMisc5(data: Uint8Array, json: string): string;
        EditMisc5(data: Uint8Array, json: string): Uint8Array;
        ExportMisc5(data: Uint8Array): Uint8Array;
        ReadMedals5(data: Uint8Array): string;
        PreviewMedals5(data: Uint8Array, json: string): string;
        EditMedals5(data: Uint8Array, json: string): Uint8Array;
        ExportMedals5(data: Uint8Array): Uint8Array;
        ReadBerryField6XY(data: Uint8Array): string;
        ReadAvenue5(data: Uint8Array): string;
        PreviewAvenue5(data: Uint8Array, json: string): string;
        EditAvenue5(data: Uint8Array, json: string): Uint8Array;
        ExportAvenue5(data: Uint8Array, json: string): Uint8Array;
        ReadTrainer6(data: Uint8Array): string;
        ReadSevenStar9(data: Uint8Array, json: string): string;
        PreviewSevenStar9(data: Uint8Array, json: string): string;
        CommitSevenStar9(data: Uint8Array, json: string): Uint8Array;
        DiscardSevenStar9(token: string): void;
        ReadRaid9(data: Uint8Array): string;
        PreviewRaid9(data: Uint8Array, json: string): string;
        CommitRaid9(data: Uint8Array, json: string): Uint8Array;
        DiscardRaid9(token: string): void;
        ReadFashion9(data: Uint8Array, json: string): string;
        PreviewFashion9(data: Uint8Array, json: string): string;
        CommitFashion9(data: Uint8Array, json: string): Uint8Array;
        DiscardFashion9(token: string): void;
        ReadEvent9a(data: Uint8Array, json: string): string;
        PreviewEvent9a(data: Uint8Array, json: string): string;
        CommitEvent9a(data: Uint8Array, json: string): Uint8Array;
        DiscardEvent9a(token: string): void;
        CompareEvent9a(data: Uint8Array, json: string): string;
        ReadDonut9a(data: Uint8Array): string;
        PreviewDonut9a(data: Uint8Array, json: string): string;
        CommitDonut9a(data: Uint8Array, json: string): Uint8Array;
        DiscardDonut9a(token: string): void;
        ExportDonut9a(data: Uint8Array, index: number): Uint8Array;
        ReadTrainer8(data: Uint8Array): string;
        PreviewTrainer8(data: Uint8Array, json: string): string;
        EditTrainer8(data: Uint8Array, json: string): Uint8Array;
        ReadTrainer8a(data: Uint8Array): string;
        PreviewTrainer8a(data: Uint8Array, json: string): string;
        EditTrainer8a(data: Uint8Array, json: string): Uint8Array;
        ReadTrainer8b(data: Uint8Array): string;
        PreviewTrainer8b(data: Uint8Array, json: string): string;
        EditTrainer8b(data: Uint8Array, json: string): Uint8Array;
        ReadRaid8(data: Uint8Array): string;
        PreviewRaid8(data: Uint8Array, json: string): string;
        EditRaid8(data: Uint8Array, json: string): Uint8Array;
        ReadUnderground8b(data: Uint8Array): string;
        PreviewUnderground8b(data: Uint8Array, json: string): string;
        EditUnderground8b(data: Uint8Array, json: string): Uint8Array;
        ReadSeal8b(data: Uint8Array): string;
        PreviewSeal8b(data: Uint8Array, json: string): string;
        EditSeal8b(data: Uint8Array, json: string): Uint8Array;
        ReadMisc8b(data: Uint8Array): string;
        PreviewMisc8b(data: Uint8Array, json: string): string;
        EditMisc8b(data: Uint8Array, json: string): Uint8Array;
        ReadTrainerGG(data: Uint8Array): string;
        PreviewTrainerGG(data: Uint8Array, json: string): string;
        EditTrainerGG(data: Uint8Array, json: string): Uint8Array;
        ExportGoPark(data: Uint8Array, index: number): string;
        ExportGoParkArchive(data: Uint8Array): Uint8Array;
        ReadTrainer7(data: Uint8Array): string;
        PreviewTrainer7(data: Uint8Array, json: string): string;
        EditTrainer7(data: Uint8Array, json: string): Uint8Array;
        ReadZygarde7(data: Uint8Array): string;
        ReadHall7(data: Uint8Array): string;
        PreviewHall7(data: Uint8Array, json: string): string;
        EditHall7(data: Uint8Array, json: string): Uint8Array;
        PreviewZygarde7(data: Uint8Array, json: string): string;
        EditZygarde7(data: Uint8Array, json: string): Uint8Array;
        PreviewTrainer6(data: Uint8Array, json: string): string;
        EditTrainer6(data: Uint8Array, json: string): Uint8Array;
        ReadSuperTrain6(data: Uint8Array): string;
        PreviewSuperTrain6(data: Uint8Array, json: string): string;
        EditSuperTrain6(data: Uint8Array, json: string): Uint8Array;
        ReadSecretBase6(data: Uint8Array): string;
        PreviewSecretBase6(data: Uint8Array, json: string): string;
        EditSecretBase6(data: Uint8Array, json: string): Uint8Array;
        ExportSecretBase6(data: Uint8Array, json: string): Uint8Array;
        ReadLink6(data: Uint8Array): string;
        PreviewLink6(data: Uint8Array, json: string): string;
        EditLink6(data: Uint8Array, json: string): Uint8Array;
        ExportLink6(data: Uint8Array, json: string): Uint8Array;
        ReadHall6(data: Uint8Array): string;
        PreviewHall6(data: Uint8Array, json: string): string;
        EditHall6(data: Uint8Array, json: string): Uint8Array;
        ReadUnityTower5(data: Uint8Array): string;
        PreviewUnityTower5(data: Uint8Array, json: string): string;
        EditUnityTower5(data: Uint8Array, json: string): Uint8Array;
        ReadGlobalLink5(data: Uint8Array): string;
        PreviewGlobalLink5(data: Uint8Array, json: string): string;
        EditGlobalLink5(data: Uint8Array, json: string): Uint8Array;
        ReadDlc5(data: Uint8Array): string;
        PreviewDlc5(data: Uint8Array, json: string): string;
        EditDlc5(data: Uint8Array, json: string): Uint8Array;
        ExportDlc5(data: Uint8Array, json: string): string;
        ReadCGear5(data: Uint8Array): string;
        PreviewCGear5(data: Uint8Array, json: string): string;
        EditCGear5(data: Uint8Array, json: string): Uint8Array;
        ExportCGear5(data: Uint8Array): Uint8Array;
        ReadUnderground4(data: Uint8Array): string;
        PreviewUnderground4(data: Uint8Array, json: string): string;
        EditUnderground4(data: Uint8Array, json: string): Uint8Array;
        ReadHoneyTree4(data: Uint8Array): string;
        EditHoneyTree4(data: Uint8Array, json: string): Uint8Array;
        ReadBr4Gear(data: Uint8Array): string;
        EditBr4Gear(data: Uint8Array, json: string): Uint8Array;
        ReadJoyful3(data: Uint8Array): string;
        EditJoyful3(data: Uint8Array, json: string): Uint8Array;
        ReadFrontier3(data: Uint8Array): string;
        EditFrontier3(data: Uint8Array, json: string): Uint8Array;
        ReadGameRecords3(data: Uint8Array): string;
        EditGameRecords3(data: Uint8Array, json: string): Uint8Array;
        ReadPaintings3(data: Uint8Array): string;
        EditPaintings3(data: Uint8Array, json: string): Uint8Array;
        ReadDecorations3(data: Uint8Array): string;
        EditDecorations3(data: Uint8Array, json: string): Uint8Array;
        ReadRoamer3(data: Uint8Array): string;
        EditRoamer3(data: Uint8Array, json: string): Uint8Array;
        ReadRoamer(data: Uint8Array): string;
        EditRoamer(data: Uint8Array, json: string): Uint8Array;
        ReadRtc(data: Uint8Array): string;
        EditRtc(data: Uint8Array, json: string): Uint8Array;
        ReadOPowers(data: Uint8Array): string;
        EditOPowers(data: Uint8Array, json: string): Uint8Array;
        ReadFood(data: Uint8Array): string;
        EditFood(data: Uint8Array, json: string): Uint8Array;
        ReadRecords(data: Uint8Array): string;
        EditRecord(data: Uint8Array, json: string): Uint8Array;
        EditInventory(data: Uint8Array, json: string): Uint8Array;
        EditInventoryBatch(data: Uint8Array, json: string): Uint8Array;
        Export(data: Uint8Array, json: string): Uint8Array;
        EditPokemon(data: Uint8Array, json: string): Uint8Array;
        EditPokemonRaw(data: Uint8Array, json: string): Uint8Array;
        EditBox(data: Uint8Array, json: string): Uint8Array;
        ReadPropertyBatchCatalog(data: Uint8Array): string;
        PreviewPropertyBatch(data: Uint8Array, json: string): string;
        CommitPropertyBatch(data: Uint8Array, json: string): Uint8Array;
        DiscardPropertyBatch(token: string): void;
        EditStorage(data: Uint8Array, json: string): Uint8Array;
        ImportPokemon(data: Uint8Array, json: string): Uint8Array;
        ExportPokemon(data: Uint8Array, json: string): string;
        ExportBoxes(data: Uint8Array, json: string): Uint8Array;
        ReadHistory(data: Uint8Array, json: string): string;
        ReadMemory(data: Uint8Array, json: string): string;
        ReadRibbons(data: Uint8Array, json: string): string;
        SuggestRelearn(data: Uint8Array, json: string): string;
        ReadOrigin(data: Uint8Array, json: string): string;
        AnalyzePokemon(data: Uint8Array, json: string): string;
      };
    };
  };
}

let runtime: Promise<SaveExports> | undefined;
async function loadRuntime(base: string): Promise<SaveExports> {
  const runtimeUrl = new URL("pkhex/_framework/dotnet.js", base).href;
  const { dotnet } = await import(/* @vite-ignore */ runtimeUrl);
  const host = await dotnet.withDiagnosticTracing(false).create();
  host.setModuleImports("pkhex-crypto", browserCryptography);
  const api: SaveExports = await host.getAssemblyExports(
    host.getConfig().mainAssemblyName,
  );
  api.PokeRNGKit.SaveEditor.Program.ConfigureBrowserCrypto();
  return api;
}

// .NET distinguishes a standalone worker from a pthread using self.onmessage.
// Keep that property unset during initialization: dotnet/runtime#114918.
self.addEventListener(
  "message",
  async (
    event: MessageEvent<{
      id: number;
      base: string;
      bytes: Uint8Array;
      brProfile?: number;
      edit?: string;
      kind?: SaveEditorRequestKind;
    }>,
  ) => {
    const { id, base, bytes, kind } = event.data;
    const edit = event.data.edit;
    const payload = edit ?? "";
    try {
      runtime ??= loadRuntime(base).catch((error) => {
        runtime = undefined;
        throw error;
      });
      const api = (await runtime).PokeRNGKit.SaveEditor.Program;
      if (typeof api.ConfigureBRProfile !== "function")
        throw new Error("Save editor API version mismatch.");
      api.ConfigureBRProfile(event.data.brProfile ?? -1);
      if (kind === "registeredGroups" || kind === "registeredGroupAnalyze") {
        const report: SaveReport = JSON.parse(api.Inspect(bytes));
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        const registeredGroups =
          kind === "registeredGroups"
            ? JSON.parse(api.ReadRegisteredGroups(bytes))
            : undefined;
        const registeredGroupAnalysis =
          kind === "registeredGroupAnalyze"
            ? JSON.parse(api.AnalyzeRegisteredGroup(bytes, payload))
            : undefined;
        self.postMessage({
          id,
          report,
          registeredGroups,
          registeredGroupAnalysis,
        });
        return;
      }
      if (
        kind === "chatter" ||
        kind === "chatterPreview" ||
        kind === "chatterCommit" ||
        kind === "chatterDiscard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "chatterDiscard") api.DiscardChatter(payload);
        const output =
          kind === "chatterCommit"
            ? api.CommitChatter(bytes, payload)
            : undefined;
        const chatter =
          kind === "chatter" ? JSON.parse(api.ReadChatter(bytes)) : undefined;
        const chatterPreview =
          kind === "chatterPreview"
            ? JSON.parse(api.PreviewChatter(bytes, payload))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        self.postMessage(
          { id, report, chatter, chatterPreview, output },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "mailbox" ||
        kind === "mailboxPreview" ||
        kind === "mailboxCommit" ||
        kind === "mailboxDiscard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "mailboxDiscard") api.DiscardMailbox(payload);
        const output =
          kind === "mailboxCommit"
            ? api.CommitMailbox(bytes, payload)
            : undefined;
        const mailbox =
          kind === "mailbox" ? JSON.parse(api.ReadMailbox(bytes)) : undefined;
        const mailboxPreview =
          kind === "mailboxPreview"
            ? JSON.parse(api.PreviewMailbox(bytes, payload))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        self.postMessage(
          { id, report, mailbox, mailboxPreview, output },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "festivalPlaza" ||
        kind === "festivalPlazaPreview" ||
        kind === "festivalPlazaCommit" ||
        kind === "festivalPlazaDiscard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "festivalPlazaDiscard") api.DiscardFestivalPlaza(payload);
        const output =
          kind === "festivalPlazaCommit"
            ? api.CommitFestivalPlaza(bytes, payload)
            : undefined;
        const festivalPlaza =
          kind === "festivalPlaza"
            ? JSON.parse(api.ReadFestivalPlaza(bytes))
            : undefined;
        const festivalPlazaPreview =
          kind === "festivalPlazaPreview"
            ? JSON.parse(api.PreviewFestivalPlaza(bytes, payload))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        self.postMessage(
          { id, report, festivalPlaza, festivalPlazaPreview, output },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "blockAccessor" ||
        kind === "blockAccessorPreview" ||
        kind === "blockAccessorCommit" ||
        kind === "blockAccessorDiscard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "blockAccessorDiscard") api.DiscardBlockAccessor(payload);
        const output =
          kind === "blockAccessorCommit"
            ? api.CommitBlockAccessor(bytes, payload)
            : undefined;
        const blockAccessor =
          kind === "blockAccessor"
            ? JSON.parse(api.ReadBlockAccessor(bytes, payload))
            : undefined;
        const blockAccessorPreview =
          kind === "blockAccessorPreview"
            ? JSON.parse(api.PreviewBlockAccessor(bytes, payload))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        self.postMessage(
          { id, report, blockAccessor, blockAccessorPreview, output },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "trainer9a" ||
        kind === "trainer9aPreview" ||
        kind === "trainer9aCommit" ||
        kind === "trainer9aDiscard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "trainer9aDiscard") api.DiscardTrainer9a(payload);
        const output =
          kind === "trainer9aCommit"
            ? api.CommitTrainer9a(bytes, payload)
            : undefined;
        const trainer9a =
          kind === "trainer9a"
            ? JSON.parse(api.ReadTrainer9a(bytes))
            : undefined;
        const trainer9aPreview =
          kind === "trainer9aPreview"
            ? JSON.parse(api.PreviewTrainer9a(bytes, payload))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        self.postMessage(
          { id, report, trainer9a, trainer9aPreview, output },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "trainer9" ||
        kind === "trainer9Preview" ||
        kind === "trainer9Commit" ||
        kind === "trainer9Discard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "trainer9Discard") api.DiscardTrainer9(payload);
        const output =
          kind === "trainer9Commit"
            ? api.CommitTrainer9(bytes, payload)
            : undefined;
        const trainer9 =
          kind === "trainer9" ? JSON.parse(api.ReadTrainer9(bytes)) : undefined;
        const trainer9Preview =
          kind === "trainer9Preview"
            ? JSON.parse(api.PreviewTrainer9(bytes, payload))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        self.postMessage(
          { id, report, trainer9, trainer9Preview, output },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (kind === "brProfile") {
        const profile = JSON.parse(payload);
        if (!Number.isInteger(profile) || profile < 0 || profile > 3)
          throw new Error("Invalid Battle Revolution player.");
        const report: SaveReport = JSON.parse(
          api.SelectBRProfile(bytes, profile),
        );
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        self.postMessage({ id, report });
        return;
      }
      if (kind?.startsWith("entity")) {
        if (typeof api.InspectStandalonePokemon !== "function")
          throw new Error("Save editor API version mismatch.");
        const before: StandalonePokemonReport = JSON.parse(
          api.InspectStandalonePokemon(bytes, payload),
        );
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        const output =
          kind === "entityGb"
            ? new Uint8Array(api.EditStandalonePokemonGb(bytes, payload))
            : kind === "entityRaw"
              ? new Uint8Array(api.EditStandalonePokemonRaw(bytes, payload))
              : kind === "entityEdit"
                ? new Uint8Array(api.EditStandalonePokemon(bytes, payload))
                : undefined;
        const entityFile =
          kind === "entityExport"
            ? new Uint8Array(api.ExportStandalonePokemon(bytes, payload))
            : undefined;
        const request: StandalonePokemonRequest = JSON.parse(payload);
        const details =
          kind === "entityDetails"
            ? JSON.parse(api.ReadStandalonePokemonAdvanced(bytes, payload))
            : undefined;
        const legality =
          kind === "entityLegality"
            ? JSON.parse(api.AnalyzeStandalonePokemon(bytes, payload))
            : undefined;
        const entity = output
          ? JSON.parse(
              api.InspectStandalonePokemon(
                output,
                JSON.stringify({
                  ...request,
                  fileName: `.${before.extension}`,
                  inputEncrypted: false,
                  useFileFormat: true,
                }),
              ),
            )
          : before;
        self.postMessage(
          { id, entity, output, entityFile, legality, details },
          output ? [output.buffer] : entityFile ? [entityFile.buffer] : [],
        );
        return;
      }
      if (kind?.startsWith("boxBinary")) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "boxBinaryDiscard") api.DiscardBoxBinary(payload);
        const output =
          kind === "boxBinaryCommit"
            ? new Uint8Array(api.CommitBoxBinary(bytes, payload))
            : undefined;
        const boxBinary =
          kind === "boxBinaryExport"
            ? new Uint8Array(api.ExportBoxBinary(bytes, payload))
            : undefined;
        self.postMessage(
          {
            id,
            report: output ? JSON.parse(api.Inspect(output)) : before,
            output,
            boxBinary,
            boxBinaryPreview:
              kind === "boxBinaryPreview"
                ? JSON.parse(api.PreviewBoxBinary(bytes, payload))
                : undefined,
          },
          output ? [output.buffer] : boxBinary ? [boxBinary.buffer] : [],
        );
        return;
      }
      if (kind?.startsWith("boxImport")) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "boxImportDiscard") api.DiscardBoxImport(payload);
        const output =
          kind === "boxImportCommit"
            ? new Uint8Array(api.CommitBoxImport(bytes, payload))
            : undefined;
        self.postMessage(
          {
            id,
            report: output ? JSON.parse(api.Inspect(output)) : before,
            output,
            boxImportPreview:
              kind === "boxImportPreview"
                ? JSON.parse(api.PreviewBoxImport(bytes, payload))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (kind?.startsWith("file") || kind === "boxArchive") {
        const report: SaveReport = JSON.parse(api.Inspect(bytes));
        if (report.apiVersion !== 145)
          throw new Error("Save editor API version mismatch.");
        if (kind === "fileDiscard") api.DiscardFileBatch(payload);
        const archive =
          kind === "boxArchive"
            ? new Uint8Array(api.ExportBoxes(bytes, payload))
            : kind === "fileExport"
              ? new Uint8Array(api.ExportFileBatch(payload))
              : undefined;
        self.postMessage(
          {
            id,
            report,
            archive,
            filePreview:
              kind === "filePreview"
                ? JSON.parse(api.PreviewFileBatch(bytes, payload))
                : undefined,
            fileCatalog:
              kind === "fileCatalog"
                ? JSON.parse(api.ReadFileBatchCatalog())
                : undefined,
          },
          archive ? [archive.buffer] : [],
        );
        return;
      }
      if (
        kind === "misc5" ||
        kind === "misc5Preview" ||
        kind === "misc5Edit" ||
        kind === "misc5Export"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Misc5: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "misc5Edit"
            ? Uint8Array.from(glCall(() => api.EditMisc5(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        const misc5File =
          kind === "misc5Export"
            ? Uint8Array.from(glCall(() => api.ExportMisc5(bytes)))
            : undefined;
        self.postMessage(
          {
            id,
            report,
            output,
            misc5File,
            misc5:
              kind === "misc5"
                ? JSON.parse(glCall(() => api.ReadMisc5(bytes)))
                : undefined,
            misc5Preview:
              kind === "misc5Preview"
                ? JSON.parse(glCall(() => api.PreviewMisc5(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : misc5File ? [misc5File.buffer] : [],
        );
        return;
      }
      if (
        kind === "medals5" ||
        kind === "medals5Preview" ||
        kind === "medals5Edit" ||
        kind === "medals5Export"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Medals5: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "medals5Edit"
            ? Uint8Array.from(glCall(() => api.EditMedals5(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        const medals5File =
          kind === "medals5Export"
            ? Uint8Array.from(glCall(() => api.ExportMedals5(bytes)))
            : undefined;
        self.postMessage(
          {
            id,
            report,
            output,
            medals5File,
            medals5:
              kind === "medals5"
                ? JSON.parse(glCall(() => api.ReadMedals5(bytes)))
                : undefined,
            medals5Preview:
              kind === "medals5Preview"
                ? JSON.parse(glCall(() => api.PreviewMedals5(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : medals5File ? [medals5File.buffer] : [],
        );
        return;
      }
      if (kind === "berryField6xy") {
        if (payload) throw Error("BerryField6XY: this tool is read-only.");
        const report: SaveReport = JSON.parse(api.Inspect(bytes));
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        let berryField6xy: import("./berryField6xy").Berry6XYCatalog;
        try {
          berryField6xy = JSON.parse(api.ReadBerryField6XY(bytes));
        } catch (error) {
          throw Error(
            "BerryField6XY: " +
              (error instanceof Error ? error.message : String(error)),
            { cause: error },
          );
        }
        self.postMessage({ id, report, berryField6xy });
        return;
      }
      if (
        kind === "avenue5" ||
        kind === "avenue5Preview" ||
        kind === "avenue5Edit" ||
        kind === "avenue5Export"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Avenue5: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "avenue5Edit"
            ? Uint8Array.from(glCall(() => api.EditAvenue5(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            avenue5File:
              kind === "avenue5Export"
                ? Uint8Array.from(
                    glCall(() => api.ExportAvenue5(bytes, payload)),
                  )
                : undefined,
            avenue5:
              kind === "avenue5"
                ? JSON.parse(glCall(() => api.ReadAvenue5(bytes)))
                : undefined,
            avenue5Preview:
              kind === "avenue5Preview"
                ? JSON.parse(glCall(() => api.PreviewAvenue5(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "link6" ||
        kind === "link6Preview" ||
        kind === "link6Edit" ||
        kind === "link6Export"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Link6: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "link6Edit"
            ? Uint8Array.from(glCall(() => api.EditLink6(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            link6File:
              kind === "link6Export"
                ? Uint8Array.from(glCall(() => api.ExportLink6(bytes, payload)))
                : undefined,
            link6:
              kind === "link6"
                ? JSON.parse(glCall(() => api.ReadLink6(bytes)))
                : undefined,
            link6Preview:
              kind === "link6Preview"
                ? JSON.parse(glCall(() => api.PreviewLink6(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "secretBase6" ||
        kind === "secretBase6Preview" ||
        kind === "secretBase6Edit" ||
        kind === "secretBase6Export"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "SecretBase6: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "secretBase6Edit"
            ? Uint8Array.from(glCall(() => api.EditSecretBase6(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            secretBase6File:
              kind === "secretBase6Export"
                ? Uint8Array.from(
                    glCall(() => api.ExportSecretBase6(bytes, payload)),
                  )
                : undefined,
            secretBase6:
              kind === "secretBase6"
                ? JSON.parse(glCall(() => api.ReadSecretBase6(bytes)))
                : undefined,
            secretBase6Preview:
              kind === "secretBase6Preview"
                ? JSON.parse(
                    glCall(() => api.PreviewSecretBase6(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (kind === "hall6" || kind === "hall6Preview" || kind === "hall6Edit") {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Hall6: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "hall6Edit"
            ? Uint8Array.from(glCall(() => api.EditHall6(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            hall6:
              kind === "hall6"
                ? JSON.parse(glCall(() => api.ReadHall6(bytes)))
                : undefined,
            hall6Preview:
              kind === "hall6Preview"
                ? JSON.parse(glCall(() => api.PreviewHall6(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (kind === "hall7" || kind === "hall7Preview" || kind === "hall7Edit") {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Hall7: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "hall7Edit"
            ? Uint8Array.from(glCall(() => api.EditHall7(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            hall7:
              kind === "hall7"
                ? JSON.parse(glCall(() => api.ReadHall7(bytes)))
                : undefined,
            hall7Preview:
              kind === "hall7Preview"
                ? JSON.parse(glCall(() => api.PreviewHall7(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "zygarde7" ||
        kind === "zygarde7Preview" ||
        kind === "zygarde7Edit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Zygarde7: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "zygarde7Edit"
            ? Uint8Array.from(glCall(() => api.EditZygarde7(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            zygarde7:
              kind === "zygarde7"
                ? JSON.parse(glCall(() => api.ReadZygarde7(bytes)))
                : undefined,
            zygarde7Preview:
              kind === "zygarde7Preview"
                ? JSON.parse(glCall(() => api.PreviewZygarde7(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "trainerGG" ||
        kind === "trainerGGPreview" ||
        kind === "trainerGGEdit" ||
        kind === "trainerGGExport" ||
        kind === "trainerGGArchive"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "TrainerGG: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "trainerGGEdit"
            ? Uint8Array.from(glCall(() => api.EditTrainerGG(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        const goParkFiles =
          kind === "trainerGGExport"
            ? JSON.parse(glCall(() => api.ExportGoPark(bytes, Number(payload))))
            : undefined;
        const archive =
          kind === "trainerGGArchive"
            ? Uint8Array.from(glCall(() => api.ExportGoParkArchive(bytes)))
            : undefined;
        self.postMessage(
          {
            id,
            report,
            output,
            goParkFiles,
            archive,
            trainerGG:
              kind === "trainerGG"
                ? JSON.parse(glCall(() => api.ReadTrainerGG(bytes)))
                : undefined,
            trainerGGPreview:
              kind === "trainerGGPreview"
                ? JSON.parse(glCall(() => api.PreviewTrainerGG(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : archive ? [archive.buffer] : [],
        );
        return;
      }
      if (
        kind === "sevenstar9" ||
        kind === "sevenstar9Preview" ||
        kind === "sevenstar9Commit" ||
        kind === "sevenstar9Discard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function sevenCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "SevenStar9: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        if (kind === "sevenstar9Discard")
          sevenCall(() => api.DiscardSevenStar9(payload));
        const output =
          kind === "sevenstar9Commit"
            ? Uint8Array.from(
                sevenCall(() => api.CommitSevenStar9(bytes, payload)),
              )
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            sevenstar9:
              kind === "sevenstar9"
                ? JSON.parse(
                    sevenCall(() => api.ReadSevenStar9(bytes, payload)),
                  )
                : undefined,
            sevenstar9Ticket:
              kind === "sevenstar9Preview"
                ? JSON.parse(
                    sevenCall(() => api.PreviewSevenStar9(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "raid9" ||
        kind === "raid9Preview" ||
        kind === "raid9Commit" ||
        kind === "raid9Discard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function raidCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Raid9: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        if (kind === "raid9Discard") raidCall(() => api.DiscardRaid9(payload));
        const output =
          kind === "raid9Commit"
            ? Uint8Array.from(raidCall(() => api.CommitRaid9(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            raid9:
              kind === "raid9"
                ? JSON.parse(raidCall(() => api.ReadRaid9(bytes)))
                : undefined,
            raid9Ticket:
              kind === "raid9Preview"
                ? JSON.parse(raidCall(() => api.PreviewRaid9(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "fashion9" ||
        kind === "fashion9Preview" ||
        kind === "fashion9Commit" ||
        kind === "fashion9Discard"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function fashionCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Fashion9: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        if (kind === "fashion9Discard")
          fashionCall(() => api.DiscardFashion9(payload));
        const output =
          kind === "fashion9Commit"
            ? Uint8Array.from(
                fashionCall(() => api.CommitFashion9(bytes, payload)),
              )
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            fashion9:
              kind === "fashion9"
                ? JSON.parse(
                    fashionCall(() => api.ReadFashion9(bytes, payload)),
                  )
                : undefined,
            fashion9Ticket:
              kind === "fashion9Preview"
                ? JSON.parse(
                    fashionCall(() => api.PreviewFashion9(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind !== undefined &&
        [
          "event9a",
          "event9aPreview",
          "event9aCommit",
          "event9aDiscard",
          "event9aCompare",
        ].includes(kind)
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function eventCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Event9a: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        if (kind === "event9aDiscard")
          eventCall(() => api.DiscardEvent9a(payload));
        const output =
          kind === "event9aCommit"
            ? Uint8Array.from(
                eventCall(() => api.CommitEvent9a(bytes, payload)),
              )
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            event9a:
              kind === "event9a"
                ? JSON.parse(eventCall(() => api.ReadEvent9a(bytes, payload)))
                : undefined,
            event9aTicket:
              kind === "event9aPreview"
                ? JSON.parse(
                    eventCall(() => api.PreviewEvent9a(bytes, payload)),
                  )
                : undefined,
            event9aComparison:
              kind === "event9aCompare"
                ? JSON.parse(
                    eventCall(() => api.CompareEvent9a(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "donut9a" ||
        kind === "donut9aPreview" ||
        kind === "donut9aCommit" ||
        kind === "donut9aDiscard" ||
        kind === "donut9aExport"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function donutCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Donut9a: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        if (kind === "donut9aDiscard")
          donutCall(() => api.DiscardDonut9a(payload));
        const output =
          kind === "donut9aCommit"
            ? Uint8Array.from(
                donutCall(() => api.CommitDonut9a(bytes, payload)),
              )
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        const donut9aFile =
          kind === "donut9aExport"
            ? Uint8Array.from(
                donutCall(() => api.ExportDonut9a(bytes, Number(payload))),
              )
            : undefined;
        self.postMessage(
          {
            id,
            report,
            output,
            donut9aFile,
            donut9a:
              kind === "donut9a"
                ? JSON.parse(donutCall(() => api.ReadDonut9a(bytes)))
                : undefined,
            donut9aTicket:
              kind === "donut9aPreview"
                ? JSON.parse(
                    donutCall(() => api.PreviewDonut9a(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : donut9aFile ? [donut9aFile.buffer] : [],
        );
        return;
      }
      if (
        kind === "trainer8" ||
        kind === "trainer8Preview" ||
        kind === "trainer8Edit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Trainer8: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "trainer8Edit"
            ? Uint8Array.from(glCall(() => api.EditTrainer8(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            trainer8:
              kind === "trainer8"
                ? JSON.parse(glCall(() => api.ReadTrainer8(bytes)))
                : undefined,
            trainer8Preview:
              kind === "trainer8Preview"
                ? JSON.parse(glCall(() => api.PreviewTrainer8(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "trainer8a" ||
        kind === "trainer8aPreview" ||
        kind === "trainer8aEdit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Trainer8a: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "trainer8aEdit"
            ? Uint8Array.from(glCall(() => api.EditTrainer8a(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            trainer8a:
              kind === "trainer8a"
                ? JSON.parse(glCall(() => api.ReadTrainer8a(bytes)))
                : undefined,
            trainer8aPreview:
              kind === "trainer8aPreview"
                ? JSON.parse(glCall(() => api.PreviewTrainer8a(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "trainer8b" ||
        kind === "trainer8bPreview" ||
        kind === "trainer8bEdit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Trainer8b: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "trainer8bEdit"
            ? Uint8Array.from(glCall(() => api.EditTrainer8b(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            trainer8b:
              kind === "trainer8b"
                ? JSON.parse(glCall(() => api.ReadTrainer8b(bytes)))
                : undefined,
            trainer8bPreview:
              kind === "trainer8bPreview"
                ? JSON.parse(glCall(() => api.PreviewTrainer8b(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (kind === "raid8" || kind === "raid8Preview" || kind === "raid8Edit") {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Raid8: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "raid8Edit"
            ? Uint8Array.from(glCall(() => api.EditRaid8(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            raid8:
              kind === "raid8"
                ? JSON.parse(glCall(() => api.ReadRaid8(bytes)))
                : undefined,
            raid8Preview:
              kind === "raid8Preview"
                ? JSON.parse(glCall(() => api.PreviewRaid8(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "underground8b" ||
        kind === "underground8bPreview" ||
        kind === "underground8bEdit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Underground8b: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "underground8bEdit"
            ? Uint8Array.from(
                glCall(() => api.EditUnderground8b(bytes, payload)),
              )
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            underground8b:
              kind === "underground8b"
                ? JSON.parse(glCall(() => api.ReadUnderground8b(bytes)))
                : undefined,
            underground8bPreview:
              kind === "underground8bPreview"
                ? JSON.parse(
                    glCall(() => api.PreviewUnderground8b(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "seal8b" ||
        kind === "seal8bPreview" ||
        kind === "seal8bEdit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Seal8b: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "seal8bEdit"
            ? Uint8Array.from(glCall(() => api.EditSeal8b(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            seal8b:
              kind === "seal8b"
                ? JSON.parse(glCall(() => api.ReadSeal8b(bytes)))
                : undefined,
            seal8bPreview:
              kind === "seal8bPreview"
                ? JSON.parse(glCall(() => api.PreviewSeal8b(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "misc8b" ||
        kind === "misc8bPreview" ||
        kind === "misc8bEdit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Misc8b: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "misc8bEdit"
            ? Uint8Array.from(glCall(() => api.EditMisc8b(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            misc8b:
              kind === "misc8b"
                ? JSON.parse(glCall(() => api.ReadMisc8b(bytes)))
                : undefined,
            misc8bPreview:
              kind === "misc8bPreview"
                ? JSON.parse(glCall(() => api.PreviewMisc8b(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "trainer7" ||
        kind === "trainer7Preview" ||
        kind === "trainer7Edit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Trainer7: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "trainer7Edit"
            ? Uint8Array.from(glCall(() => api.EditTrainer7(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            trainer7:
              kind === "trainer7"
                ? JSON.parse(glCall(() => api.ReadTrainer7(bytes)))
                : undefined,
            trainer7Preview:
              kind === "trainer7Preview"
                ? JSON.parse(glCall(() => api.PreviewTrainer7(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "trainer6" ||
        kind === "trainer6Preview" ||
        kind === "trainer6Edit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Trainer6: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "trainer6Edit"
            ? Uint8Array.from(glCall(() => api.EditTrainer6(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            trainer6:
              kind === "trainer6"
                ? JSON.parse(glCall(() => api.ReadTrainer6(bytes)))
                : undefined,
            trainer6Preview:
              kind === "trainer6Preview"
                ? JSON.parse(glCall(() => api.PreviewTrainer6(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "superTrain6" ||
        kind === "superTrain6Preview" ||
        kind === "superTrain6Edit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "SuperTrain6: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "superTrain6Edit"
            ? Uint8Array.from(glCall(() => api.EditSuperTrain6(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            superTrain6:
              kind === "superTrain6"
                ? JSON.parse(glCall(() => api.ReadSuperTrain6(bytes)))
                : undefined,
            superTrain6Preview:
              kind === "superTrain6Preview"
                ? JSON.parse(
                    glCall(() => api.PreviewSuperTrain6(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "unityTower5" ||
        kind === "unityTower5Preview" ||
        kind === "unityTower5Edit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "UnityTower5: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "unityTower5Edit"
            ? Uint8Array.from(glCall(() => api.EditUnityTower5(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            unityTower5:
              kind === "unityTower5"
                ? JSON.parse(glCall(() => api.ReadUnityTower5(bytes)))
                : undefined,
            unityTower5Preview:
              kind === "unityTower5Preview"
                ? JSON.parse(
                    glCall(() => api.PreviewUnityTower5(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "globalLink5" ||
        kind === "globalLink5Preview" ||
        kind === "globalLink5Edit"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function glCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "GlobalLink5: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "globalLink5Edit"
            ? Uint8Array.from(glCall(() => api.EditGlobalLink5(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            globalLink5:
              kind === "globalLink5"
                ? JSON.parse(glCall(() => api.ReadGlobalLink5(bytes)))
                : undefined,
            globalLink5Preview:
              kind === "globalLink5Preview"
                ? JSON.parse(
                    glCall(() => api.PreviewGlobalLink5(bytes, payload)),
                  )
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "dlc5" ||
        kind === "dlc5Preview" ||
        kind === "dlc5Edit" ||
        kind === "dlc5Export"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function dlcCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "Dlc5: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "dlc5Edit"
            ? Uint8Array.from(dlcCall(() => api.EditDlc5(bytes, payload)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            dlc5:
              kind === "dlc5"
                ? JSON.parse(dlcCall(() => api.ReadDlc5(bytes)))
                : undefined,
            dlc5Preview:
              kind === "dlc5Preview"
                ? JSON.parse(dlcCall(() => api.PreviewDlc5(bytes, payload)))
                : undefined,
            dlc5File:
              kind === "dlc5Export"
                ? JSON.parse(dlcCall(() => api.ExportDlc5(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (
        kind === "cgear5" ||
        kind === "cgear5Preview" ||
        kind === "cgear5Edit" ||
        kind === "cgear5Export"
      ) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        function cgearCall<T>(action: () => T): T {
          try {
            return action();
          } catch (error) {
            throw Error(
              "CGear5: " +
                (error instanceof Error ? error.message : String(error)),
              { cause: error },
            );
          }
        }
        const output =
          kind === "cgear5Edit"
            ? Uint8Array.from(cgearCall(() => api.EditCGear5(bytes, payload)))
            : undefined;
        const cgear5File =
          kind === "cgear5Export"
            ? Uint8Array.from(cgearCall(() => api.ExportCGear5(bytes)))
            : undefined;
        const report: SaveReport = output
          ? JSON.parse(api.Inspect(output))
          : before;
        if (report.apiVersion !== 145)
          throw Error("Save editor API version mismatch.");
        self.postMessage(
          {
            id,
            report,
            output,
            cgear5File,
            cgear5:
              kind === "cgear5"
                ? JSON.parse(cgearCall(() => api.ReadCGear5(bytes)))
                : undefined,
            cgear5Preview:
              kind === "cgear5Preview"
                ? JSON.parse(cgearCall(() => api.PreviewCGear5(bytes, payload)))
                : undefined,
          },
          output ? [output.buffer] : cgear5File ? [cgear5File.buffer] : [],
        );
        return;
      }
      if (kind === "propertyDiscard") api.DiscardPropertyBatch(payload);
      const output =
        (edit === undefined && kind !== "exportWorkingCopy") ||
        kind === "propertyCatalog" ||
        kind === "propertyPreview" ||
        kind === "propertyDiscard" ||
        kind === "pokedex9a" ||
        kind === "pokedex9" ||
        kind === "pokedex8a" ||
        kind === "pokedex8" ||
        kind === "pokedex8b" ||
        kind === "pokedex7" ||
        kind === "pokedex6" ||
        kind === "pokedex5" ||
        kind === "pokedex4" ||
        kind === "pokedex" ||
        kind === "inventory" ||
        kind === "events" ||
        kind === "eventsCompare" ||
        kind === "gsBall2" ||
        kind === "hall3" ||
        kind === "hall1" ||
        kind === "eventReset" ||
        kind === "ferry3" ||
        kind === "misc3" ||
        kind === "secretBase3" ||
        kind === "secretBase3Form" ||
        kind === "pokegear4" ||
        kind === "pokeathlon4" ||
        kind === "battlePass4" ||
        kind === "battlePass4Preview" ||
        kind === "battlePass4Export" ||
        kind === "brTrainer4" ||
        kind === "battleVideo4" ||
        kind === "video4Preview" ||
        kind === "video4Export" ||
        kind === "geonet4" ||
        kind === "misc4" ||
        kind === "misc4Preview" ||
        kind === "underground4" ||
        kind === "underground4Preview" ||
        kind === "honeyTree4" ||
        kind === "br4Gear" ||
        kind === "inspectWorking" ||
        kind === "joyful3" ||
        kind === "frontier3" ||
        kind === "gameRecords3" ||
        kind === "paintings3" ||
        kind === "decorations3" ||
        kind === "roamer3" ||
        kind === "roamer" ||
        kind === "rtc" ||
        kind === "opowers" ||
        kind === "food" ||
        kind === "records" ||
        kind === "legality" ||
        kind === "pokemonExport" ||
        kind === "originCatalog" ||
        kind === "historyCatalog" ||
        kind === "memoryCatalog" ||
        kind === "ribbons" ||
        kind === "relearnSuggestion"
          ? undefined
          : new Uint8Array(
              kind === "ferry3Edit"
                ? api.EditFerry3(bytes, payload)
                : kind === "misc3Edit"
                  ? api.EditMisc3(bytes, payload)
                  : kind === "secretBase3Edit"
                    ? api.EditSecretBase3(bytes, payload)
                    : kind === "pokegear4Edit"
                      ? api.EditPokeGear4(bytes, payload)
                      : kind === "pokeathlon4Edit"
                        ? api.EditPokeathlon4(bytes, payload)
                        : kind === "battlePass4Edit"
                          ? api.EditBattlePass4(bytes, payload)
                          : kind === "brTrainer4Edit"
                            ? api.EditBrTrainer4(bytes, payload)
                            : kind === "video4Import"
                              ? api.ImportBattleVideo4(bytes, payload)
                              : kind === "geonet4Edit"
                                ? api.EditGeonet4(bytes, payload)
                                : kind === "misc4Edit"
                                  ? api.EditMisc4(bytes, payload)
                                  : kind === "underground4Edit"
                                    ? api.EditUnderground4(bytes, payload)
                                    : kind === "honeyTree4Edit"
                                      ? api.EditHoneyTree4(bytes, payload)
                                      : kind === "br4GearEdit"
                                        ? api.EditBr4Gear(bytes, payload)
                                        : kind === "joyful3Edit"
                                          ? api.EditJoyful3(bytes, payload)
                                          : kind === "frontier3Edit"
                                            ? api.EditFrontier3(bytes, payload)
                                            : kind === "gameRecords3Edit"
                                              ? api.EditGameRecords3(
                                                  bytes,
                                                  payload,
                                                )
                                              : kind === "paintings3Edit"
                                                ? api.EditPaintings3(
                                                    bytes,
                                                    payload,
                                                  )
                                                : kind === "decorations3Edit"
                                                  ? api.EditDecorations3(
                                                      bytes,
                                                      payload,
                                                    )
                                                  : kind === "roamer3Edit"
                                                    ? api.EditRoamer3(
                                                        bytes,
                                                        payload,
                                                      )
                                                    : kind === "hall3Edit"
                                                      ? api.EditHall3(
                                                          bytes,
                                                          payload,
                                                        )
                                                      : kind === "gsBall2Edit"
                                                        ? api.EnableGsBall2(
                                                            bytes,
                                                          )
                                                        : kind === "hall1Edit"
                                                          ? api.EditHall1(
                                                              bytes,
                                                              payload,
                                                            )
                                                          : kind ===
                                                              "eventResetEdit"
                                                            ? api.EditEventReset(
                                                                bytes,
                                                                payload,
                                                              )
                                                            : kind ===
                                                                "eventsEdit"
                                                              ? api.EditEvents(
                                                                  bytes,
                                                                  payload,
                                                                )
                                                              : kind ===
                                                                  "propertyCommit"
                                                                ? api.CommitPropertyBatch(
                                                                    bytes,
                                                                    payload,
                                                                  )
                                                                : kind ===
                                                                    "exportWorkingCopy"
                                                                  ? api.ExportWorkingCopy(
                                                                      bytes,
                                                                    )
                                                                  : kind ===
                                                                      "pokedex9aEdit"
                                                                    ? api.EditPokedex9a(
                                                                        bytes,
                                                                        payload,
                                                                      )
                                                                    : kind ===
                                                                        "pokedex9Edit"
                                                                      ? api.EditPokedex9(
                                                                          bytes,
                                                                          payload,
                                                                        )
                                                                      : kind ===
                                                                          "pokedex8aEdit"
                                                                        ? api.EditPokedex8a(
                                                                            bytes,
                                                                            payload,
                                                                          )
                                                                        : kind ===
                                                                            "pokedex8Edit"
                                                                          ? api.EditPokedex8(
                                                                              bytes,
                                                                              payload,
                                                                            )
                                                                          : kind ===
                                                                              "pokedex8bEdit"
                                                                            ? api.EditPokedex8b(
                                                                                bytes,
                                                                                payload,
                                                                              )
                                                                            : kind ===
                                                                                "pokedex7Edit"
                                                                              ? api.EditPokedex7(
                                                                                  bytes,
                                                                                  payload,
                                                                                )
                                                                              : kind ===
                                                                                  "pokedex6Edit"
                                                                                ? api.EditPokedex6(
                                                                                    bytes,
                                                                                    payload,
                                                                                  )
                                                                                : kind ===
                                                                                    "pokedex5Edit"
                                                                                  ? api.EditPokedex5(
                                                                                      bytes,
                                                                                      payload,
                                                                                    )
                                                                                  : kind ===
                                                                                      "pokedex4Edit"
                                                                                    ? api.EditPokedex4(
                                                                                        bytes,
                                                                                        payload,
                                                                                      )
                                                                                    : kind ===
                                                                                        "pokedexEdit"
                                                                                      ? api.EditPokedex(
                                                                                          bytes,
                                                                                          payload,
                                                                                        )
                                                                                      : kind ===
                                                                                          "roamerEdit"
                                                                                        ? api.EditRoamer(
                                                                                            bytes,
                                                                                            payload,
                                                                                          )
                                                                                        : kind ===
                                                                                            "rtcEdit"
                                                                                          ? api.EditRtc(
                                                                                              bytes,
                                                                                              payload,
                                                                                            )
                                                                                          : kind ===
                                                                                              "opowersEdit"
                                                                                            ? api.EditOPowers(
                                                                                                bytes,
                                                                                                payload,
                                                                                              )
                                                                                            : kind ===
                                                                                                "foodEdit"
                                                                                              ? api.EditFood(
                                                                                                  bytes,
                                                                                                  payload,
                                                                                                )
                                                                                              : kind ===
                                                                                                  "recordEdit"
                                                                                                ? api.EditRecord(
                                                                                                    bytes,
                                                                                                    payload,
                                                                                                  )
                                                                                                : kind ===
                                                                                                    "inventoryBatch"
                                                                                                  ? api.EditInventoryBatch(
                                                                                                      bytes,
                                                                                                      payload,
                                                                                                    )
                                                                                                  : kind ===
                                                                                                      "inventoryEdit"
                                                                                                    ? api.EditInventory(
                                                                                                        bytes,
                                                                                                        payload,
                                                                                                      )
                                                                                                    : kind ===
                                                                                                        "pokemonRaw"
                                                                                                      ? api.EditPokemonRaw(
                                                                                                          bytes,
                                                                                                          payload,
                                                                                                        )
                                                                                                      : kind ===
                                                                                                          "pokemon"
                                                                                                        ? api.EditPokemon(
                                                                                                            bytes,
                                                                                                            payload,
                                                                                                          )
                                                                                                        : kind ===
                                                                                                            "box"
                                                                                                          ? api.EditBox(
                                                                                                              bytes,
                                                                                                              payload,
                                                                                                            )
                                                                                                          : kind ===
                                                                                                              "storage"
                                                                                                            ? api.EditStorage(
                                                                                                                bytes,
                                                                                                                payload,
                                                                                                              )
                                                                                                            : kind ===
                                                                                                                "pokemonImport"
                                                                                                              ? api.ImportPokemon(
                                                                                                                  bytes,
                                                                                                                  payload,
                                                                                                                )
                                                                                                              : api.Export(
                                                                                                                  bytes,
                                                                                                                  payload,
                                                                                                                ),
            );
      const report: SaveReport = JSON.parse(api.Inspect(output ?? bytes));
      if (report.apiVersion !== 145)
        throw new Error("Save editor API version mismatch.");
      const legality: PokemonLegalityReport | undefined =
        kind === "legality" && edit !== undefined
          ? JSON.parse(api.AnalyzePokemon(bytes, payload))
          : undefined;
      const pokemonFile =
        kind === "pokemonExport" && edit !== undefined
          ? JSON.parse(api.ExportPokemon(bytes, payload))
          : undefined;
      const originCatalog =
        kind === "originCatalog" && edit !== undefined
          ? JSON.parse(api.ReadOrigin(bytes, payload))
          : undefined;
      const relearnSuggestion =
        kind === "relearnSuggestion" && edit !== undefined
          ? JSON.parse(api.SuggestRelearn(bytes, payload))
          : undefined;
      const ribbons =
        kind === "ribbons" && edit !== undefined
          ? JSON.parse(api.ReadRibbons(bytes, payload))
          : undefined;
      const historyCatalog =
        kind === "historyCatalog" && edit !== undefined
          ? JSON.parse(api.ReadHistory(bytes, payload))
          : undefined;
      const memoryCatalog =
        kind === "memoryCatalog" && edit !== undefined
          ? JSON.parse(api.ReadMemory(bytes, payload))
          : undefined;
      self.postMessage(
        {
          id,
          report,
          pokedex9a:
            kind === "pokedex9a"
              ? JSON.parse(api.ReadPokedex9a(bytes))
              : undefined,
          pokedex9:
            kind === "pokedex9"
              ? JSON.parse(api.ReadPokedex9(bytes))
              : undefined,
          pokedex8a:
            kind === "pokedex8a"
              ? JSON.parse(api.ReadPokedex8a(bytes))
              : undefined,
          pokedex8:
            kind === "pokedex8"
              ? JSON.parse(api.ReadPokedex8(bytes))
              : undefined,
          pokedex8b:
            kind === "pokedex8b"
              ? JSON.parse(api.ReadPokedex8b(bytes))
              : undefined,
          pokedex7:
            kind === "pokedex7"
              ? JSON.parse(api.ReadPokedex7(bytes))
              : undefined,
          pokedex6:
            kind === "pokedex6"
              ? JSON.parse(api.ReadPokedex6(bytes))
              : undefined,
          pokedex5:
            kind === "pokedex5"
              ? JSON.parse(api.ReadPokedex5(bytes))
              : undefined,
          pokedex4:
            kind === "pokedex4"
              ? JSON.parse(api.ReadPokedex4(bytes))
              : undefined,
          pokedex:
            kind === "pokedex" && edit !== undefined
              ? JSON.parse(api.ReadPokedex(bytes, payload))
              : undefined,
          events:
            kind === "events"
              ? JSON.parse(api.ReadEvents(bytes, payload))
              : undefined,
          eventDiff:
            kind === "eventsCompare"
              ? JSON.parse(api.CompareEvents(bytes, payload))
              : undefined,
          gsBall2:
            kind === "gsBall2" ? JSON.parse(api.ReadGsBall2(bytes)) : undefined,
          hall3:
            kind === "hall3"
              ? JSON.parse(api.ReadHall3(bytes, payload))
              : undefined,
          hall1:
            kind === "hall1" ? JSON.parse(api.ReadHall1(bytes)) : undefined,
          eventReset:
            kind === "eventReset"
              ? JSON.parse(api.ReadEventReset(bytes, payload))
              : undefined,
          ferry3:
            kind === "ferry3" ? JSON.parse(api.ReadFerry3(bytes)) : undefined,
          misc3:
            kind === "misc3" ? JSON.parse(api.ReadMisc3(bytes)) : undefined,
          secretBase3:
            kind === "secretBase3"
              ? JSON.parse(api.ReadSecretBase3(bytes))
              : undefined,
          secretBase3Form:
            kind === "secretBase3Form"
              ? JSON.parse(api.SuggestSecretBase3Form(bytes, payload))
              : undefined,
          pokegear4:
            kind === "pokegear4"
              ? JSON.parse(api.ReadPokeGear4(bytes))
              : undefined,
          pokeathlon4:
            kind === "pokeathlon4"
              ? JSON.parse(api.ReadPokeathlon4(bytes))
              : undefined,
          battlePassPreview:
            kind === "battlePass4Preview"
              ? JSON.parse(api.PreviewBattlePassPokemon4(bytes, payload))
              : undefined,
          battlePass4:
            kind === "battlePass4"
              ? JSON.parse(api.ReadBattlePass4(bytes, payload))
              : undefined,
          battlePassFile:
            kind === "battlePass4Export"
              ? (() => {
                  const query = JSON.parse(payload) as {
                    index: number;
                    slot?: number;
                  };
                  return {
                    fileName:
                      query.slot === undefined
                        ? `battle-pass-${query.index + 1}.bin`
                        : `battle-pass-${query.index + 1}-${query.slot + 1}.bk4`,
                    data:
                      query.slot === undefined
                        ? api.ExportBattlePass4(bytes, query.index)
                        : api.ExportBattlePassPokemon4(
                            bytes,
                            query.index,
                            query.slot,
                          ),
                  };
                })()
              : undefined,
          brTrainer4:
            kind === "brTrainer4"
              ? JSON.parse(api.ReadBrTrainer4(bytes))
              : undefined,
          battleVideo4:
            kind === "battleVideo4"
              ? JSON.parse(api.ReadBattleVideo4(bytes, payload))
              : undefined,
          video4Preview:
            kind === "video4Preview"
              ? JSON.parse(api.PreviewBattleVideo4(bytes, payload))
              : undefined,
          video4File:
            kind === "video4Export"
              ? JSON.parse(api.ExportBattleVideo4(bytes, payload))
              : undefined,
          geonet4:
            kind === "geonet4" ? JSON.parse(api.ReadGeonet4(bytes)) : undefined,
          misc4:
            kind === "misc4" ? JSON.parse(api.ReadMisc4(bytes)) : undefined,
          misc4Preview:
            kind === "misc4Preview"
              ? JSON.parse(api.PreviewMisc4(bytes, payload))
              : undefined,
          underground4:
            kind === "underground4"
              ? JSON.parse(api.ReadUnderground4(bytes))
              : undefined,
          underground4Preview:
            kind === "underground4Preview"
              ? JSON.parse(api.PreviewUnderground4(bytes, payload))
              : undefined,
          honeyTree4:
            kind === "honeyTree4"
              ? JSON.parse(api.ReadHoneyTree4(bytes))
              : undefined,
          br4Gear:
            kind === "br4Gear" ? JSON.parse(api.ReadBr4Gear(bytes)) : undefined,
          joyful3:
            kind === "joyful3" ? JSON.parse(api.ReadJoyful3(bytes)) : undefined,
          frontier3:
            kind === "frontier3"
              ? JSON.parse(api.ReadFrontier3(bytes))
              : undefined,
          gameRecords3:
            kind === "gameRecords3"
              ? JSON.parse(api.ReadGameRecords3(bytes))
              : undefined,
          paintings3:
            kind === "paintings3"
              ? JSON.parse(api.ReadPaintings3(bytes))
              : undefined,
          decorations3:
            kind === "decorations3"
              ? JSON.parse(api.ReadDecorations3(bytes))
              : undefined,
          roamer3:
            kind === "roamer3" ? JSON.parse(api.ReadRoamer3(bytes)) : undefined,
          roamer:
            kind === "roamer" ? JSON.parse(api.ReadRoamer(bytes)) : undefined,
          rtc: kind === "rtc" ? JSON.parse(api.ReadRtc(bytes)) : undefined,
          opowers:
            kind === "opowers" ? JSON.parse(api.ReadOPowers(bytes)) : undefined,
          food: kind === "food" ? JSON.parse(api.ReadFood(bytes)) : undefined,
          records:
            kind === "records" ? JSON.parse(api.ReadRecords(bytes)) : undefined,
          inventory:
            kind === "inventory"
              ? JSON.parse(api.ReadInventory(bytes))
              : undefined,
          propertyCatalog:
            kind === "propertyCatalog"
              ? JSON.parse(api.ReadPropertyBatchCatalog(bytes))
              : undefined,
          propertyPreview:
            kind === "propertyPreview"
              ? JSON.parse(api.PreviewPropertyBatch(bytes, payload))
              : undefined,
          output,
          legality,
          pokemonFile,
          originCatalog,
          relearnSuggestion,
          ribbons,
          memoryCatalog,
          historyCatalog,
        },
        output ? [output.buffer] : [],
      );
    } catch (error) {
      self.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
