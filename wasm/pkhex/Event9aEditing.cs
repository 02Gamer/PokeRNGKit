// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record Ew9aRow(int Index, string[] Keys, string[] Hashes, string Value, string Raw);
public sealed record Ew9aGroup(string Id, string BlockKey, string Kind, int Count, int Used, bool Available, Ew9aRow[] Rows);
public sealed record Ew9aCatalog(bool CanEdit, string SourceHash, string NamesHash, Ew9aGroup[] Groups);
public sealed record Ew9aRowChange(string Group, int Index, string?[]? Keys = null, string? Value = null);
public sealed record Ew9aEdit(string? SourceHash, string Names, Ew9aRowChange[] Changes);
public sealed record Ew9aPhysicalDiff(string Group, int Index, Ew9aRow? Before, Ew9aRow? After);
public sealed record Ew9aComparison(string PreviousHash, string UpdatedHash, Ew9aPhysicalDiff[] Rows, Ew9aBlockChange[] Blocks, string[] SourceReport, string? SourceReportError);
public sealed record Ew9aReadQuery(string Names, string Group = "Flags", string Filter = "", int Offset = 0, int Limit = 50);
public sealed record Ew9aPage(bool CanEdit, string SourceHash, string NamesHash, Ew9aGroup[] Groups, string Group, string Filter, int Offset, int Total, Ew9aRow[] Rows);

