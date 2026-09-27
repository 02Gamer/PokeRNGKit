// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record StandalonePokemonRequest(string FileName, bool InputEncrypted = false, bool Party = false, bool Encrypted = false, PokemonEdit? Edit = null,
    PokemonRawEdit? Raw = null, string? ReadKind = null, int Handler = 0, int? Memory = null, int? Version = null, bool UseFileFormat = false, StandaloneEggTrainer? EggTrainer = null, GbPokemonEdit? Gb = null);

internal sealed record StandaloneAdvancedData(RibbonCatalog? Ribbons = null, HistoryCatalog? History = null, MemoryCatalog? Memory = null, ushort[]? Relearn = null, OriginCatalog? Origin = null, StandaloneEggCatalog? EggContext = null);

internal static class StandalonePokemonRequests
{
    public static StandalonePokemonRequest Read(string json)
    {
        if (json is null || json.Length > 1024 * 1024) throw new ArgumentException("Entity file request exceeds limits.");
        var request = JsonSerializer.Deserialize(json, StandalonePokemonJson.Default.StandalonePokemonRequest)
            ?? throw new ArgumentException("Entity file request is missing.");
        if (string.IsNullOrWhiteSpace(request.FileName) || request.FileName.Length > 1024)
            throw new ArgumentException("Entity file name is invalid.");
        return request;
    }
}

public static partial class Program
{
    [JSExport] public static byte[] EditStandalonePokemonGb(byte[] data, string json) => StandaloneGb.Edit(data, StandalonePokemonRequests.Read(json));
    [JSExport] public static byte[] EditStandalonePokemonRaw(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        return StandalonePokemon.EditRaw(data, request.FileName, request.Raw ?? throw new ArgumentException("Entity file advanced edit is missing."), request.InputEncrypted, request.UseFileFormat, request.EggTrainer);
    }
    [JSExport] public static string ReadStandalonePokemonAdvanced(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        var p = StandalonePokemon.Open(data, request.FileName, request.InputEncrypted, request.UseFileFormat).Entity;
        if (p.Species == 0 || p.Species > p.MaxSpeciesID || !p.Valid || !p.ChecksumValid)
            throw new ArgumentException("Entity file must contain valid Pokemon data.");
        var result = request.ReadKind switch
        {
            "eggContext" => new StandaloneAdvancedData(EggContext: StandaloneEgg.Read(p)),
            "origin" => new StandaloneAdvancedData(Origin: PokemonOrigin.Catalog(p, request.Version)),
            "ribbons" => new StandaloneAdvancedData(Ribbons: PokemonRibbons.Read(p, true)),
            "history" => new StandaloneAdvancedData(History: PokemonHistory.Read(p)),
            "memory" => new StandaloneAdvancedData(Memory: PokemonMemories.Read(p, request.Handler, request.Memory)),
            "relearn" => new StandaloneAdvancedData(Relearn: ReadRelearn(p)),
            _ => throw new ArgumentException("Entity file detail is unavailable."),
        };
        return JsonSerializer.Serialize(result, StandalonePokemonJson.Default.StandaloneAdvancedData);
    }
    private static ushort[] ReadRelearn(PKHeX.Core.PKM p)
    {
        if (!PokemonRelearn.Supported(p)) throw new ArgumentException("Pokemon relearn moves are unavailable in this format.");
        var analysis = new PKHeX.Core.LegalityAnalysis(p);
        if (!analysis.Parsed) throw new ArgumentException("Pokemon relearn analysis could not complete.");
        ushort[] moves = new ushort[4]; analysis.GetSuggestedRelearnMoves(moves); return moves;
    }
    [JSExport] public static string AnalyzeStandalonePokemon(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        return JsonSerializer.Serialize(StandalonePokemon.Analyze(data, request.FileName, request.InputEncrypted, request.UseFileFormat),
            StandalonePokemonJson.Default.PokemonLegalityReport);
    }
    [JSExport] public static string InspectStandalonePokemon(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        return JsonSerializer.Serialize(StandalonePokemon.Inspect(data, request.FileName, request.InputEncrypted, request.UseFileFormat),
            StandalonePokemonJson.Default.StandalonePokemonReport);
    }
    [JSExport] public static byte[] EditStandalonePokemon(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        return StandalonePokemon.Edit(data, request.FileName,
            request.Edit ?? throw new ArgumentException("Entity file edit is missing."), request.InputEncrypted, request.UseFileFormat);
    }
    [JSExport] public static byte[] ExportStandalonePokemon(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        return StandalonePokemon.Export(data, request.FileName, request.Party, request.Encrypted, request.InputEncrypted, request.UseFileFormat);
    }
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(StandalonePokemonReport))]
[JsonSerializable(typeof(StandalonePokemonRequest))]
[JsonSerializable(typeof(PokemonLegalityReport))]
[JsonSerializable(typeof(StandaloneAdvancedData))]
internal partial class StandalonePokemonJson : JsonSerializerContext;
