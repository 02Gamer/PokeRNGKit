// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record TrainerOriginRegion(int Country, int Region, int ConsoleRegion, OriginChoice[] Countries, GeoRegions[] Regions, OriginChoice[] Consoles);
public sealed record PokemonTrainerDetailsCatalog(int Language, int OriginalGender, OriginChoice[] Languages, int MaxNameLength,
    string? HandlingName, int? HandlingGender, int? Handler, int? HandlingLanguage, OriginChoice[] HandlingLanguages,
    TrainerOriginRegion? OriginRegion, int? BattleVersion, OriginChoice[] BattleVersions, int? ObedienceLevel, int? SuggestedObedienceLevel);
public sealed record PokemonTrainerDetailsEdit(string Action = "values", int? Language = null, int? OriginalGender = null,
    string? HandlingName = null, int? HandlingGender = null, int? Handler = null, int? HandlingLanguage = null,
    int? Country = null, int? Region = null, int? ConsoleRegion = null, int? BattleVersion = null, int? ObedienceLevel = null);

internal static class PokemonTrainerDetails
{
    public static PokemonTrainerDetailsCatalog Read(PKM p, SaveFile? save = null)
    {
        if (p.Format < 3) throw new ArgumentException("Trainer details require a Generation III or later entity.");
        byte generation = save?.Generation ?? p.Format;
        var context = save?.Context ?? p.Context;
        IGameValueLimit limits = save is null ? p : save;
        var languages = PokemonOrigin.Localize(s => s.LanguageDataSource(generation, context));
        var games = GameUtil.GetVersionsWithinRange(limits, context).ToHashSet();
        var versions = p is IBattleVersion ? PokemonOrigin.Localize(s => s.VersionDataSource.Where(c => c.Value == 0 || games.Contains((GameVersion)c.Value))) : [];
        var handlingLanguages = p is IHandlerLanguage ? PokemonOrigin.Localize(s => new[] { s.Empty }.Concat(s.LanguageDataSource(generation, context))) : [];
        TrainerOriginRegion? origin = PokemonModeRules.Read(p).OriginRegion&&p is IRegionOrigin r ? new(r.Country, r.Region, r.ConsoleRegion, GeographicCatalog.Countries.Value, GeographicCatalog.Regions.Value, PokemonOrigin.Localize(s => s.Regions)) : null;
        bool handling = p.Format >= 6;
        return new(p.Language, p.OriginalTrainerGender, languages, p.MaxStringLengthTrainer,
            handling ? p.HandlingTrainerName : null, handling ? p.HandlingTrainerGender : null, handling ? p.CurrentHandler : null,
            p is IHandlerLanguage h ? h.HandlingTrainerLanguage : null, handlingLanguages, origin,
            p is IBattleVersion b ? (int)b.BattleVersion : null, versions,
            p is IObedienceLevel o ? o.ObedienceLevel : null,
            p is IObedienceLevel obedience ? obedience.GetSuggestedObedienceLevel(p, (byte)Math.Clamp((int)p.MetLevel, 0, 100)) : null);
    }

