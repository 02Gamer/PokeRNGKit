// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record BoxBinaryExportRequest(int Box, bool All);
internal sealed record BoxBinaryRequest(byte[] Data, int Box, bool All, int UpdateToSaveFile, int UpdatePokeDex, int UpdateRecord);
internal sealed record BoxBinaryTicket(string Token, BoxImportSummary Summary);

internal static class BoxBinarySession
{
    private static BoxImportPlan? plan;
    private static string? token;
    private static long revision;

    public static BoxBinaryTicket Prepare(byte[] source, string json)
    {
        plan = null; token = null;
        if (json is null || json.Length > 48 * 1024 * 1024) throw new ArgumentException("Box binary request exceeds limits.");
        var request = JsonSerializer.Deserialize(json, BoxBinaryJson.Default.BoxBinaryRequest)
            ?? throw new ArgumentException("Box binary request is missing.");
        if (request.Data is null || request.Data.Length > SaveService.MaximumSize ||
            (uint)request.UpdateToSaveFile > 2 || (uint)request.UpdatePokeDex > 2 || (uint)request.UpdateRecord > 2)
            throw new ArgumentException("Box binary settings are invalid.");
        var next = BoxBinary.Preview(source, request.Data, request.Box, request.All,
            new((EntityImportOption)request.UpdateToSaveFile, (EntityImportOption)request.UpdatePokeDex, (EntityImportOption)request.UpdateRecord));
        token = "binary:" + (++revision).ToString(System.Globalization.CultureInfo.InvariantCulture); plan = next;
        return new(token, next.Summary);
    }

    public static byte[] Commit(byte[] source, BoxImportConfirmation confirmation)
    {
        if (plan is null || token != confirmation.Token) throw new ArgumentException("Box binary preview is missing or replaced.");
        var output = plan.Commit(source, confirmation.AllowClear, confirmation.AllowOverwrite, false);
        plan = null; token = null;
        return output;
    }

    public static void Discard(string value) { if (token == value) { plan = null; token = null; } }
}

public static partial class Program
{
    [JSExport] public static byte[] ExportBoxBinary(byte[] data, string json)
    {
        if (json is null || json.Length > 4096) throw new ArgumentException("Box binary export request exceeds limits.");
        var request = JsonSerializer.Deserialize(json, BoxBinaryJson.Default.BoxBinaryExportRequest)
            ?? throw new ArgumentException("Box binary export request is missing.");
        return BoxBinary.Export(data, request.Box, request.All);
    }
    [JSExport] public static string PreviewBoxBinary(byte[] data, string json) => JsonSerializer.Serialize(
        BoxBinarySession.Prepare(data, json), BoxBinaryJson.Default.BoxBinaryTicket);
    [JSExport] public static byte[] CommitBoxBinary(byte[] data, string json)
    {
        if (json is null || json.Length > 4096) throw new ArgumentException("Box binary confirmation exceeds limits.");
        return BoxBinarySession.Commit(data, JsonSerializer.Deserialize(json, BoxBinaryJson.Default.BoxImportConfirmation)
            ?? throw new ArgumentException("Box binary confirmation is missing."));
    }
    [JSExport] public static void DiscardBoxBinary(string token) => BoxBinarySession.Discard(token);
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(BoxBinaryExportRequest))]
[JsonSerializable(typeof(BoxBinaryRequest))]
[JsonSerializable(typeof(BoxBinaryTicket))]
[JsonSerializable(typeof(BoxImportConfirmation))]
internal partial class BoxBinaryJson : JsonSerializerContext;
