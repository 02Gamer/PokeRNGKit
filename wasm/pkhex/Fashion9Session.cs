// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record F9Confirmation(string Token, string SourceHash, string TargetHash);
public sealed record F9Ticket(string Token, string SourceHash, string TargetHash, F9Catalog Result, F9RowDiff[] Rows, Ew9aBlockChange[] Blocks, int[] ChangedOffsets, string[] ResetValues);
internal static class Fashion9Session
{
    private static byte[]? output;
    private static F9Confirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    internal static F9Ticket Prepare(SaveFile save, F9Edit edit, byte[] original)
    {
        Reset(); var hash = Br4Editing.Hash(original);
        var prepared = Fashion9Editing.Prepare(save, edit, hash, original.Length, out var resets);
        var after = Fashion9Editing.OpenLike(save, prepared.ToArray()); var target = Br4Editing.Hash(prepared);
        string token = "fashion9:" + (++revision).ToString(CultureInfo.InvariantCulture);
        var result = new F9Ticket(token, hash, target, Fashion9Editing.Read(after, target, false), Fashion9Editing.RowChanges(save, after), Fashion9Editing.BlockChanges(save, after), Enumerable.Range(0, original.Length).Where(i => original[i] != prepared[i]).ToArray(), resets);
        output = prepared; current = new(token, hash, target); return result;
    }
    internal static byte[] Commit(byte[] original, F9Confirmation confirmation)
    {
        if (output is null || current is null || confirmation != current) throw new ArgumentException("Fashion9 preview is missing or replaced.");
        if (Br4Editing.Hash(original) != current.SourceHash) throw new ArgumentException("Fashion9 preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Fashion9 frozen output verification failed.");
        var result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

public static partial class SaveService
{
    public static string ReadFashion9(byte[] data, string json)
    {
        if (json.Length > 8 * 1024 * 1024) throw new ArgumentException("Fashion9 read query is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.F9ReadQuery) ?? throw new ArgumentException("Missing Fashion9 read query.");
        return JsonSerializer.Serialize(Fashion9Editing.Page(Open(data), Br4Editing.Hash(data), query), SaveJsonContext.Default.F9Page);
    }
    public static string PreviewFashion9(byte[] data, string json)
    {
        Fashion9Session.Reset();
        if (json.Length > 8 * 1024 * 1024) throw new ArgumentException("Fashion9 request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.F9Edit) ?? throw new ArgumentException("Missing Fashion9 edit.");
        return JsonSerializer.Serialize(Fashion9Session.Prepare(Open(data), edit, data), SaveJsonContext.Default.F9Ticket);
    }
    public static byte[] CommitFashion9(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Fashion9 confirmation is too large.");
        return Fashion9Session.Commit(data, JsonSerializer.Deserialize(json, SaveJsonContext.Default.F9Confirmation) ?? throw new ArgumentException("Missing Fashion9 confirmation."));
    }
    public static void DiscardFashion9(string token) => Fashion9Session.Discard(token);
}
