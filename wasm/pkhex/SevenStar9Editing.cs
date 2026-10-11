// SPDX-License-Identifier: GPL-3.0-or-later
using System.ComponentModel;
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record R7Entry(int Index, bool CanEdit, uint Identifier, bool Captured, bool? Defeated, uint? DefeatedIdentifier, string CaptureRaw, string? DefeatedRaw);
public sealed record R7Query(int Offset = 0, int Limit = 50, string Filter = "");
public sealed record R7Page(bool CanEdit, string SourceHash, int Count, int DefeatedCount, bool HasDefeatedBlock, int Offset, int Limit, string Filter, int Total, R7Entry[] Entries);
public sealed record R7Field(string Name, string Value);
public sealed record R7Change(int Index, R7Field[] Fields);
public sealed record R7Edit(string SourceHash, R7Change[] Changes, string Culture = "en-US", R7Query? Query = null);
public sealed record R7EntryDiff(int Index, R7Entry Before, R7Entry After);
internal static class SevenStar9Editing
{
    internal const uint CaptureKey = 0x8B14392F, DefeatedKey = 0xA4BA4848;
    internal static SAV9SV Save(SaveFile save) => save is SAV9SV s ? s : throw new ArgumentException("SevenStar9 requires Scarlet/Violet.");
    private static bool HasDefeated(SAV9SV s) => s.Blocks.TryGetBlock(DefeatedKey, out var b) && b.Type != SCTypeCode.None;
    internal static R7Entry Entry(SAV9SV s, int index)
    {
        var raids = s.RaidSevenStar;
        if ((uint)index >= raids.CountAll) throw new ArgumentException("Invalid SevenStar9 index.");
        var capture = raids.Captured.GetRaid(index); bool newer = HasDefeated(s);
        bool available = !newer || index < raids.Defeated.CountAll;
        var defeated = newer && available ? raids.Defeated.GetRaid(index) : null;
        return new(index, available, capture.Identifier, capture.Captured,
            available ? defeated?.Defeated ?? capture.Defeated : null, defeated?.Identifier,
            Convert.ToHexString(s.Blocks.GetBlock(CaptureKey).Data.Slice(index * 8, 8)),
            defeated is not null ? Convert.ToHexString(s.Blocks.GetBlock(DefeatedKey).Data.Slice(4 + index * 8, 8)) : null);
    }
    internal static R7Page Read(SaveFile save, string hash, R7Query query)
    {
        var s = Save(save);
        if (query.Offset < 0 || query.Limit is < 1 or > 200 || query.Filter is null || query.Filter.Length > 32767)
            throw new ArgumentException("Invalid SevenStar9 page query.");
        int count = s.RaidSevenStar.CountAll;
        // Search all physical identifiers, but materialize only the requested page.
        var matches = Enumerable.Range(0, count).Where(i => query.Filter.Length == 0 ||
            s.RaidSevenStar.Captured.GetRaid(i).Identifier.ToString(CultureInfo.InvariantCulture).Contains(query.Filter, StringComparison.OrdinalIgnoreCase)).ToArray();
        bool newer = HasDefeated(s);
        bool canEdit = s.State.Exportable && SaveChecksums.Valid(s) && count > 0 && (!newer || s.RaidSevenStar.Defeated.CountAll > 0);
        return new(canEdit, hash, count, s.RaidSevenStar.Defeated.CountAll, newer, query.Offset, query.Limit, query.Filter, matches.Length,
            matches.Skip(query.Offset).Take(query.Limit).Select(i => Entry(s, i)).ToArray());
    }
    private static CultureInfo Culture(string name) => name switch
    {
        "zh-CN" or "en-US" or "ja-JP" => CultureInfo.GetCultureInfo(name),
        _ => throw new ArgumentException("Invalid SevenStar9 input culture."),
    };
    internal static byte[] Prepare(SaveFile save, R7Edit edit, string hash, int length)
    {
        var s = Save(save); var culture = Culture(edit.Culture);
        if (edit.SourceHash != hash) throw new ArgumentException("SevenStar9 preview is stale.");
        if (!Read(s, hash, edit.Query ?? new()).CanEdit || edit.Changes is null || edit.Changes.Length > 32768)
            throw new ArgumentException("SevenStar9 is read-only or has an invalid change count.");
        var copy = (SAV9SV)s.Clone();
        foreach (var change in edit.Changes)
        {
            if (change is null || !Entry(copy, change.Index).CanEdit || change.Fields is null || change.Fields.Length > 3 ||
                change.Fields.Any(f => f is null || f.Name is null || f.Value is null || f.Value.Length > 32767) ||
                change.Fields.Select(f => f.Name).Distinct().Count() != change.Fields.Length)
                throw new ArgumentException("Invalid SevenStar9 fields or incomplete paired record.");
            var detail = copy.RaidSevenStar.GetRaid(change.Index);
            foreach (var field in change.Fields)
            {
                object Convert(TypeConverter converter) => converter.ConvertFrom(null, culture, field.Value) ?? throw new ArgumentException("Invalid SevenStar9 value.");
                try
                {
                    switch (field.Name)
                    {
                        case "Identifier": detail.Identifier = (uint)Convert(new UInt32Converter()); break;
                        case "Captured": detail.Captured = (bool)Convert(new BooleanConverter()); break;
                        case "Defeated": detail.Defeated = (bool)Convert(new BooleanConverter()); break;
                        default: throw new ArgumentException("Invalid SevenStar9 property.");
                    }
                }
                catch (Exception e) when (e is FormatException or OverflowException or NotSupportedException)
                { throw new ArgumentException("Invalid SevenStar9 conversion.", e); }
            }
        }
        var output = copy.Write().ToArray(); var parsed = new SAV9SV(output.ToArray());
        if (output.Length != length || parsed.Version != s.Version || parsed.SaveRevision != s.SaveRevision || !SaveChecksums.Valid(parsed) ||
            parsed.AllBlocks.Count != copy.AllBlocks.Count || parsed.AllBlocks.Where((b, i) => b.Key != copy.AllBlocks[i].Key || b.Type != copy.AllBlocks[i].Type || b.SubType != copy.AllBlocks[i].SubType || !b.Data.SequenceEqual(copy.AllBlocks[i].Data)).Any())
            throw new InvalidOperationException("SevenStar9 export verification failed.");
        return output;
    }
    internal static R7EntryDiff[] Changes(SAV9SV before, SAV9SV after) => Enumerable.Range(0, before.RaidSevenStar.CountAll)
        .Select(i => new R7EntryDiff(i, Entry(before, i), Entry(after, i))).Where(d => d.Before != d.After).ToArray();
    internal static Ew9aBlockChange[] Blocks(SAV9SV before, SAV9SV after) => new[] { CaptureKey, DefeatedKey }.Where(k => before.Blocks.HasBlock(k)).Select(k =>
    {
        var b = before.Blocks.GetBlock(k); var a = after.Blocks.GetBlock(k);
        return new Ew9aBlockChange(k.ToString("X8"), b.Type.ToString(), a.Type.ToString(), b.SubType.ToString(), a.SubType.ToString(), Convert.ToHexString(b.Data), Convert.ToHexString(a.Data));
    }).Where(b => b.Before != b.After || b.BeforeType != b.AfterType || b.BeforeSubtype != b.AfterSubtype).ToArray();
}
