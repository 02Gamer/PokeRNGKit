// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Core.Bulk;
using PokeRNGKit.SaveEditor;

internal static class SaveBulkLegalityTests
{
    internal static void Run(Func<GameVersion,SaveFile> create)
    {
        try {
            foreach(bool checkHandler in new[]{true,false}) {
                var settings=SaveProgramSettingsCodec.Defaults();settings.Legality.Bulk.CheckActiveHandler=checkHandler;
                SaveProgramSettingsRuntime.Reset();
                SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
                foreach(var version in new[]{GameVersion.E,GameVersion.D,GameVersion.Pt,GameVersion.HG,GameVersion.B,GameVersion.B2,GameVersion.X,GameVersion.OR,GameVersion.SN,GameVersion.US,GameVersion.BD}) {
                    var save=create(version);
                    Compare(save,checkHandler);
                    var pokemon=save.BlankPKM;
                    pokemon.Species=25;pokemon.PID=0x12345678;pokemon.Language=2;pokemon.Version=version;
                    pokemon.OriginalTrainerName=save.OT;pokemon.ID32=save.ID32;pokemon.RefreshChecksum();
                    save.SetBoxSlotAtIndex(pokemon,0,0,EntityImportSettings.None);
                    save.SetBoxSlotAtIndex(pokemon.Clone(),0,1,EntityImportSettings.None);
                    var report=Compare(save,checkHandler);
                    if(report.Clean || report.FindingCount==0 || report.AnalyzedCount<2)throw new Exception("Cross-entry clones were not reported.");
                }
            }
            var corrupt=create(GameVersion.X);
            var pk=corrupt.BlankPKM;pk.Species=25;pk.PID=0x12345678;pk.RefreshChecksum();
            corrupt.SetBoxSlotAtIndex(pk,0,0,EntityImportSettings.None);
            corrupt.Data[corrupt.GetBoxSlotOffset(0,0)+0x24]^=0x80;
            if(corrupt.GetBoxSlotAtIndex(0,0).ChecksumValid)throw new Exception("Corrupt fixture did not invalidate the entity checksum.");
            var excluded=Compare(corrupt,false);
            if(excluded.AnalyzedCount!=0 || !excluded.Clean)throw new Exception("Source checksum exclusion or empty-save handling differs.");
            CheckHandlerPolicy(create);
            var defaults=SaveProgramSettingsCodec.Defaults();defaults.Legality.Bulk.CheckActiveHandler=false;
            SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(defaults,SaveProgramSettingsJson.Default.SaveProgramSettings));
            var realPath=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");
            if(!string.IsNullOrEmpty(realPath)) {
                var bytes=File.ReadAllBytes(realPath);var before=bytes.ToArray();
                var save=SaveUtil.GetSaveFile(bytes.ToArray())??throw new Exception("Real save not recognized.");
                var report=Compare(save,false);
                if(report.AnalyzedCount!=25 || !File.ReadAllBytes(realPath).SequenceEqual(before) || !bytes.SequenceEqual(before))throw new Exception("Real E.sav count or byte preservation failed.");
                Console.WriteLine($"PASS real E.sav bulk: {report.AnalyzedCount} source entries, {report.FindingCount} findings, all three reports match Core, original bytes preserved");
            }
            Console.WriteLine("PASS bulk legality: 11 formats, both handler policies, empty saves, clones, checksum exclusion, complete Core reports in three languages, input preservation");
        } finally { SaveProgramSettingsRuntime.Reset(); }
    }
    private static void CheckHandlerPolicy(Func<GameVersion,SaveFile> create)
    {
        var pokemon=new PK6(File.ReadAllBytes("third_party/pkhex/legality-fixtures/legal-castform.pk6"));
        var save=create(pokemon.Version);
        save.Language=pokemon.Language;save.Gender=pokemon.OriginalTrainerGender;
        save.OT=pokemon.CurrentHandler==0?"OTHER":pokemon.OriginalTrainerName;
        save.ID32=pokemon.CurrentHandler==0?pokemon.ID32^1u:pokemon.ID32;
        save.SetBoxSlotAtIndex(pokemon,0,0,EntityImportSettings.None);
        var bytes=save.Write().ToArray();
        var parsed=SaveUtil.GetSaveFile(bytes.ToArray())??throw new Exception("Handler fixture save not recognized.");
        var analysis=new LegalityAnalysis(parsed.GetBoxSlotAtIndex(0,0),parsed.Personal,StorageSlotType.Box);
        if(!analysis.Valid)throw new Exception("Handler fixture must retain independent single-entity legality: "+analysis.Report("en",true));
        foreach(bool enabled in new[]{true,false}) {
            var settings=SaveProgramSettingsCodec.Defaults();settings.Legality.Bulk.CheckActiveHandler=enabled;
            SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
            var report=Compare(parsed,enabled);
            if(report.Clean==enabled)throw new Exception("Active-handler policy did not change bulk results as expected: "+report.Report.En);
        }
        Console.WriteLine("PASS active-handler policy: legal upstream PK6 remains independently legal; enabled policy detects save/handler mismatch, disabled policy is clean");
    }
    private static SaveBulkLegalityReport Compare(SaveFile save,bool checkHandler)
    {
        var before=save.Data.ToArray();
        var hash=Br4Editing.Hash(before);
        var expected=new BulkAnalysis(save,new BulkAnalysisSettings{CheckActiveHandler=checkHandler});
        var actual=SaveBulkLegality.AnalyzeOwned(save,hash);
        if(actual.ApiVersion!=SaveService.ApiVersion || actual.SourceHash!=hash || actual.Clean!=expected.Valid || actual.AnalyzedCount!=expected.AllData.Count || actual.FindingCount!=expected.Parse.Count)throw new Exception("Bulk analysis metadata differs from Core.");
        foreach(var language in new[]{"zh-Hans","en","ja"}) {
            var localization=LegalityLocalizationSet.GetLocalization(language);
            var report=expected.Valid?localization.Lines.Valid:expected.Report(localization);
            var text=language=="zh-Hans"?actual.Report.Zh:language=="en"?actual.Report.En:actual.Report.Ja;
            if(text!=report)throw new Exception($"Bulk report differs from Core ({language}).");
        }
        if(!save.Data.SequenceEqual(before))throw new Exception("Bulk analysis mutated the save.");
        var input=save.Write().ToArray();var original=input.ToArray();
        var reopened=SaveUtil.GetSaveFile(input.ToArray())??throw new Exception("Bulk fixture was not recognized.");
        var reference=new BulkAnalysis(reopened,new BulkAnalysisSettings{CheckActiveHandler=checkHandler});
        var wire=JsonSerializer.Deserialize(SaveService.AnalyzeStoredPokemon(input),SaveBulkLegalityJson.Default.SaveBulkLegalityReport)!;
        if(wire.SourceHash!=Br4Editing.Hash(original)||wire.Clean!=reference.Valid||wire.AnalyzedCount!=reference.AllData.Count||wire.FindingCount!=reference.Parse.Count||!input.SequenceEqual(original))throw new Exception("Bulk API source binding, source metadata, or input preservation differs.");
        return actual;
    }
}
