// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record R7Confirmation(string Token, string SourceHash, string TargetHash);
public sealed record R7Ticket(string Token, string SourceHash, string TargetHash, R7Page Result, R7EntryDiff[] Entries, Ew9aBlockChange[] Blocks, int[] ChangedOffsets);
internal static class SevenStar9Session
{
    private static byte[]? output;
    private static R7Confirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    internal static R7Ticket Prepare(SaveFile save, R7Edit edit, byte[] original)
    {
        Reset(); string hash = Br4Editing.Hash(original);
        var prepared = SevenStar9Editing.Prepare(save, edit, hash, original.Length);
        var before = SevenStar9Editing.Save(save); var after = new SAV9SV(prepared.ToArray()); var target = Br4Editing.Hash(prepared);
        string token = "sevenstar9:" + (++revision).ToString(CultureInfo.InvariantCulture);
        var ticket = new R7Ticket(token, hash, target, SevenStar9Editing.Read(after, target, edit.Query ?? new()),
            SevenStar9Editing.Changes(before, after), SevenStar9Editing.Blocks(before, after), Enumerable.Range(0, original.Length).Where(i => original[i] != prepared[i]).ToArray());
        output = prepared; current = new(token, hash, target); return ticket;
    }
    internal static byte[] Commit(byte[] original, R7Confirmation confirmation)
    {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("SevenStar9 preview is missing or replaced.");
        if (Br4Editing.Hash(original) != current.SourceHash) throw new ArgumentException("SevenStar9 preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("SevenStar9 frozen output verification failed.");
        var result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}
public static partial class SaveService
{
    public static string ReadSevenStar9(byte[] data, string json)
    {
        if (json.Length > 128 * 1024) throw new ArgumentException("SevenStar9 page query is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.R7Query) ?? throw new ArgumentException("Missing SevenStar9 query.");
        return JsonSerializer.Serialize(SevenStar9Editing.Read(Open(data), Br4Editing.Hash(data), query), SaveJsonContext.Default.R7Page);
    }
    public static string PreviewSevenStar9(byte[] data, string json)
    {
        SevenStar9Session.Reset();
        if (json.Length > 8 * 1024 * 1024) throw new ArgumentException("SevenStar9 request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.R7Edit) ?? throw new ArgumentException("Missing SevenStar9 edit.");
        return JsonSerializer.Serialize(SevenStar9Session.Prepare(Open(data), edit, data), SaveJsonContext.Default.R7Ticket);
    }
    public static byte[] CommitSevenStar9(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("SevenStar9 confirmation is too large.");
        return SevenStar9Session.Commit(data, JsonSerializer.Deserialize(json, SaveJsonContext.Default.R7Confirmation) ?? throw new ArgumentException("Missing SevenStar9 confirmation."));
    }
    public static void DiscardSevenStar9(string token) => SevenStar9Session.Discard(token);
}
