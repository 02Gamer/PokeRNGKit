// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Bulk;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Runtime.InteropServices.JavaScript;

namespace PokeRNGKit.SaveEditor;

public static partial class Program
{
    [JSExport]
    public static string AnalyzeStoredPokemon(byte[] data) => SaveService.AnalyzeStoredPokemon(data);
}

internal sealed record SaveBulkLegalityReport(int ApiVersion,string SourceHash,bool Clean,
    int AnalyzedCount,int FindingCount,LocalizedText Report);

internal static class SaveBulkLegality
{
    // Source: SAVEditor.ClickVerifyStoredEntities. Use the SaveFile overload:
    // the enumerable overload omits save-specific fusion and unique-item checks.
    internal static SaveBulkLegalityReport AnalyzeOwned(SaveFile save,string sourceHash)
    {
        var settings=SaveProgramSettingsRuntime.Current?.Legality.Bulk ?? new BulkAnalysisSettings();
        // SaveService.Open supplies detached bytes. SAV3.Clone calls GetFinalData,
        // which can rewrite sector checksums, so do not clone/serialize this read.
        var analysis=new BulkAnalysis(save,settings);
        string Report(string language)
        {
            var localization=LegalityLocalizationSet.GetLocalization(language);
            // The source shows Clean without calling Report for a clean save.
            // Report indexes AllAnalysis[0], so this also preserves empty saves.
            return analysis.Valid ? localization.Lines.Valid : analysis.Report(localization);
        }
        return new(SaveService.ApiVersion,sourceHash,analysis.Valid,analysis.AllData.Count,analysis.Parse.Count,
            new(Report("zh-Hans"),Report("en"),Report("ja")));
    }
}

public static partial class SaveService
{
    public static string AnalyzeStoredPokemon(byte[] data)
        => JsonSerializer.Serialize(SaveBulkLegality.AnalyzeOwned(Open(data),Br4Editing.Hash(data)),
            SaveBulkLegalityJson.Default.SaveBulkLegalityReport);
}
[JsonSourceGenerationOptions(PropertyNamingPolicy=JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveBulkLegalityReport))]
internal partial class SaveBulkLegalityJson:JsonSerializerContext{}
