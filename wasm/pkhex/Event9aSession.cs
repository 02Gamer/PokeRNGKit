// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record Ew9aBlockChange(string Key, string BeforeType, string AfterType, string BeforeSubtype, string AfterSubtype, string Before, string After);
public sealed record Ew9aConfirmation(string Token, string SourceHash, string TargetHash, string NamesHash);
public sealed record Ew9aTicket(string Token, string SourceHash, string TargetHash, string NamesHash, Ew9aCatalog Result, Ew9aPhysicalDiff[] Rows, Ew9aBlockChange[] Blocks, int[] ChangedOffsets, string[] Ignored);
public sealed record Ew9aCompareQuery(string UpdatedData, string Names);

internal static class Event9aSession
{
    private static byte[]? output;
    private static Ew9aConfirmation? current;
    private static long revision;
    internal static void Reset() { output = null; current = null; }
    internal static Ew9aTicket Prepare(SaveFile save, Ew9aEdit edit, string hash, int length)
    {
        Reset();
        var prepared = Event9aEditing.Prepare(save, edit, hash, length, out var ignored);
        var before = Event9aEditing.Save(save); var after = new SAV9ZA(prepared.ToArray());
        var target = Br4Editing.Hash(prepared); var result = Event9aEditing.Read(after, target, edit.Names, false);
        var blocks = Event9aEditing.BlockChanges(before, after, false);
        var original = before.Write().ToArray();
        string token = "event9a:" + (++revision).ToString(CultureInfo.InvariantCulture);
        var ticket = new Ew9aTicket(token, hash, target, result.NamesHash, result,
            Event9aEditing.Physical(before, after, new Event9aEditing.Names(edit.Names)), blocks,
            Enumerable.Range(0, length).Where(i => original[i] != prepared[i]).ToArray(), ignored);
        output = prepared; current = new(token, hash, target, result.NamesHash); return ticket;
    }
    internal static byte[] Commit(byte[] data, Ew9aConfirmation confirmation)
    {
        if (output is null || current is null || confirmation != current) throw new ArgumentException("Event9a preview is missing or replaced.");
        if (Br4Editing.Hash(data) != current.SourceHash) throw new ArgumentException("Event9a preview is stale.");
        if (Br4Editing.Hash(output) != current.TargetHash) throw new InvalidOperationException("Event9a frozen output verification failed.");
        var result = output.ToArray(); Reset(); return result;
    }
    internal static void Discard(string token) { if (current?.Token == token) Reset(); }
}

public static partial class SaveService
{
    public static string ReadEvent9a(byte[] data, string json)
    {
        if (json.Length > 8 * 1024 * 1024) throw new ArgumentException("Event9a read query is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Ew9aReadQuery) ?? throw new ArgumentException("Missing Event9a read query.");
        return JsonSerializer.Serialize(Event9aEditing.Page(Open(data), Br4Editing.Hash(data), query), SaveJsonContext.Default.Ew9aPage);
    }
    public static string PreviewEvent9a(byte[] data, string json)
    {
        Event9aSession.Reset();
        if (json.Length > 8 * 1024 * 1024) throw new ArgumentException("Event9a request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Ew9aEdit) ?? throw new ArgumentException("Missing Event9a edit.");
        return JsonSerializer.Serialize(Event9aSession.Prepare(Open(data), edit, Br4Editing.Hash(data), data.Length), SaveJsonContext.Default.Ew9aTicket);
    }
    public static byte[] CommitEvent9a(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Event9a confirmation is too large.");
        return Event9aSession.Commit(data, JsonSerializer.Deserialize(json, SaveJsonContext.Default.Ew9aConfirmation) ?? throw new ArgumentException("Missing Event9a confirmation."));
    }
    public static void DiscardEvent9a(string token) => Event9aSession.Discard(token);
    public static string CompareEvent9a(byte[] data, string json)
    {
        if (json.Length > 50 * 1024 * 1024) throw new ArgumentException("Event9a comparison is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Ew9aCompareQuery) ?? throw new ArgumentException("Missing Event9a comparison.");
        byte[] updated;
        try { updated = Convert.FromBase64String(query.UpdatedData); }
        catch (FormatException) { throw new ArgumentException("Invalid Event9a updated file."); }
        return JsonSerializer.Serialize(Event9aEditing.Compare(Event9aEditing.Save(Open(data)), Event9aEditing.Save(Open(updated)), Br4Editing.Hash(data), Br4Editing.Hash(updated), query.Names), SaveJsonContext.Default.Ew9aComparison);
    }
}
