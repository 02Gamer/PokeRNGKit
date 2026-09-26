using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonEncounterTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Invalid encounter value accepted");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var data = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var fixture = SaveUtil.GetSaveFile(data.ToArray())!;
            var wounded = fixture.GetPartySlotAtIndex(0);
            wounded.Stat_HPCurrent = Math.Max(1, wounded.Stat_HPMax / 2);
            wounded.Status_Condition = 8;
            wounded.RefreshChecksum();
            fixture.SetPartySlotAtIndex(wounded, 0, EntityImportSettings.None);
            data = fixture.Write().ToArray();
            var original = data.ToArray();
            var before = SaveUtil.GetSaveFile(data.ToArray())!;
            foreach (var box in new[] { -1, 0 })
            foreach (var level in new[] { 0, 127 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                var canDates = PokemonEncounter.Read(source).CanDates;
                var edit = new EncounterEdit(level, !source.FatefulEncounter, canDates ? "2000-02-29" : null, canDates ? "2099-12-31" : null);
                var request = new PokemonRawEdit(box, 0, "encounter", Encounter: edit);
                var bytes = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                var after = SaveUtil.GetSaveFile(bytes)!;
                var actual = PokemonEditing.Read(after, box, 0);
                Require(actual.MetLevel == level && actual.FatefulEncounter != source.FatefulEncounter, "Encounter fields persisted");
                Require(actual.OriginalTrainerGender == source.OriginalTrainerGender && actual.Version == source.Version && actual.PID == source.PID, "Adjacent and identity fields preserved");
                Require(actual.MetLocation == source.MetLocation && actual.EggLocation == source.EggLocation && actual.IsEgg == source.IsEgg, "Location and egg state preserved");
                Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "Health preserved");
                Require(after.ChecksumsValid && actual.ChecksumValid && before.PartyCount == after.PartyCount, "Checksums and party count");
                if (canDates)
                {
                    Require(actual.MetDate == new DateOnly(2000,2,29) && actual.EggMetDate == new DateOnly(2099,12,31), "Dates persisted");
                    PokemonEncounter.Apply(actual, new(MetDate: "", EggDate: ""));
                    Require(actual.MetYear == 0 && actual.MetMonth == 0 && actual.MetDay == 0 && actual.EggYear == 0 && actual.EggMonth == 0 && actual.EggDay == 0, "Clear all date bytes");
                }
                for (var b = 0; b < before.BoxCount; b++)
                    for (var slot = 0; slot < before.BoxSlotCount; slot++)
                        if (b != box || slot != 0)
                            Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other box slots preserved");
                if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Party preserved");
                Require(data.SequenceEqual(original), "Original preserved");
            }
        }
        foreach (PKM p in new PKM[] { new PK3(), new CK3(), new XK3(), new PK4(), new PK5(), new PK6(), new PK7(), new PK8(), new PB8() })
        {
            var limit = PokemonEncounter.Read(p).MaxMetLevel;
            p.OriginalTrainerGender = 0;
            PokemonEncounter.Apply(p, new(limit, true));
            Require(p.MetLevel == limit && p.FatefulEncounter && p.OriginalTrainerGender == 0, "Storage width and flag");
            p.OriginalTrainerGender = 1;
            PokemonEncounter.Apply(p, new(0, false));
            Require(p.MetLevel == 0 && !p.FatefulEncounter && p.OriginalTrainerGender == 1, "Preserve set gender bit");
            Reject(() => PokemonEncounter.Apply(p, new(-1)));
            Reject(() => PokemonEncounter.Apply(p, new(limit + 1)));
            Reject(() => PokemonEncounter.Apply(p, new()));
            foreach (var invalid in new[] { "1999-12-31", "2100-01-01", "2001-02-29", "2026-04-31", "2026-1-01", "2026-01-01T00:00:00Z" })
                Reject(() => PokemonEncounter.Apply(p, new(MetDate: invalid)));
            if (!PokemonEncounter.Read(p).CanDates) Reject(() => PokemonEncounter.Apply(p, new(MetDate: "")));
            else
            {
                p.MetMonth = 13; p.MetDay = 32; p.MetYear = 1;
                PokemonEncounter.Apply(p, new(Fateful: true));
                Require(p.MetMonth == 13 && p.MetDay == 32 && p.MetYear == 1, "Untouched invalid date bytes preserved");
                var snapshot = p.Data.ToArray();
                Reject(() => PokemonEncounter.Apply(p, new(MetLevel: 50, MetDate: "2000-01-01", EggDate: "bad")));
                Require(p.Data.SequenceEqual(snapshot), "Invalid requests do not partially mutate entity");
            }
        }
        Console.WriteLine("Encounter records: eleven save formats and entity boundaries passed.");
    }
}
