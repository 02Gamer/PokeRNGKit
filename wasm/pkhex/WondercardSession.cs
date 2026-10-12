// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json.Serialization;
using System.Text.Json;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record WondercardRequest([property: JsonRequired] string SourceHash, [property: JsonRequired] WondercardAction[] Actions);
public sealed record WondercardConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash, [property: JsonRequired] bool AcceptIssues);
public sealed record WondercardTicket(string Token, string SourceHash, string TargetHash, WondercardCatalog Before, WondercardCatalog Result, int[] ChangedOffsets, string[] Issues);
public sealed record WondercardImport([property: JsonRequired] string Data, [property: JsonRequired] string FileName, bool QR = false);
public sealed record WondercardPosition([property: JsonRequired] int Index, string? Data = null, string? FileName = null);
internal static class WondercardSession
{
    private static byte[]? output;
    private static WondercardTicket? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    internal static WondercardTicket Prepare(byte[] original, WondercardRequest request)
    {
        Reset(); string hash = Br4Editing.Hash(original);
        if (request.SourceHash != hash) throw new ArgumentException("Mystery gift preview is stale.");
        var source = SaveUtil.GetSaveFile(original.ToArray()) ?? throw new ArgumentException("Mystery gift save is unrecognized.");
        var before = new WondercardEditing(source).Read(hash);
        var prepared = WondercardEditing.Prepare(original, request.Actions); string target = Br4Editing.Hash(prepared.Output);
        var reopened = SaveUtil.GetSaveFile(prepared.Output.ToArray()) ?? throw new InvalidOperationException("Mystery gift result is unrecognized.");
        var result = new WondercardEditing(reopened).Read(target);
        string token = "wondercard:" + (++revision).ToString(CultureInfo.InvariantCulture);
        var ticket = new WondercardTicket(token, hash, target, before, result, Enumerable.Range(0, original.Length).Where(i => original[i] != prepared.Output[i]).ToArray(), prepared.Issues);
        output = prepared.Output; current = ticket; return ticket;
    }
    internal static byte[] Commit(byte[] original, WondercardConfirmation confirmation)
    {
        if (current is null || output is null || confirmation.Token != current.Token || confirmation.SourceHash != current.SourceHash || confirmation.TargetHash != current.TargetHash) throw new ArgumentException("Mystery gift preview is missing or replaced.");
        if (Br4Editing.Hash(original) != current.SourceHash) throw new ArgumentException("Mystery gift preview is stale.");
        if (current.Issues.Length > 0 && !confirmation.AcceptIssues) throw new ArgumentException("Mystery gift source issues require explicit acceptance.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Mystery gift frozen output verification failed.");
        var result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}
public static partial class SaveService
{
    public static string ReadWondercard(byte[] data) => JsonSerializer.Serialize(new WondercardEditing(Open(data)).Read(Br4Editing.Hash(data)), SaveJsonContext.Default.WondercardCatalog);
    public static string InspectWondercardImport(byte[] data, string json)
    {
        if (json.Length > 4 * 1024 * 1024) throw new ArgumentException("Mystery gift import is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.WondercardImport) ?? throw new ArgumentException("Missing mystery gift import.");
        return JsonSerializer.Serialize(new WondercardEditing(Open(data)).InspectImport(request.Data, request.FileName, request.QR), SaveJsonContext.Default.WondercardEntry);
    }
    public static string ExportWondercardQR(byte[] data, string json)
    {
        if (json.Length > 4 * 1024 * 1024) throw new ArgumentException("Mystery gift position is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.WondercardPosition) ?? throw new ArgumentException("Missing mystery gift position.");
        var editor = new WondercardEditing(Open(data));
        return request.Data is null ? editor.QR(request.Index) : editor.QRImport(request.Data, request.FileName ?? "");
    }
    public static string PreviewWondercard(byte[] data, string json)
    {
        WondercardSession.Reset();
        if (json.Length > 4 * 1024 * 1024) throw new ArgumentException("Mystery gift request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.WondercardRequest) ?? throw new ArgumentException("Missing mystery gift request.");
        return JsonSerializer.Serialize(WondercardSession.Prepare(data, request), SaveJsonContext.Default.WondercardTicket);
    }
    public static byte[] CommitWondercard(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Mystery gift confirmation is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.WondercardConfirmation) ?? throw new ArgumentException("Missing mystery gift confirmation.");
        return WondercardSession.Commit(data, request);
    }
    public static void DiscardWondercard(string token) => WondercardSession.Discard(token);
}
