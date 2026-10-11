// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record R9Confirmation(string Token, string SourceHash, string TargetHash);
public sealed record R9Ticket(string Token, string SourceHash, string TargetHash, R9Catalog Result, R9EntryDiff[] Entries, Ew9aBlockChange[] Blocks, int[] ChangedOffsets, string[] IgnoredSeeds);
internal static class Raid9Session
{
    private static byte[]? output;
    private static R9Confirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    internal static R9Ticket Prepare(SaveFile save, R9Edit edit, byte[] original)
    {
        Reset(); string hash = Br4Editing.Hash(original);
        var prepared = Raid9Editing.Prepare(save, edit, hash, original.Length, out var ignored);
        var before = Raid9Editing.Save(save); var after = new SAV9SV(prepared.ToArray()); var target = Br4Editing.Hash(prepared);
        string token = "raid9:" + (++revision).ToString(CultureInfo.InvariantCulture);
        var ticket = new R9Ticket(token, hash, target, Raid9Editing.Read(after, target), Raid9Editing.Changes(before, after), Raid9Editing.Blocks(before, after), Enumerable.Range(0, original.Length).Where(i => original[i] != prepared[i]).ToArray(), ignored);
        output = prepared; current = new(token, hash, target); return ticket;
    }
    internal static byte[] Commit(byte[] original, R9Confirmation confirmation)
    {
        if (current is null || output is null || confirmation != current) throw new ArgumentException("Raid9 preview is missing or replaced.");
        if (Br4Editing.Hash(original) != current.SourceHash) throw new ArgumentException("Raid9 preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Raid9 frozen output verification failed.");
        var result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

public static partial class SaveService
{
    public static string ReadRaid9(byte[] data) => JsonSerializer.Serialize(Raid9Editing.Read(Open(data), Br4Editing.Hash(data)), SaveJsonContext.Default.R9Catalog);
    public static string PreviewRaid9(byte[] data, string json)
    {
        Raid9Session.Reset();
        if (json.Length > 8 * 1024 * 1024) throw new ArgumentException("Raid9 request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.R9Edit) ?? throw new ArgumentException("Missing Raid9 edit.");
        return JsonSerializer.Serialize(Raid9Session.Prepare(Open(data), edit, data), SaveJsonContext.Default.R9Ticket);
    }
    public static byte[] CommitRaid9(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Raid9 confirmation is too large.");
        return Raid9Session.Commit(data, JsonSerializer.Deserialize(json, SaveJsonContext.Default.R9Confirmation) ?? throw new ArgumentException("Missing Raid9 confirmation."));
    }
    public static void DiscardRaid9(string token) => Raid9Session.Discard(token);
}
