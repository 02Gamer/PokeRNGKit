// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace PokeRNGKit.SaveEditor;

internal sealed record StandalonePokemonRequest(string FileName, bool InputEncrypted = false, bool Party = false, bool Encrypted = false, PokemonEdit? Edit = null);

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
    [JSExport] public static string InspectStandalonePokemon(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        return JsonSerializer.Serialize(StandalonePokemon.Inspect(data, request.FileName, request.InputEncrypted),
            StandalonePokemonJson.Default.StandalonePokemonReport);
    }
    [JSExport] public static byte[] EditStandalonePokemon(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        return StandalonePokemon.Edit(data, request.FileName,
            request.Edit ?? throw new ArgumentException("Entity file edit is missing."), request.InputEncrypted);
    }
    [JSExport] public static byte[] ExportStandalonePokemon(byte[] data, string json)
    {
        var request = StandalonePokemonRequests.Read(json);
        return StandalonePokemon.Export(data, request.FileName, request.Party, request.Encrypted, request.InputEncrypted);
    }
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(StandalonePokemonReport))]
[JsonSerializable(typeof(StandalonePokemonRequest))]
internal partial class StandalonePokemonJson : JsonSerializerContext;
