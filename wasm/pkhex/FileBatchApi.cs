// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record FileBatchRequest(FileBatchInput[] Files, string Text, string Language);
internal sealed record FileBatchTicket(string Token, FileBatchSummary Summary);
internal static class FileBatchSession
{
    private static FileBatchPlan? plan;
    private static string? token;
    private static long revision;
    public static FileBatchTicket Prepare(byte[] context, string json)
    {
        plan = null; token = null;
        if (json.Length > 128 * 1024 * 1024) throw new ArgumentException("File batch request is too large.");
        var request = JsonSerializer.Deserialize(json, FileBatchJson.Default.FileBatchRequest)
            ?? throw new ArgumentException("File batch request is missing.");
        var next = FilePropertyBatch.Preview(context, request.Files, request.Text, request.Language);
        token = "file:" + (++revision).ToString(System.Globalization.CultureInfo.InvariantCulture); plan = next;
        return new(token, next.Summary);
    }
    public static byte[] Export(PropertyBatchConfirmation confirmation)
    {
        if (plan is null || token != confirmation.Token) throw new ArgumentException("File batch preview is missing or replaced.");
        // Downloads are repeatable until the user discards or replaces the preview.
        return plan.Export(confirmation.AllowErrors, confirmation.AllowEmpty, confirmation.AllowIgnored);
    }
    public static void Discard(string value) { if (token == value) { plan = null; token = null; } }
    public static PropertyBatchCatalog[] Catalog()
    {
        var editor = EntityBatchEditor.Instance;
        return editor.Types.Select((type, i) => new PropertyBatchCatalog(type.Name, editor.Properties[i + 1].Select(name =>
            new PropertyBatchField(name, editor.TryGetPropertyType(name, out var value, i + 1) ? value : "Unknown")).ToArray())).ToArray();
    }
}
public static partial class Program
{
    [JSExport] public static string PreviewFileBatch(byte[] data, string json) => JsonSerializer.Serialize(FileBatchSession.Prepare(data, json), FileBatchJson.Default.FileBatchTicket);
    [JSExport] public static byte[] ExportFileBatch(string json) => FileBatchSession.Export(JsonSerializer.Deserialize(json, PropertyBatchJson.Default.PropertyBatchConfirmation)
        ?? throw new ArgumentException("File batch confirmation is missing."));
    [JSExport] public static void DiscardFileBatch(string token) => FileBatchSession.Discard(token);
    [JSExport] public static string ReadFileBatchCatalog() => JsonSerializer.Serialize(FileBatchSession.Catalog(), FileBatchJson.Default.PropertyBatchCatalogArray);
}
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(FileBatchRequest))]
[JsonSerializable(typeof(FileBatchTicket))]
[JsonSerializable(typeof(PropertyBatchCatalog[]))]
internal partial class FileBatchJson : JsonSerializerContext;
