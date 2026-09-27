// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokedexCapability(string Kind, bool CanEdit);
public sealed record SimpleDexQuery(string FileName);
public sealed record SimpleDexEntry(int Species, LocalizedText Name, bool Seen, bool Caught, bool CanCatch);
public sealed record SimpleDexCatalog(int Generation, bool VirtualConsole, bool CanEdit, SimpleDexEntry[] Entries);
public sealed record SimpleDexFlagEdit(int Species, bool? Seen, bool? Caught);
public sealed record SimpleDexEdit(string FileName, SimpleDexFlagEdit[] Entries);

internal static class SimplePokedex
{
    public static bool Supports(SaveFile save) => save is SAV1 or SAV2 or SAV3RS or SAV3E or SAV3FRLG;
    public static PokedexCapability? Capability(SaveFile save) => Supports(save) ? new("simple", save.State.Exportable && SaveChecksums.Valid(save)) : null;
    private static void SetFileName(SaveFile save, string name)
    {
        if (name is null || name.Length > 1024 || name.Any(char.IsControl) || name.Contains('/') || name.Contains('\\'))
            throw new ArgumentException("Pokedex file name is invalid.");
        if (name.Length != 0) save.Metadata.SetExtraInfo(name);
    }
    public static SimpleDexCatalog Read(SaveFile save, string fileName)
    {
        if (!Supports(save)) throw new ArgumentException("Pokedex editor is unsupported for this save.");
        SetFileName(save, fileName);
        bool vc = save is SAV3FRLG { IsVirtualConsole: true };
        var zh = GameInfo.GetStrings("zh-Hans").specieslist;
        var en = GameInfo.GetStrings("en").specieslist;
        var ja = GameInfo.GetStrings("ja").specieslist;
        return new(save.Generation, vc, save.State.Exportable && SaveChecksums.Valid(save),
            Enumerable.Range(1, save.MaxSpeciesID).Select(id => new SimpleDexEntry(id, new(zh[id], en[id], ja[id]),
                save.GetSeen((ushort)id), save.GetCaught((ushort)id), !vc || !Legal.IsForeignFRLG((ushort)id))).ToArray());
    }
    public static string Apply(SaveFile save, SimpleDexEdit edit)
    {
        if (!Supports(save)) throw new ArgumentException("Pokedex editor is unsupported for this save.");
        SetFileName(save, edit.FileName);
        if (edit.Entries is null || edit.Entries.Length != save.MaxSpeciesID || edit.Entries.Any(e => e is null ||
            e.Species < 1 || e.Species > save.MaxSpeciesID || !e.Seen.HasValue || !e.Caught.HasValue) ||
            edit.Entries.Select(e => e.Species).Distinct().Count() != save.MaxSpeciesID)
            throw new ArgumentException("Pokedex edit requires one complete seen/caught entry for each species.");
        // SAV_SimplePokedex.SaveAllFlags intentionally visits every species. In Gen2 this also repairs Unown letters.
        foreach (var entry in edit.Entries.OrderBy(e => e.Species))
        {
            save.SetSeen((ushort)entry.Species, entry.Seen!.Value);
            save.SetCaught((ushort)entry.Species, entry.Caught!.Value);
        }
        if (save is SAV3FRLG { IsVirtualConsole: true })
            for (ushort species = 151; species <= save.MaxSpeciesID; species++)
                if (Legal.IsForeignFRLG(species)) save.SetCaught(species, false);
        if (save is SAV3 gba) gba.MirrorSeenFlags();
        return Snapshot(save);
    }
    public static string Snapshot(SaveFile save)
    {
        var length = (save.MaxSpeciesID + 7) / 8;
        switch (save)
        {
            case SAV1 s:
                var o1 = s.Japanese ? SAV1Offsets.JPN : SAV1Offsets.INT;
                return Convert.ToHexString(s.Data.Slice(o1.DexCaught, length)) + Convert.ToHexString(s.Data.Slice(o1.DexSeen, length));
            case SAV2 s:
                var o2 = new SAV2Offsets(s);
                return Convert.ToHexString(s.Data.Slice(o2.PokedexCaught, length)) + Convert.ToHexString(s.Data.Slice(o2.PokedexSeen, 0x3C));
            case SAV3 s:
                return Convert.ToHexString(s.Small.Slice(0x28, length)) + Convert.ToHexString(s.Small.Slice(0x5C, length)) +
                    Convert.ToHexString(s.Large.Slice(s.LargeBlock.SeenOffset2, length)) + Convert.ToHexString(s.Large.Slice(s.LargeBlock.SeenOffset3, length));
            default: throw new ArgumentException("Pokedex editor is unsupported for this save.");
        }
    }
}
