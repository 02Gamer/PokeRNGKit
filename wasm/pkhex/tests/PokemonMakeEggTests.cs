using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonMakeEggTests
{
    private static SaveFile Open(byte[] bytes) => SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static byte[] Apply(byte[] data, int box) => SaveService.EditPokemonRaw(data,
        JsonSerializer.Serialize(new PokemonRawEdit(box, 0, "egg", Egg: new("makeEgg")), SaveJsonContext.Default.PokemonRawEdit));
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        foreach (var traded in new[] { false, true })
        {
            var fixture = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            var p = fixture.GetPartySlotAtIndex(0);
            p.IsEgg = false;
            p.OriginalTrainerName = fixture.OT;
            p.TID16 = (ushort)(fixture.TID16 ^ (traded ? 1 : 0)); p.SID16 = fixture.SID16;
            p.EggLocation = LocationEdits.GetNoneLocation(p); p.EggMetDate = null;
            p.Stat_HPCurrent = 1; p.Status_Condition = 8;
            p.RefreshChecksum();
            fixture.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            fixture.SetPartySlotAtIndex(p, 1, EntityImportSettings.None);
            fixture.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray(); var original = data.ToArray(); var before = Open(data);
            foreach (var box in new[] { -1, 0 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                var after = Open(Apply(data, box)); var actual = PokemonEditing.Read(after, box, 0);
                Require(actual.IsEgg && actual.OriginalTrainerFriendship == EggStateLegality.GetMinimumEggHatchCycles(actual), "Egg flag and cycles");
                Require(actual.Nickname == SpeciesName.GetEggName(actual.Language, actual.Format), "Egg name");
                Require(actual.Species == source.Species && actual.PID == source.PID && actual.EXP == source.EXP && actual.Moves.SequenceEqual(source.Moves), "Identity and moves preserved");
                Require(actual.OriginalTrainerTrash.SequenceEqual(source.OriginalTrainerTrash), "Original trainer bytes preserved");
                Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "No healing");
                if (actual is PK3) Require(actual.Language == (int)LanguageID.Japanese, "PK3 egg language");
                if (actual.Format >= 4)
                {
                    Require(actual.MetLocation == (traded ? Locations.TradedEggLocation(after.Generation, after.Version) : LocationEdits.GetNoneLocation(actual)), "Trade and none locations");
                    Require(actual.MetDate == (traded ? new DateOnly(2000,1,1) : null), "Met date convention");
                    Require(actual.EggMetDate == EncounterDate.GetDate(actual.Context.Console), "New egg date");
                }
                if (actual.Format >= 6 && actual is IMemoryOT memory) Require(memory.OriginalTrainerMemory == 0 && memory.OriginalTrainerMemoryFeeling == 0, "Egg memories cleared");
                Require(after.ChecksumsValid && actual.ChecksumValid && after.PartyCount == before.PartyCount && data.SequenceEqual(original), "Checksums and original");
                for (var b = 0; b < before.BoxCount; b++)
                    for (var slot = 0; slot < before.BoxSlotCount; slot++)
                        if (b != box || slot != 0) Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other box slots");
                Require(after.GetPartySlotAtIndex(1).Data.SequenceEqual(before.GetPartySlotAtIndex(1).Data), "Other party member");
                if (box == 0) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Party preserved");
            }
            if (p.Format >= 4)
            {
                var retained = p.Clone();
                retained.EggLocation = 123; retained.EggMetDate = new DateOnly(2005, 6, 7);
                PokemonEgg.Apply(fixture, retained, new("makeEgg"));
                Require(retained.EggLocation == 123 && retained.EggMetDate == new DateOnly(2005, 6, 7), "Existing egg record retained");
            }
            while (fixture.PartyCount > 1) fixture.DeletePartySlot(1);
            try { Apply(fixture.Write().ToArray(), -1); throw new Exception("Allowed all-egg party"); }
            catch (ArgumentException) { }
            Console.WriteLine($"PASS {version}/{traded}: make egg, naming, encounter, health, original and party guard");
        }
    }
}
