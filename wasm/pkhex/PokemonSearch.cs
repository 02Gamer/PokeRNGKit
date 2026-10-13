// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Searching;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonSearchQuery(ushort Species = 0, int Ability = -1, int Nature = 25,
    int Item = -1, string Nickname = "", int Version = -1, int Generation = 0,
    int HiddenPowerType = -1, int LevelComparison = 0, string Level = "",
    int IvType = 0, int EvType = 0, bool? Shiny = null, bool? Egg = null,
    string Esv = "", ushort[]? Moves = null, string Instructions = "");
public sealed record PokemonSearchPosition(int Box, int Slot);
public sealed record PokemonSearchResults(PokemonSearchPosition[] Matches);

// Source EntitySearchControl.CreateSearchSettings + SearchSettings.CreateSearchPredicate.
// Hidden context controls live in FLP_Format, so first-show top-level resets preserve them.
internal static class PokemonSearch
{
    internal static SearchSettings Settings(PokemonSearchQuery query, SaveFile? save = null, EntityContext? context = null, SearchComparison? comparison = null)
    {
        if (query.Level is null || query.Esv is null || query.Nickname is null || query.Instructions is null)
            throw new ArgumentException("Search text fields are missing.");
        if (query.Generation is < 0 or > 9 || query.LevelComparison is < 0 or > 3 ||
            query.IvType is < 0 or > 6 || query.EvType is < 0 or > 4 ||
            query.Nature is < 0 or > 25 || query.Ability < -1 || query.Item < -1 ||
            query.HiddenPowerType is < -1 or > 15 || query.Moves is { Length: > 4 } ||
            query.Level.Length > 3 || query.Esv.Length > 4 || query.Nickname.Length > 32767 ||
            query.Instructions.Length > 32767 || query.Version is not (-1 or 0) &&
            (query.Version is < 0 or > 255 || !((GameVersion)query.Version).IsValidSavedVersion()))
            throw new ArgumentException("Invalid source search settings.");
        var settings = new SearchSettings
        {
            Context = context ?? save?.Context ?? EntityContext.None,
            SearchContext = comparison ?? (save is null ? SearchComparison.None : save.Generation >= 8 ? SearchComparison.Equals : SearchComparison.LessThanEquals),
            Species = query.Species, Ability = query.Ability, Nature = (Nature)query.Nature,
            Item = query.Item, Nickname = query.Nickname.Trim(), Version = (GameVersion)query.Version,
            Generation = (byte)query.Generation, HiddenPowerType = query.HiddenPowerType,
            SearchLevel = (SearchComparison)query.LevelComparison,
            Level = byte.TryParse(query.Level, out byte level) ? level : null,
            IVType = query.IvType, EVType = query.EvType, SearchShiny = query.Shiny,
            SearchEgg = query.Egg, ESV = query.Egg is not null && int.TryParse(query.Esv, out int esv) ? esv : null,
            BatchInstructions = query.Instructions,
        };
        foreach (ushort move in query.Moves ?? []) settings.AddMove(move);
        return settings;
    }

    internal static PokemonSearchResults Read(SaveFile save, PokemonSearchQuery query)
    {
        var filter = Settings(query, save).CreateSearchPredicate();
        if (!save.HasBox) return new([]);
        var result = new List<PokemonSearchPosition>();
        for (int box = 0; box < save.BoxCount; box++)
            for (int slot = 0; slot < save.BoxSlotCount; slot++)
            {
                var p = save.GetBoxSlotAtIndex(box, slot);
                if (p.Species != 0 && filter(p)) result.Add(new(box, slot));
            }
        return new(result.ToArray());
    }

    internal static PokemonSearchPosition? Seek(SaveFile save, PokemonSearchQuery query,
        int box, int slot, bool reverse)
    {
        var filter = Settings(query, save).CreateSearchPredicate();
        if (!save.HasBox) return null;
        if ((uint)box >= save.BoxCount || slot < -1 || slot >= save.BoxSlotCount)
            throw new ArgumentException("Invalid search starting position.");
        return SearchUtil.TrySeekNext(save, filter, out var result, box, slot, reverse)
            ? new(result.Box, result.Slot) : null;
    }
}
