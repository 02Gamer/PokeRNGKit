// SPDX-License-Identifier: GPL-3.0-or-later
using System.ComponentModel;
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record R9Entry(int Index, bool IsEnabled, uint AreaID, uint LotteryGroup, uint SpawnPointID, string ScenePointName, string Seed, uint Unused, string Content, uint ContentRaw, bool IsClaimedLeaguePoints, string Raw);
public sealed record R9Region(string Origin, bool Available, int CountUsed, int CountAll, bool HasSeeds, string? CurrentSeed, string? TomorrowSeed, R9Entry[] Entries);
public sealed record R9Catalog(bool CanEdit, string SourceHash, R9Region[] Regions);
public sealed record R9Field(string Name, string Value);
public sealed record R9Operation(string Action, string Origin, int? Index = null, R9Field[]? Fields = null, string? Today = null, string? Tomorrow = null, bool? SeedToo = null);
public sealed record R9Edit(string SourceHash, R9Operation[] Operations, string Culture = "en-US");
public sealed record R9EntryDiff(string Origin, int Index, R9Entry Before, R9Entry After);
internal static class Raid9Editing
{
    internal const uint PaldeaKey = 0xCAAC8800, DlcKey = 0x100B93DA;
    internal static readonly string[] Origins = ["Paldea", "Kitakami", "BlueberryAcademy"];
    internal static SAV9SV Save(SaveFile save) => save is SAV9SV s ? s : throw new ArgumentException("Raid9 requires Scarlet/Violet.");
    internal static RaidSpawnList9 Region(SAV9SV save, string origin) => origin switch
    {
        "Paldea" => save.RaidPaldea, "Kitakami" => save.RaidKitakami, "BlueberryAcademy" => save.RaidBlueberry,
        _ => throw new ArgumentException("Invalid Raid9 region."),
    };
    internal static bool Available(SAV9SV save, string origin)
    {
        var list = Region(save, origin);
        return save.Blocks.TryGetBlock(origin == "Paldea" ? PaldeaKey : DlcKey, out var block) &&
            block.Data.Length >= (origin == "Paldea" ? 16 + list.CountUsed * 32 : 0x1900) && list.CountAll >= list.CountUsed;
    }
    private static int Offset(string origin, int index) => (origin == "Paldea" ? 16 : origin == "BlueberryAcademy" ? 0xC80 : 0) + index * 32;
    internal static R9Entry Entry(SAV9SV save, string origin, int index)
    {
        var entry = Region(save, origin).GetRaid(index);
        var block = save.Blocks.GetBlock(origin == "Paldea" ? PaldeaKey : DlcKey);
        return new(index, entry.IsEnabled, entry.AreaID, entry.LotteryGroup, entry.SpawnPointID, entry.ScenePointName,
            entry.Seed.ToString("X8"), entry.Unused, entry.Content.ToString(), (uint)entry.Content, entry.IsClaimedLeaguePoints,
            Convert.ToHexString(block.Data.Slice(Offset(origin, index), 32)));
    }
    internal static R9Catalog Read(SaveFile save, string hash)
    {
        var s = Save(save);
        var regions = Origins.Select(origin =>
        {
            var list = Region(s, origin); bool available = Available(s, origin);
            return new R9Region(origin, available, list.CountUsed, list.CountAll, list.HasSeeds,
                available && list.HasSeeds ? list.CurrentSeed.ToString("X16") : null,
                available && list.HasSeeds ? list.TomorrowSeed.ToString("X16") : null,
                available ? Enumerable.Range(0, list.CountUsed).Select(i => Entry(s, origin, i)).ToArray() : []);
        }).ToArray();
        return new(s.State.Exportable && SaveChecksums.Valid(s) && regions.Any(r => r.Available), hash, regions);
    }
    private static CultureInfo Culture(string name) => name switch
    {
        "zh-CN" or "en-US" or "ja-JP" => CultureInfo.GetCultureInfo(name),
        _ => throw new ArgumentException("Invalid Raid9 input culture."),
    };
    private static void Fields(TeraRaidDetail raid, R9Field[] fields, CultureInfo culture)
    {
        if (fields is null || fields.Length > 8 || fields.Any(f => f is null || f.Name is null || f.Value is null || f.Value.Length > 32767) || fields.Select(f => f.Name).Distinct().Count() != fields.Length)
            throw new ArgumentException("Invalid Raid9 property fields.");
        object Convert(TypeConverter converter, string value) => converter.ConvertFrom(null, culture, value) ?? throw new ArgumentException("Invalid Raid9 property value.");
        foreach (var field in fields)
        {
            try
            {
                switch (field.Name)
                {
                    case "IsEnabled": raid.IsEnabled = (bool)Convert(new BooleanConverter(), field.Value); break;
                    case "AreaID": raid.AreaID = (uint)Convert(new UInt32Converter(), field.Value); break;
                    case "LotteryGroup": raid.LotteryGroup = (uint)Convert(new UInt32Converter(), field.Value); break;
                    case "SpawnPointID": raid.SpawnPointID = (uint)Convert(new UInt32Converter(), field.Value); break;
                    case "Seed": raid.Seed = (uint)Convert(new TypeConverterU32(), field.Value); break;
                    case "Unused": raid.Unused = (uint)Convert(new UInt32Converter(), field.Value); break;
                    case "Content": raid.Content = (TeraRaidContentType)Convert(new EnumConverter(typeof(TeraRaidContentType)), field.Value); break;
                    case "IsClaimedLeaguePoints": raid.IsClaimedLeaguePoints = (bool)Convert(new BooleanConverter(), field.Value); break;
                    default: throw new ArgumentException("Invalid or read-only Raid9 property.");
                }
            }
            catch (Exception error) when (error is FormatException or OverflowException or NotSupportedException)
            { throw new ArgumentException("Invalid Raid9 property conversion.", error); }
        }
    }
    private static void Seed(RaidSpawnList9 region, string origin, string text, bool today, List<string> ignored)
    {
        if (text.Length > 16) throw new ArgumentException("Raid9 region seed text is too long.");
        string filtered = Util.GetOnlyHex(text);
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(filtered) || filtered.Length != text.Length)
        { ignored.Add(origin + (today ? ":CurrentSeed" : ":TomorrowSeed")); return; }
        var value = ulong.Parse(text, NumberStyles.HexNumber, CultureInfo.InvariantCulture);
        if (today) region.CurrentSeed = value; else region.TomorrowSeed = value;
    }
    internal static byte[] Prepare(SaveFile save, R9Edit edit, string hash, int length, out string[] ignored)
    {
        var s = Save(save); var culture = Culture(edit.Culture);
        if (edit.SourceHash != hash) throw new ArgumentException("Raid9 preview is stale.");
        if (!Read(s, hash).CanEdit || edit.Operations is null || edit.Operations.Length > 512) throw new ArgumentException("Raid9 is read-only or has an invalid operation count.");
        var copy = (SAV9SV)s.Clone(); var notes = new List<string>();
        foreach (var operation in edit.Operations)
        {
            if (operation is null || !Available(copy, operation.Origin)) throw new ArgumentException("Raid9 region is unavailable.");
            var region = Region(copy, operation.Origin);
            if (operation.Action != "fields" && operation.Fields is not null || operation.Action != "seeds" && (operation.Today is not null || operation.Tomorrow is not null) || operation.Action != "propagate" && operation.SeedToo is not null || operation.Action == "seeds" && operation.Index is not null)
                throw new ArgumentException("Invalid Raid9 action fields.");
            switch (operation.Action)
            {
                case "fields":
                    if (operation.Index is not { } index || (uint)index >= region.CountUsed) throw new ArgumentException("Invalid Raid9 index.");
                    Fields(region.GetRaid(index), operation.Fields ?? throw new ArgumentException("Missing Raid9 fields."), culture); break;
                case "seeds":
                    if (!region.HasSeeds || operation.Today is null && operation.Tomorrow is null) throw new ArgumentException("Raid9 region has no seed controls.");
                    // These are explicit Validated events. Saving never parses pending text.
                    if (operation.Today is { } today) Seed(region, operation.Origin, today, true, notes);
                    if (operation.Tomorrow is { } tomorrow) Seed(region, operation.Origin, tomorrow, false, notes);
                    break;
                case "propagate":
                    if (operation.Index is not { } source || (uint)source >= region.CountUsed || operation.SeedToo is not { } seedToo) throw new ArgumentException("Invalid Raid9 propagation.");
                    region.Propagate(source, seedToo); break;
                default: throw new ArgumentException("Invalid Raid9 action.");
            }
        }
        var output = copy.Write().ToArray(); var parsed = new SAV9SV(output.ToArray());
        if (output.Length != length || parsed.Version != s.Version || parsed.SaveRevision != s.SaveRevision || !SaveChecksums.Valid(parsed) || parsed.AllBlocks.Count != copy.AllBlocks.Count || parsed.AllBlocks.Where((b, i) => b.Key != copy.AllBlocks[i].Key || b.Type != copy.AllBlocks[i].Type || b.SubType != copy.AllBlocks[i].SubType || !b.Data.SequenceEqual(copy.AllBlocks[i].Data)).Any())
            throw new InvalidOperationException("Raid9 export verification failed.");
        ignored = notes.Distinct().ToArray(); return output;
    }
    internal static R9EntryDiff[] Changes(SAV9SV before, SAV9SV after) => Origins.Where(o => Available(before, o)).SelectMany(origin => Enumerable.Range(0, Region(before, origin).CountUsed).Select(i => new R9EntryDiff(origin, i, Entry(before, origin, i), Entry(after, origin, i)))).Where(d => d.Before != d.After).ToArray();
    internal static Ew9aBlockChange[] Blocks(SAV9SV before, SAV9SV after) => new[] { PaldeaKey, DlcKey }.Where(k => before.Blocks.HasBlock(k)).Select(k =>
    {
        var b = before.Blocks.GetBlock(k); var a = after.Blocks.GetBlock(k);
        return new Ew9aBlockChange(k.ToString("X8"), b.Type.ToString(), a.Type.ToString(), b.SubType.ToString(), a.SubType.ToString(), Convert.ToHexString(b.Data), Convert.ToHexString(a.Data));
    }).Where(b => b.Before != b.After || b.BeforeType != b.AfterType || b.BeforeSubtype != b.AfterSubtype).ToArray();
}
