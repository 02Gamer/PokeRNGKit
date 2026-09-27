// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

internal sealed record PropertyBatchTicket(string Token, PropertyBatchSummary Summary);
internal sealed record PropertyBatchConfirmation(string Token, bool AllowErrors, bool AllowEmpty, bool AllowIgnored);
internal sealed record PropertyBatchField(string Name, string Type);
internal sealed record PropertyBatchCatalog(string Format, PropertyBatchField[] Fields);
internal static class PropertyBatchSession
{
    private static PropertyBatchPlan? plan;
    private static string? token;
    private static long revision;
    public static PropertyBatchTicket Prepare(byte[] data, PropertyBatchRequest request)
    {
        plan = null; token = null;
        var next = PropertyBatch.Preview(data, request);
        token = (++revision).ToString(System.Globalization.CultureInfo.InvariantCulture); plan = next;
        return new(token, next.Summary);
    }
    public static byte[] Commit(byte[] data, PropertyBatchConfirmation confirmation)
    {
        if (plan is null || token != confirmation.Token) throw new ArgumentException("Property batch preview is missing or replaced.");
        var result = plan.Commit(data, confirmation.AllowErrors, confirmation.AllowEmpty, confirmation.AllowIgnored);
        plan = null; token = null;
        return result;
    }
    public static void Discard(string value) { if (token == value) { plan = null; token = null; } }
    public static PropertyBatchCatalog Catalog(byte[] data)
    {
        var save = SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Property batch save is unsupported.");
        if (!SaveService.CanEdit(save)) throw new ArgumentException("Property batch save is unsupported.");
        var editor = EntityBatchEditor.Instance;
        var index = editor.Types.ToList().IndexOf(save.PKMType) + 1;
        if (index == 0) throw new ArgumentException("Property batch entity format is unsupported.");
        return new(save.PKMType.Name, editor.Properties[index].Select(name => new PropertyBatchField(name,
            editor.TryGetPropertyType(name, out var type, index) ? type : "Unknown")).ToArray());
    }
}

public static partial class Program
{
    [JSExport] public static string ReadPropertyBatchCatalog(byte[] data) => JsonSerializer.Serialize(PropertyBatchSession.Catalog(data), PropertyBatchJson.Default.PropertyBatchCatalog);
    [JSExport] public static string PreviewPropertyBatch(byte[] data, string json) => JsonSerializer.Serialize(PropertyBatchSession.Prepare(data,
        JsonSerializer.Deserialize(json, PropertyBatchJson.Default.PropertyBatchRequest) ?? throw new ArgumentException("Property batch request is missing.")), PropertyBatchJson.Default.PropertyBatchTicket);
    [JSExport] public static byte[] CommitPropertyBatch(byte[] data, string json) => PropertyBatchSession.Commit(data,
        JsonSerializer.Deserialize(json, PropertyBatchJson.Default.PropertyBatchConfirmation) ?? throw new ArgumentException("Property batch confirmation is missing."));
    [JSExport] public static void DiscardPropertyBatch(string token) => PropertyBatchSession.Discard(token);
}
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(PropertyBatchRequest))]
[JsonSerializable(typeof(PropertyBatchTicket))]
[JsonSerializable(typeof(PropertyBatchConfirmation))]
[JsonSerializable(typeof(PropertyBatchCatalog))]
internal partial class PropertyBatchJson : JsonSerializerContext;