internal static class Event9aEditing
{
    internal sealed record Definition(string Id, uint Key, string Kind)
    {
        internal int KeyCount => Kind == "hash3" ? 3 : Kind is "tuple" or "hash2" ? 2 : 1;
        internal int Size => (KeyCount + 1) * 8;
    }
    internal static readonly Definition[] Definitions =
    [
        new("Flags", 0xED6F46E7, "bool"), new("Event", 0x58505C5E, "bool"),
        new("Work", 0xFADA7742, "u64"), new("Quest", 0xB9B223B9, "u64"),
        new("WorkMable", 0x03913534, "u64"), new("CountMable", 0x8D80EC0F, "u64"),
        new("CountTitle", 0x2C2C6964, "u64"), new("Report", 0xAF2165F0, "tuple"),
        new("WorkSpawn", 0x53FD0223, "u64"), new("InfiniteRank", 0x7C896A83, "u64"),
        new("Spawner2", 0x79ABCB0B, "tuple"), new("Spawner4", 0xD1A3FF7B, "hash2"),
        new("Obstruction", 0x4C26C29B, "tuple"), new("FieldItems", 0x2482AD60, "bool"),
        new("FieldObjectInteractable", 0x7147C953, "hash3"),
    ];
    internal sealed class Names
    {
        private readonly Dictionary<ulong, string> forward = new() { [FnvHash.HashEmpty] = "" };
        private readonly Dictionary<string, ulong> reverse;
        internal Names(string text)
        {
            if (text is null || text.Length > 4 * 1024 * 1024) throw new ArgumentException("Event9a name table is too large.");
            var lines = new List<string>();
            using var reader = new StringReader(text);
            while (reader.ReadLine() is { } line) lines.Add(line);
            SCBlockMetadata.AddExtraKeyNames64(forward, lines);
            // Same duplicate-name rejection and case-sensitive lookup as EventWorkLookup.
            reverse = forward.ToDictionary(v => v.Value, v => v.Key);
        }
        internal string Name(ulong hash) => forward.TryGetValue(hash, out var name) ? name : hash.ToString("X16");
        internal ulong Hash(string name) => reverse.TryGetValue(name, out var hash) ? hash :
            ulong.TryParse(name, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out hash) ? hash : FnvHash.HashFnv1a_64(name);
    }
    internal sealed class Storage
    {
        internal readonly Definition Definition;
        internal readonly SCBlock Block;
        internal readonly Func<int, ulong[]> Keys;
        internal readonly Func<int, ulong> Value;
        internal readonly Action<int, ulong[]> SetKeys;
        internal readonly Action<int, ulong> SetValue;
        internal readonly Action Compress;
        internal readonly Func<int> Used;
        internal int Count => Block.Data.Length / Definition.Size;
        internal Storage(SAV9ZA save, Definition d, SCBlock block)
        {
            Definition = d; Block = block;
            if (d.Kind == "bool")
            {
                var s = new EventWorkFlagStorage(save, block);
                Keys = i => [s.GetKey(i)]; Value = i => s.GetValue(i) ? 1UL : 0UL;
                SetKeys = (i, k) => s.SetKey(i, k[0]); SetValue = (i, v) => s.SetValue(i, v != 0);
                Compress = s.Compress; Used = () => s.CountUsed;
            }
            else if (d.Kind == "u64")
            {
                var s = new EventWorkValueStorage(save, block);
                Keys = i => [s.GetKey(i)]; Value = s.GetValue;
                SetKeys = (i, k) => s.SetKey(i, k[0]); SetValue = s.SetValue;
                Compress = s.Compress; Used = () => s.CountUsed;
            }
            else if (d.KeyCount == 2)
            {
                var s = new EventWorkValueStorageKey128(save, block);
                Keys = i => { var k = s.GetKey(i); return [k.A, k.B]; }; Value = s.GetValue;
                SetKeys = (i, k) => s.SetKey(i, k[0], k[1]); SetValue = s.SetValue;
                Compress = s.Compress; Used = () => s.CountUsed;
            }
            else
            {
                var s = new EventWorkValueStorageKey192(save, block);
                Keys = i => { var k = s.GetKey(i); return [k.A, k.B, k.C]; }; Value = s.GetValue;
                SetKeys = (i, k) => s.SetKey(i, k[0], k[1], k[2]); SetValue = s.SetValue;
                Compress = s.Compress; Used = () => s.CountUsed;
            }
        }
        internal Ew9aRow Read(int index, Names names)
        {
            var keys = Keys(index);
            return new(index, keys.Select((k, i) => Definition.Kind == "tuple" && i == 1 ? unchecked((long)k).ToString(CultureInfo.InvariantCulture) : names.Name(k)).ToArray(),
                keys.Select(k => k.ToString("X16")).ToArray(), Definition.Kind == "bool" ? (Value(index) != 0 ? "True" : "False") : Value(index).ToString(CultureInfo.InvariantCulture),
                Convert.ToHexString(Block.Data.Slice(index * Definition.Size, Definition.Size)));
        }
    }
    internal static SAV9ZA Save(SaveFile save) => save is SAV9ZA s ? s : throw new ArgumentException("Event9a requires Legends: Z-A.");
    internal static Storage? Open(SAV9ZA save, Definition d) => save.Blocks.TryGetBlock(d.Key, out var b) && b.Type is SCTypeCode.Object or SCTypeCode.Array ? new(save, d, b) : null;
    internal static Ew9aCatalog Read(SaveFile save, string hash, string nameText, bool includeRows = true)
    {
        var s = Save(save); var names = new Names(nameText);
        var groups = Definitions.Select(d =>
        {
            var g = Open(s, d);
            return new Ew9aGroup(d.Id, d.Key.ToString("X8"), d.Kind, g?.Count ?? 0, g?.Used() ?? 0, g is not null,
                g is null || !includeRows ? [] : Enumerable.Range(0, g.Count).Select(i => g.Read(i, names)).ToArray());
        }).ToArray();
        return new(s.State.Exportable && SaveChecksums.Valid(s) && groups.All(g => g.Available), hash,
            Br4Editing.Hash(System.Text.Encoding.UTF8.GetBytes(nameText)), groups);
    }
    internal static Ew9aPage Page(SaveFile save, string hash, Ew9aReadQuery query)
    {
        var s = Save(save); var catalog = Read(s, hash, query.Names, false);
        var definition = Definitions.SingleOrDefault(d => d.Id == query.Group) ?? throw new ArgumentException("Invalid Event9a group.");
        var g = Open(s, definition); int count = g?.Count ?? 0;
        if (query.Filter is null || query.Filter.Length > 32767 || query.Offset < 0 || query.Offset > count || query.Limit is < 1 or > 200)
            throw new ArgumentException("Invalid Event9a page.");
        var names = new Names(query.Names); int total = 0; var rows = new List<Ew9aRow>();
        if (g is not null)
        for (int i = 0; i < count; i++)
        {
            var row = g.Read(i, names);
            int keyCount = definition.Kind == "tuple" ? 1 : definition.KeyCount;
            if (query.Filter.Length != 0 && !row.Keys.Take(keyCount).Any(k => k.Contains(query.Filter, StringComparison.OrdinalIgnoreCase))) continue;
            if (total >= query.Offset && rows.Count < query.Limit) rows.Add(row);
            total++;
        }
        return new(catalog.CanEdit, hash, catalog.NamesHash, catalog.Groups, query.Group, query.Filter, query.Offset, total, rows.ToArray());
    }
    private sealed record Parsed(Storage Storage, int Index, ulong[] Keys, ulong Value);
    internal static byte[] Prepare(SaveFile save, Ew9aEdit edit, string hash, int length, out string[] ignored)
    {
        var s = Save(save);
        if (edit.SourceHash != hash) throw new ArgumentException("Event9a preview is stale.");
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Event9a requires valid checksums.");
        var names = new Names(edit.Names); var copy = (SAV9ZA)s.Clone();
        var stores = Definitions.Select(d => Open(copy, d) ?? throw new ArgumentException("Event9a storage is unavailable.")).ToDictionary(g => g.Definition.Id);
        if (edit.Changes is null || edit.Changes.Length > stores.Values.Sum(g => g.Count)) throw new ArgumentException("Invalid Event9a change list.");
        var seen = new HashSet<(string, int)>(); var changes = new Dictionary<(string, int), Ew9aRowChange>();
        foreach (var change in edit.Changes)
        {
            if (change is null || !stores.TryGetValue(change.Group, out var g) || (uint)change.Index >= g.Count || !seen.Add((change.Group, change.Index)) ||
                change.Keys is not null && (change.Keys.Length != g.Definition.KeyCount || change.Keys.Any(v => v is { Length: > 32767 })) ||
                change.Value is { Length: > 32767 }) throw new ArgumentException("Invalid Event9a row.");
            changes.Add((change.Group, change.Index), change);
        }
        var rows = new List<Parsed>(); var ignoredRows = new List<string>();
        // Parse all inputs before any writes. Then mirror the entire source window Save.
        foreach (var g in stores.Values)
        for (int i = 0; i < g.Count; i++)
        {
            var loaded = g.Read(i, names); changes.TryGetValue((g.Definition.Id, i), out var change);
            var texts = loaded.Keys.Select((value, k) => change?.Keys?[k] ?? value).ToArray(); var keys = g.Keys(i);
            for (int k = 0; k < keys.Length; k++)
            {
                if (g.Definition.Kind == "tuple" && k == 1)
                {
                    if (long.TryParse(texts[k], CultureInfo.InvariantCulture, out long value)) keys[k] = unchecked((ulong)value);
                    else ignoredRows.Add($"{g.Definition.Id}:{i}:key{k}");
                }
                else keys[k] = names.Hash(g.Definition.KeyCount == 1 ? texts[k].Trim() : texts[k]);
            }
            string text = change?.Value ?? loaded.Value; ulong number = g.Value(i);
            if (g.Definition.Kind == "bool")
            {
                if (!bool.TryParse(text, out var value)) throw new ArgumentException("Invalid Event9a boolean.");
                number = value ? 1UL : 0UL;
            }
            else if (ulong.TryParse(text, CultureInfo.InvariantCulture, out var value)) number = value;
            else ignoredRows.Add($"{g.Definition.Id}:{i}:value");
            rows.Add(new(g, i, keys, number));
        }
        foreach (var row in rows) { row.Storage.SetValue(row.Index, row.Value); row.Storage.SetKeys(row.Index, row.Keys); }
        foreach (var g in stores.Values) g.Compress();
        var output = copy.Write().ToArray(); var check = new SAV9ZA(output.ToArray());
        if (output.Length != length || check.SaveRevision != s.SaveRevision || !SaveChecksums.Valid(check) || check.AllBlocks.Count != copy.AllBlocks.Count ||
            check.AllBlocks.Where((b, i) => b.Key != copy.AllBlocks[i].Key || b.Type != copy.AllBlocks[i].Type || b.SubType != copy.AllBlocks[i].SubType || !b.Data.SequenceEqual(copy.AllBlocks[i].Data)).Any())
            throw new InvalidOperationException("Event9a export verification failed.");
        ignored = ignoredRows.ToArray(); return output;
    }
    internal static Ew9aPhysicalDiff[] Physical(SAV9ZA previous, SAV9ZA updated, Names names)
    {
        var result = new List<Ew9aPhysicalDiff>();
        foreach (var d in Definitions)
        {
            var p = Open(previous, d); var u = Open(updated, d);
            for (int i = 0; i < Math.Max(p?.Count ?? 0, u?.Count ?? 0); i++)
            {
                var before = p is not null && i < p.Count ? p.Read(i, names) : null;
                var after = u is not null && i < u.Count ? u.Read(i, names) : null;
                if (before?.Raw != after?.Raw) result.Add(new(d.Id, i, before, after));
            }
        }
        return result.ToArray();
    }
    internal static Ew9aBlockChange[] BlockChanges(SAV9ZA previous, SAV9ZA updated, bool eventsOnly)
    {
        var keys = eventsOnly ? Definitions.Select(d => d.Key) : previous.AllBlocks.Select(b => b.Key).Union(updated.AllBlocks.Select(b => b.Key));
        var result = new List<Ew9aBlockChange>();
        foreach (uint key in keys)
        {
            SCBlock? b = previous.Blocks.TryGetBlock(key, out var oldBlock) ? oldBlock : null;
            SCBlock? a = updated.Blocks.TryGetBlock(key, out var newBlock) ? newBlock : null;
            if (b is not null && a is not null && b.Type == a.Type && b.SubType == a.SubType && b.Data.SequenceEqual(a.Data)) continue;
            if (b is null && a is null) continue;
            result.Add(new(key.ToString("X8"), b?.Type.ToString() ?? "Missing", a?.Type.ToString() ?? "Missing", b?.SubType.ToString() ?? "Missing", a?.SubType.ToString() ?? "Missing",
                b is null ? "" : Convert.ToHexString(b.Data), a is null ? "" : Convert.ToHexString(a.Data)));
        }
        return result.ToArray();
    }
    internal static Ew9aComparison Compare(SAV9ZA previous, SAV9ZA updated, string previousHash, string updatedHash, string text)
    {
        var names = new Names(text); var report = new List<string>(); string? error = null;
        // Preserve the source report, including its updated.GetKey deletion-loop behavior.
        // The complete physical diff remains usable if that source loop exceeds a block.
        try
        {
            foreach (var d in Definitions.Where(d => d.Id is "Flags" or "Event" or "Work" or "Quest" or "WorkMable" or "CountMable" or "CountTitle" or "WorkSpawn" or "FieldItems"))
            {
                var p = Open(previous, d) ?? throw new ArgumentException("Event9a previous block unavailable.");
                var u = Open(updated, d) ?? throw new ArgumentException("Event9a updated block unavailable.");
                var lines = new List<string>(); var hashes = new HashSet<ulong>();
                for (int i = 0; i < u.Count; i++)
                {
                    ulong key = u.Keys(i)[0]; if (key == FnvHash.HashEmpty) break;
                    int old = -1;
                    for (int j = 0; j < p.Count; j++) { var k = p.Keys(j)[0]; if (k == key) { old = j; break; } if (k == FnvHash.HashEmpty) break; }
                    string val(ulong v) => d.Kind == "bool" ? (v != 0 ? "True" : "False") : v.ToString(CultureInfo.InvariantCulture);
                    if (old < 0) lines.Add($"{names.Name(key)} added with value {val(u.Value(i))}");
                    else if (p.Value(old) != u.Value(i)) lines.Add($"{names.Name(key)} changed from {val(p.Value(old))} to {val(u.Value(i))}");
                    hashes.Add(key);
                }
                for (int i = 0; i < p.Count; i++)
                {
                    ulong key = u.Keys(i)[0]; if (key == FnvHash.HashEmpty) break;
                    if (!hashes.Contains(key)) lines.Add($"{names.Name(key)} @ {i:X} removed, was {(d.Kind == "bool" ? (p.Value(i) != 0 ? "True" : "False") : p.Value(i).ToString(CultureInfo.InvariantCulture))}");
                }
                if (lines.Count != 0) { report.Add("====="); report.Add($"updated.Blocks.{d.Id}:"); report.Add("====="); report.AddRange(lines); report.Add(""); }
            }
            if (report.Count == 0) report.Add("No differences found.");
        }
        catch (ArgumentException e) { error = e.Message; }
        return new(previousHash, updatedHash, Physical(previous, updated, names), BlockChanges(previous, updated, true), report.ToArray(), error);
    }
}
