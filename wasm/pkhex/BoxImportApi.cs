// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record BoxImportRequest(FileBatchInput[] Files, int FirstBox, bool Clear, bool Overwrite,
    int UpdateToSaveFile, int UpdatePokeDex, int UpdateRecord);
internal sealed record BoxImportTicket(string Token, BoxImportSummary Summary, BoxImportSource[] Sources, BoxImportFileResult[] Files);
internal sealed record BoxImportConfirmation(string Token, bool AllowClear, bool AllowOverwrite, bool AllowSkipped);

internal static class BoxImportSession
{
    private static BoxImportFilePlan? plan;
    private static string? token;
    private static long revision;

    public static BoxImportTicket Prepare(byte[] data, string json)
    {
        plan = null; token = null;
        if (json is null || json.Length > 128 * 1024 * 1024) throw new ArgumentException("Box import request exceeds limits.");
        var request = JsonSerializer.Deserialize(json, BoxImportJson.Default.BoxImportRequest)
            ?? throw new ArgumentException("Box import request is missing.");
        if ((uint)request.UpdateToSaveFile > 2 || (uint)request.UpdatePokeDex > 2 || (uint)request.UpdateRecord > 2)
            throw new ArgumentException("Box import settings are invalid.");
        var settings = new EntityImportSettings((EntityImportOption)request.UpdateToSaveFile,
            (EntityImportOption)request.UpdatePokeDex, (EntityImportOption)request.UpdateRecord);
        var next = BoxImportFiles.Prepare(data, request.Files, request.FirstBox, request.Clear, request.Overwrite, settings);
        token = "import:" + (++revision).ToString(System.Globalization.CultureInfo.InvariantCulture); plan = next;
        return new(token, next.Summary, next.Sources, next.Files);
    }

    public static byte[] Commit(byte[] data, BoxImportConfirmation confirmation)
    {
        if (plan is null || token != confirmation.Token) throw new ArgumentException("Box import preview is missing or replaced.");
        var output = plan.Commit(data, confirmation.AllowClear, confirmation.AllowOverwrite, confirmation.AllowSkipped);
        plan = null; token = null;
        return output;
    }

    public static void Discard(string value) { if (token == value) { plan = null; token = null; } }
}

public static partial class Program
{
    [JSExport] public static string PreviewBoxImport(byte[] data, string json) => JsonSerializer.Serialize(
        BoxImportSession.Prepare(data, json), BoxImportJson.Default.BoxImportTicket);
    [JSExport] public static byte[] CommitBoxImport(byte[] data, string json)
    {
        if (json is null || json.Length > 4096) throw new ArgumentException("Box import confirmation exceeds limits.");
        return BoxImportSession.Commit(data, JsonSerializer.Deserialize(json, BoxImportJson.Default.BoxImportConfirmation)
            ?? throw new ArgumentException("Box import confirmation is missing."));
    }
    [JSExport] public static void DiscardBoxImport(string token) => BoxImportSession.Discard(token);
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(BoxImportRequest))]
[JsonSerializable(typeof(BoxImportTicket))]
[JsonSerializable(typeof(BoxImportConfirmation))]
internal partial class BoxImportJson : JsonSerializerContext;
