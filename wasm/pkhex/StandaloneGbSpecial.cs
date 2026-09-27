// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record GbSpecialFields(int? CatchRate = null, int? Type1 = null, int? Type2 = null,
    int? MetLevel = null, int? MetLocation = null, int? MetTimeOfDay = null, int? TrainerGender = null,
    int? PokerusStrain = null, int? PokerusDays = null);
internal sealed record GbSpecialEdit(string Action, GbSpecialFields? Fields = null, EggEdit? Egg = null, int? Language = null);
internal sealed record GbSpecialInfo(GbSpecialFields Fields, OriginChoice[] Types, OriginChoice[] Locations,
    OriginChoice[] Languages, int Language, int[] PokerusDurations);

internal static class StandaloneGbSpecial
{
    private static LocalizedText Text(Func<GameStrings, string> get) => new(get(GameInfo.GetStrings("zh-Hans")), get(GameInfo.GetStrings("en")), get(GameInfo.GetStrings("ja")));
    private static int[] Languages(GBPKML p) => p.Japanese ? [1] : p.Korean ? [8] : [2, 3, 4, 5, 7];
    public static GbSpecialFields Fields(GBPKML p) => p switch
    {
        PK1 a => new(a.CatchRate, a.Type1, a.Type2),
        PK2 b => new(MetLevel: b.MetLevel, MetLocation: b.MetLocation, MetTimeOfDay: b.MetTimeOfDay,
            TrainerGender: b.OriginalTrainerGender, PokerusStrain: b.PokerusStrain, PokerusDays: b.PokerusDays),
        _ => throw new ArgumentException("GB special fields are unsupported."),
    };
    private static OriginChoice[] Locations() => PokemonOrigin.Localize(s =>
        s.Met.GetLocationList(GameVersion.GSC, EntityContext.Gen2).Where(c => c.Value is >= 0 and <= 127));
    public static GbSpecialInfo Read(GBPKML p) => new(Fields(p), p is PK1 ? Enumerable.Range(0, 256)
        .Where(i => PersonalTable1.TypeIDExists((byte)i)).Select(i => new OriginChoice(i,
            Text(s => s.types[(int)((MoveType)i).GetMoveTypeGeneration(1)]))).ToArray() : [],
        p is PK2 ? Locations() : [], Languages(p).Select(i => new OriginChoice(i, Text(s => s.languageNames[i]))).ToArray(),
        p.GuessedLanguage(), p is PK2 ? Enumerable.Range(0, 16).Select(Pokerus.GetMaxDuration).ToArray() : []);

    public static void Apply(GBPKML p, GbSpecialEdit edit)
    {
        switch (edit.Action)
        {
            case "fields" when edit.Fields is not null && edit.Egg is null && edit.Language is null:
                ApplyFields(p, edit.Fields); return;
            case "speciesName" when edit.Fields is null && edit.Egg is null:
                p.SetNotNicknamed(CheckLanguage(p, edit.Language)); return;
            case "egg" when p is PK2 && edit.Fields is null && edit.Egg is { } egg:
                var language = egg.Action == "cycles" && edit.Language is null ? p.GuessedLanguage() : CheckLanguage(p, edit.Language);
                PokemonEgg.Apply(null, p, egg);
                if (egg.Action == "makeEgg")
                {
                    p.IsNicknamed = EggStateLegality.IsNicknameFlagSet(p);
                    p.Nickname = SpeciesName.GetEggName(language, p.Format);
                }
                else if (egg.Action == "hatch") p.SetNotNicknamed(language);
                return;
            default: throw new ArgumentException("GB special operation is unavailable.");
        }
    }

    private static int CheckLanguage(GBPKML p, int? language)
    {
        if (language is not int value || !Languages(p).Contains(value)) throw new ArgumentException("GB name language is unavailable in this file layout.");
        return value;
    }
    private static void Range(int? value, bool supported, int maximum)
    {
        if (value is int v && (!supported || v < 0 || v > maximum)) throw new ArgumentException("GB special field is unavailable or outside its range.");
    }
    private static void ApplyFields(GBPKML p, GbSpecialFields edit)
    {
        if (edit == new GbSpecialFields()) throw new ArgumentException("GB special edit is empty.");
        Range(edit.CatchRate, p is PK1, 255); Range(edit.Type1, p is PK1, 255); Range(edit.Type2, p is PK1, 255);
        Range(edit.MetLevel, p is PK2, 63); Range(edit.MetLocation, p is PK2, 127); Range(edit.MetTimeOfDay, p is PK2, 3);
        Range(edit.TrainerGender, p is PK2, 1); Range(edit.PokerusStrain, p is PK2, 15); Range(edit.PokerusDays, p is PK2, 15);
        if (p is PK1 first)
        {
            foreach (var (value, current) in new[] {(edit.Type1, first.Type1), (edit.Type2, first.Type2)})
                if (value is int v && v != current && !PersonalTable1.TypeIDExists((byte)v)) throw new ArgumentException("GB type is not in the first-generation catalog.");
            if (edit.CatchRate is int rate) first.CatchRate = (byte)rate;
            if (edit.Type1 is int t1) first.Type1 = (byte)t1;
            if (edit.Type2 is int t2) first.Type2 = (byte)t2;
        }
        else if (p is PK2 second)
        {
            if (edit.MetLocation is int location && location != second.MetLocation && !Locations().Any(c => c.Id == location))
                throw new ArgumentException("GB location is not in the second-generation catalog.");
            var strain = edit.PokerusStrain ?? second.PokerusStrain; var days = edit.PokerusDays ?? second.PokerusDays;
            if ((strain != second.PokerusStrain || days != second.PokerusDays) && days > Pokerus.GetMaxDuration(strain))
                throw new ArgumentException("GB Pokerus days exceed the strain duration.");
            if (edit.MetLevel is int level) second.MetLevel = (byte)level;
            if (edit.MetLocation is int loc) second.MetLocation = (ushort)loc;
            if (edit.MetTimeOfDay is int time) second.MetTimeOfDay = time;
            if (edit.TrainerGender is int gender) second.OriginalTrainerGender = (byte)gender;
            if (edit.PokerusStrain is int virus) second.PokerusStrain = virus;
            if (edit.PokerusDays is int duration) second.PokerusDays = duration;
        }
    }
}