    public static void Apply(PKM p, PokemonTrainerDetailsEdit edit, SaveFile? save = null)
    {
        var source = Read(p, save);
        bool values = edit.Language is not null || edit.OriginalGender is not null || edit.HandlingName is not null || edit.HandlingGender is not null || edit.Handler is not null || edit.HandlingLanguage is not null || edit.Country is not null || edit.Region is not null || edit.ConsoleRegion is not null || edit.BattleVersion is not null || edit.ObedienceLevel is not null;
        var copy = p.Clone();
        if (edit.Action == "suggestObedience")
        {
            if (values || source.SuggestedObedienceLevel is not int suggested) throw new ArgumentException("Obedience suggestion is unavailable or has unexpected parameters.");
            ((IObedienceLevel)copy).ObedienceLevel = (byte)suggested;
        }
        else if (edit.Action == "values" && values)
        {
            CheckChoice(edit.Language, source.Language, source.Languages);
            CheckChoice(edit.HandlingLanguage, source.HandlingLanguage, source.HandlingLanguages);
            CheckChoice(edit.BattleVersion, source.BattleVersion, source.BattleVersions);
            CheckGender(edit.OriginalGender, source.OriginalGender);
            CheckGender(edit.HandlingGender, source.HandlingGender);
            if ((edit.HandlingName is not null || edit.Handler is not null) && source.Handler is null) throw new ArgumentException("Handling trainer is unavailable.");
            if (edit.HandlingName is { } name && (name.Length > source.MaxNameLength || name.Contains('\0'))) throw new ArgumentException("Handling trainer name exceeds the source field length.");
            if (edit.Handler is int handler && handler != source.Handler && handler is not (0 or 1)) throw new ArgumentException("Invalid current handler.");
            if (edit.ObedienceLevel is int level && (source.ObedienceLevel is null || level is < 0 or > 999)) throw new ArgumentException("Obedience input requires three decimal mask positions.");
            if (edit.Country is not null || edit.Region is not null || edit.ConsoleRegion is not null)
            {
                var origin = source.OriginRegion ?? throw new ArgumentException("Original region is unavailable.");
                CheckChoice(edit.Country, origin.Country, origin.Countries);
                CheckChoice(edit.ConsoleRegion, origin.ConsoleRegion, origin.Consoles);
                if (edit.Region is int region && (region != origin.Region || edit.Country is int country && country != origin.Country))
                    CheckChoice(region, null, origin.Regions.FirstOrDefault(r => r.Country == (edit.Country ?? origin.Country))?.Choices ?? []);
            }
            if (edit.Language is int language && language != copy.Language)
            {
                copy.Language = language;
                // PreparePK3 saves language before SaveMisc1 re-encodes the visible names.
                string nickname = !p.IsNicknamed && !PossibleNotNicknamed(p)
                    ? p.IsEgg ? SpeciesName.GetEggName(language, p.Format) : SpeciesName.GetSpeciesNameGeneration(p.Species, language, p.Format)
                    : p.Nickname;
                if (copy.Nickname != nickname) copy.Nickname = nickname;
                if (copy.OriginalTrainerName != p.OriginalTrainerName) copy.OriginalTrainerName = p.OriginalTrainerName;
                if (copy.HandlingTrainerName != p.HandlingTrainerName) copy.HandlingTrainerName = p.HandlingTrainerName;
            }
            if (edit.OriginalGender is int gender && gender != source.OriginalGender) copy.OriginalTrainerGender = (byte)gender;
            if (edit.HandlingName is string ht && ht != source.HandlingName) copy.HandlingTrainerName = ht;
            if (edit.HandlingGender is int hg && hg != source.HandlingGender) copy.HandlingTrainerGender = (byte)hg;
            if (edit.Handler is int current && current != source.Handler) copy.CurrentHandler = (byte)current;
            if (edit.HandlingLanguage is int hl && hl != source.HandlingLanguage) ((IHandlerLanguage)copy).HandlingTrainerLanguage = (byte)hl;
            if (edit.HandlingName is not null && string.IsNullOrWhiteSpace(copy.HandlingTrainerName)) { copy.CurrentHandler = 0; copy.HandlingTrainerGender = 0; }
            if (edit.Handler == 1 && string.IsNullOrWhiteSpace(copy.HandlingTrainerName)) throw new ArgumentException("Current handling trainer requires a name.");
            if (copy is IRegionOrigin geo)
            {
                if (edit.Country is int country && country != source.OriginRegion!.Country) geo.Country = (byte)country;
                if (edit.Region is int region && region != source.OriginRegion!.Region) geo.Region = (byte)region;
                if (edit.ConsoleRegion is int console && console != source.OriginRegion!.ConsoleRegion) geo.ConsoleRegion = (byte)console;
            }
            if (edit.BattleVersion is int battle && battle != source.BattleVersion) ((IBattleVersion)copy).BattleVersion = (GameVersion)battle;
            if (edit.ObedienceLevel is int obedience && obedience != source.ObedienceLevel) ((IObedienceLevel)copy).ObedienceLevel = unchecked((byte)obedience);
            // Reject fields that the concrete format cannot store, without changing the caller's bytes.
            if ((edit.Language is int l && copy.Language != l) || (edit.OriginalGender is int g && copy.OriginalTrainerGender != g) ||
                (edit.HandlingName is string n && copy.HandlingTrainerName != n) ||
                (edit.HandlingGender is int h && !string.IsNullOrWhiteSpace(copy.HandlingTrainerName) && copy.HandlingTrainerGender != h) ||
                (edit.Handler is int c && copy.CurrentHandler != c) ||
                (edit.HandlingLanguage is int lang && ((IHandlerLanguage)copy).HandlingTrainerLanguage != lang) ||
                (edit.BattleVersion is int v && (int)((IBattleVersion)copy).BattleVersion != v)) throw new ArgumentException("Trainer detail cannot be represented by this format.");
        }
        else throw new ArgumentException("Trainer detail action is empty or unavailable.");
        copy.Data.CopyTo(p.Data);
    }

    private static void CheckChoice(int? value, int? current, OriginChoice[] choices)
    {
        if (value is int v && (current is null && choices.Length == 0 || v != current && !choices.Any(c => c.Id == v))) throw new ArgumentException("Trainer detail is outside the source catalog.");
    }
    private static void CheckGender(int? value, int? current)
    {
        if (value is int v && (current is null || v != current && v is not (0 or 1))) throw new ArgumentException("Trainer gender is unavailable or invalid.");
    }
    private static bool PossibleNotNicknamed(PKM p)
    {
        ushort species = p.IsEgg ? (ushort)0 : p.Species;
        if (!SpeciesName.IsNicknamedAnyLanguage(species, p.Nickname, p.Context)) return true;
        return !p.IsEgg && p.Context == EntityContext.Gen5 && species <= 493 && !p.Gen5 && !SpeciesName.IsNicknamedAnyLanguage(species, p.Nickname, EntityContext.Gen4);
    }
}
