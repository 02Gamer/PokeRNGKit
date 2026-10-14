// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record ChatterRequest([property: JsonRequired] string SourceHash, [property: JsonRequired] ChatterAction[] Actions);
public sealed record ChatterConfirmation([property: JsonRequired] string Token, [property: JsonRequired] string SourceHash, [property: JsonRequired] string TargetHash);
public sealed record ChatterTicket(string Token, string SourceHash, string TargetHash, ChatterCatalog Before, ChatterCatalog Result, int[] ChangedOffsets, int ChangedPcmBytes);

internal static class ChatterSession
{
    private static byte[]? output;
    private static ChatterConfirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    internal static ChatterTicket Prepare(byte[] original, ChatterRequest request)
    {
        Reset(); var hash = Br4Editing.Hash(original);
        if (request.SourceHash != hash) throw new ArgumentException("Chatter preview is stale.");
        var beforeSave = SaveDetectionContext.OpenCurrent(original) ?? throw new ArgumentException("Chatter save is unrecognized.");
        var before = ChatterEditing.Read(beforeSave, hash);
        var prepared = ChatterEditing.Prepare(original, request.Actions);
        var afterSave = SaveDetectionContext.OpenDerived(prepared) ?? throw new InvalidOperationException("Chatter prepared save is unrecognized.");
        var target = Br4Editing.Hash(prepared); var after = ChatterEditing.Read(afterSave, target);
        var oldPcm = Convert.FromBase64String(before.Pcm); var newPcm = Convert.FromBase64String(after.Pcm);
        string token = "chatter:" + (++revision).ToString(CultureInfo.InvariantCulture);
        var ticket = new ChatterTicket(token, hash, target, before, after,
            Enumerable.Range(0, original.Length).Where(index => original[index] != prepared[index]).ToArray(),
            Enumerable.Range(0, oldPcm.Length).Count(index => oldPcm[index] != newPcm[index]));
        output = prepared; current = new(token, hash, target); return ticket;
    }
    internal static byte[] Commit(byte[] original, ChatterConfirmation confirmation)
    {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("Chatter preview is missing or replaced.");
        if (Br4Editing.Hash(original) != current.SourceHash) throw new ArgumentException("Chatter preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Chatter frozen output verification failed.");
        var result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

public static partial class SaveService
{
    public static string ReadChatter(byte[] data) => JsonSerializer.Serialize(ChatterEditing.Read(Open(data), Br4Editing.Hash(data)), SaveJsonContext.Default.ChatterCatalog);
    public static string PreviewChatter(byte[] data, string json)
    {
        ChatterSession.Reset();
        if (json.Length > 2 * 1024 * 1024) throw new ArgumentException("Chatter request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.ChatterRequest) ?? throw new ArgumentException("Missing Chatter request.");
        return JsonSerializer.Serialize(ChatterSession.Prepare(data, request), SaveJsonContext.Default.ChatterTicket);
    }
    public static byte[] CommitChatter(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Chatter confirmation is too large.");
        return ChatterSession.Commit(data, JsonSerializer.Deserialize(json, SaveJsonContext.Default.ChatterConfirmation) ?? throw new ArgumentException("Missing Chatter confirmation."));
    }
    public static void DiscardChatter(string token) => ChatterSession.Discard(token);
}
