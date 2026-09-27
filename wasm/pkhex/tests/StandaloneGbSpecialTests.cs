// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using Api = PokeRNGKit.SaveEditor.Program;

internal static class StandaloneGbSpecialTests
{
    private static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Expected GB special rejection"); }
    private static byte[] Bytes(PKM p) { var data = new byte[p.SIZE_STORED]; p.WriteDecryptedDataStored(data); return data; }
    private static string Json(StandalonePokemonRequest r) => JsonSerializer.Serialize(r, StandalonePokemonJson.Default.StandalonePokemonRequest);
    private static byte[] Apply(GBPKML p, GbSpecialEdit e)
    {
        var input = Bytes(p); var original = input.ToArray();
        try { return Api.EditStandalonePokemonGb(input, Json(new("test." + p.Extension, GbSpecial: e))); }
        finally { Check(input.SequenceEqual(original), "GB special API preserves its input buffer, including rejected requests"); }
    }
    private static void EqualsCore(GBPKML p, GbSpecialFields fields, Action<GBPKML> change)
    {
        var original = Bytes(p); var expected = (GBPKML)p.Clone(); change(expected);
        Check(Apply(p, new("fields", fields)).SequenceEqual(Bytes(expected)), "GB individual fields equal Core bytes and preserve packed neighbors");
        Check(Bytes(p).SequenceEqual(original), "GB field editing preserves source entity");
    }
    public static void Run()
    {
        var korean = new PK2(); StringConverter2KOR.SetString(korean.OriginalTrainerTrash, "테스트", 7, StringConverterOption.Clear50);
        foreach (GBPKML p in new GBPKML[] {new PK1(), new PK1(true), new PK2(), new PK2(true), korean})
        {
            p.Species = 25; p.CurrentLevel = 25; p.TID16 = 12345;
            if (!p.Korean) p.OriginalTrainerName = p.Japanese ? "ア" : "RED";
            p.Nickname = p.Japanese ? "ピカ" : p.Korean ? "피카" : "TEST";
            p.ResetPartyStats(); p.Stat_HPCurrent = 1; p.Status_Condition = 8; p.Stat_ATK = 432;
            if (p is PK1 first) { first.Type1 = 255; first.Type2 = 254; first.CatchRate = 43; }
            if (p is PK2 second) { second.CaughtData = 0xBEEF; second.PokerusState = 0xAF; }
            var before = Bytes(p); var catalog = StandaloneGbSpecial.Read(p);
            Check(catalog.Languages.Select(c => c.Id).SequenceEqual(p.Japanese ? new[] {1} : p.Korean ? new[] {8} : new[] {2, 3, 4, 5, 7}), "GB naming languages match file encoding");
            using var report = JsonDocument.Parse(Api.InspectStandalonePokemon(before, Json(new("test." + p.Extension))));
            Check(report.RootElement.GetProperty("gb").GetProperty("language").GetInt32() == p.GuessedLanguage(), "GB catalog crosses public JSON boundary");
            Check(Apply(p, new("fields", catalog.Fields)).SequenceEqual(before), "GB unchanged uncommon types/location/virus values survive complete form application");
            if (p is PK1)
            {
                Check(catalog.Types.Length == 15 && catalog.Locations.Length == 0, "GB1 catalog excludes later types");
                for (int rate = 0; rate <= 255; rate++) EqualsCore(p, new(CatchRate: rate), e => ((PK1)e).CatchRate = (byte)rate);
                foreach (var type in catalog.Types)
                {
                    Check(type.Name.En == GameInfo.GetStrings("en").types[(int)((MoveType)type.Id).GetMoveTypeGeneration(1)], "GB1 type catalog uses original ID mapping");
                    EqualsCore(p, new(Type1: type.Id), e => ((PK1)e).Type1 = (byte)type.Id);
                    EqualsCore(p, new(Type2: type.Id), e => ((PK1)e).Type2 = (byte)type.Id);
                }
                foreach (var edit in new[] {new GbSpecialFields(CatchRate: -1), new(CatchRate: 256), new(Type1: 6), new(Type2: 256), new(MetLevel: 0), new(PokerusDays: 0)}) Reject(() => Apply(p, new("fields", edit)));
                Reject(() => Apply(p, new("egg", Egg: new("makeEgg"), Language: p.GuessedLanguage())));
            }
            else
            {
                Check(catalog.Locations.Length > 50 && catalog.Locations.All(c => c.Id is >= 0 and <= 127) && catalog.Types.Length == 0, "GB2 location catalog has native 7-bit limits");
                for (int level = 0; level <= 63; level++) EqualsCore(p, new(MetLevel: level), e => e.MetLevel = (byte)level);
                for (int time = 0; time <= 3; time++) EqualsCore(p, new(MetTimeOfDay: time), e => ((PK2)e).MetTimeOfDay = time);
                for (int gender = 0; gender <= 1; gender++) EqualsCore(p, new(TrainerGender: gender), e => e.OriginalTrainerGender = (byte)gender);
                foreach (var loc in catalog.Locations) EqualsCore(p, new(MetLocation: loc.Id), e => e.MetLocation = (ushort)loc.Id);
                for (int strain = 0; strain < 16; strain++)
                {
                    Check(catalog.PokerusDurations[strain] == Pokerus.GetMaxDuration(strain), "GB2 virus duration catalog matches Core");
                    for (int day = 0; day <= Pokerus.GetMaxDuration(strain); day++)
                        EqualsCore(p, new(PokerusStrain: strain, PokerusDays: day), e => { e.PokerusStrain = strain; e.PokerusDays = day; });
                }
                foreach (var edit in new[] {new GbSpecialFields(MetLevel: -1), new(MetLevel: 64), new(MetLocation: 128), new(MetTimeOfDay: 4), new(TrainerGender: 2),
                    new(PokerusStrain: 16), new(PokerusDays: 16), new(PokerusStrain: 0, PokerusDays: 2), new(CatchRate: 0), new(Type1: 0)}) Reject(() => Apply(p, new("fields", edit)));
                foreach (int missing in Enumerable.Range(0, 128).Where(i => i != p.MetLocation && !catalog.Locations.Any(c => c.Id == i))) Reject(() => Apply(p, new("fields", new(MetLocation: missing))));
            }
            foreach (var language in catalog.Languages)
            {
                foreach (ushort species in new ushort[] {10, 25, 29, 32, 83, 122})
                {
                    var source = (GBPKML)p.Clone(); source.Species = species;
                    var expected = (GBPKML)source.Clone(); expected.SetNotNicknamed(language.Id);
                    var actual = Apply(source, new("speciesName", Language: language.Id));
                    Check(actual.SequenceEqual(Bytes(expected)), "GB name restore matches Core including punctuation and gender symbols");
                    if (source is not PK2) continue;
                    var egg = Apply(source, new("egg", Egg: new("makeEgg"), Language: language.Id));
                    var expectedEgg = (PK2)source.Clone(); PokemonEgg.Apply(null, expectedEgg, new("makeEgg"));
                    expectedEgg.IsNicknamed = EggStateLegality.IsNicknameFlagSet(expectedEgg); expectedEgg.Nickname = SpeciesName.GetEggName(language.Id, 2);
                    Check(egg.SequenceEqual(Bytes(expectedEgg)) && egg[1] == 0xFD, "GB2 Egg creation names, cycles and list marker match Core");
                    var reopened = (PK2)StandalonePokemon.Open(egg, "egg.pk2").Entity;
                    Check(reopened.Nickname == SpeciesName.GetEggName(language.Id, 2), "GB2 Egg name survives selected language encoding");
                    var expectedHatch = reopened.Clone(); expectedHatch.ForceHatchPKM(); expectedHatch.SetNotNicknamed(language.Id);
                    var hatch = Apply(reopened, new("egg", Egg: new("hatch"), Language: language.Id));
                    Check(hatch.SequenceEqual(Bytes(expectedHatch)) && hatch[1] == species, "GB2 hatch uses Core location/friendship and explicit name language");
                    Check(expectedHatch.Stat_HPCurrent == 1 && expectedHatch.Stat_ATK == 432 && expectedHatch.Status_Condition == 8, "GB egg helpers do not heal or normalize party stats");
                    foreach (int cycles in new[] {0, 255})
                    {
                        var expectedCycles = reopened.Clone(); expectedCycles.CurrentFriendship = (byte)cycles;
                        Check(Apply(reopened, new("egg", Egg: new("cycles", cycles))).SequenceEqual(Bytes(expectedCycles)), "GB2 cycle endpoints preserve name and packed records");
                    }
                    Reject(() => Apply(reopened, new("egg", Egg: new("makeEgg"), Language: language.Id)));
                    Reject(() => Apply(reopened, new("egg", Egg: new("cycles", 256))));
                    Reject(() => Apply(source, new("egg", Egg: new("hatch"), Language: language.Id)));
                }
            }
            foreach (GbSpecialEdit bad in new[] {new GbSpecialEdit("invalid"), new("fields", new()), new("fields", catalog.Fields, Language: catalog.Language), new("speciesName"), new("speciesName", Language: 9), new("speciesName", catalog.Fields, Language: catalog.Language)}) Reject(() => Apply(p, bad));
            Check(Bytes(p).SequenceEqual(before), "GB special operations preserve original entity");
            Console.WriteLine($"PASS {p.GetType().Name} jp={p.Japanese} ko={p.Korean}: all catch rates/types, packed fields, all virus pairs, localized names/eggs, Core full output, health and original");
        }
    }
}
