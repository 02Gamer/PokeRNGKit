using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonEggTests
{
    private static SaveFile Open(byte[] bytes) => SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Invalid egg operation accepted");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var fixture = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            var egg = fixture.GetPartySlotAtIndex(0);
            egg.IsEgg = true;
            egg.OriginalTrainerFriendship = 17;
            if (egg.Format >= 6) { egg.CurrentHandler = 1; egg.HandlingTrainerFriendship = 77; }
            egg.Stat_HPCurrent = Math.Max(1, egg.Stat_HPMax / 2);
            egg.Status_Condition = 8;
            egg.RefreshChecksum();
            fixture.SetPartySlotAtIndex(egg, 0, EntityImportSettings.None);
            fixture.SetBoxSlotAtIndex(egg, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray();
            var original = data.ToArray();
            var before = Open(data);
            foreach (var box in new[] { -1, 0 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                Require(PokemonReader.Read(before).First(p => p.Box == box && p.Slot == 0).Friendship == 17, "Egg counter uses OT byte even with another handler");
                foreach (var edit in new[] { new EggEdit("cycles", 0), new("cycles", 255), new("hatch") })
                {
                    var expected = source.Clone();
                    if (edit.Action == "hatch") expected.ForceHatchPKM(before);
                    else expected.OriginalTrainerFriendship = (byte)edit.Cycles!.Value;
                    expected.RefreshChecksum();
                    var request = new PokemonRawEdit(box, 0, "egg", Egg: edit);
                    var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                    var after = Open(output);
                    var actual = PokemonEditing.Read(after, box, 0);
                    if (edit.Action == "hatch" && source.Gen6 && actual is IMemoryOT actualMemory && expected is IMemoryOT expectedMemory)
                    {
                        Require(MemoryContext6.CanHaveFeeling6(2, actualMemory.OriginalTrainerMemoryFeeling, actualMemory.OriginalTrainerMemoryVariable), "Core-generated hatch memory feeling is allowed");
                        expectedMemory.OriginalTrainerMemoryFeeling = actualMemory.OriginalTrainerMemoryFeeling;
                        expected.RefreshChecksum();
                    }
                    Require(actual.Data.SequenceEqual(expected.Data), $"{version}/{box}/{edit.Action}: Exact upstream egg edit payload; lengths {actual.Data.Length}/{expected.Data.Length}; offsets {string.Join(",", Enumerable.Range(0, Math.Min(actual.Data.Length, expected.Data.Length)).Where(i => actual.Data[i] != expected.Data[i]).Select(i => $"{i:X}:{actual.Data[i]:X2}/{expected.Data[i]:X2}"))}");
                    Require(actual.IsEgg == (edit.Action != "hatch"), "Egg flag and hatch");
                    Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "No healing");
                    Require(actual.HandlingTrainerFriendship == source.HandlingTrainerFriendship, "Handler friendship preserved");
                    Require(after.ChecksumsValid && actual.ChecksumValid && after.PartyCount == before.PartyCount && data.SequenceEqual(original), "Original and checksums");
                    for (var b = 0; b < before.BoxCount; b++)
                        for (var slot = 0; slot < before.BoxSlotCount; slot++)
                            if (b != box || slot != 0)
                                Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other box slots");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Unselected party");
                }
                if (box == 0 && source.Format >= 6)
                {
                    var basic = new PokemonEdit(box, 0, source.Nickname, source.CurrentLevel, 33, source.OriginalTrainerName, source.TID16, source.SID16,
                        [source.IV_HP, source.IV_ATK, source.IV_DEF, source.IV_SPA, source.IV_SPD, source.IV_SPE],
                        [source.EV_HP, source.EV_ATK, source.EV_DEF, source.EV_SPA, source.EV_SPD, source.EV_SPE],
                        source.Moves, [source.Move1_PP, source.Move2_PP, source.Move3_PP, source.Move4_PP]);
                    var edited = Open(SaveService.EditPokemon(data, JsonSerializer.Serialize(basic, SaveJsonContext.Default.PokemonEdit))).GetBoxSlotAtIndex(0, 0);
                    Require(edited.OriginalTrainerFriendship == 33 && edited.HandlingTrainerFriendship == 77, "Basic editor also writes egg counter, not handler friendship");
                }
                foreach (var invalid in new[] { new EggEdit("cycles"), new("cycles", -1), new("cycles", 256), new("hatch", 1), new("invalid") })
                    Reject(() => PokemonEgg.Apply(before, source.Clone(), invalid));
                source.IsEgg = false;
                Reject(() => PokemonEgg.Apply(before, source, new("hatch")));
                Reject(() => PokemonEgg.Apply(before, source, new("cycles", 1)));
                Require(PokemonEgg.Read(source) is null, "Hide egg fields after hatch");
            }
            Console.WriteLine($"PASS {version}: hatch counter and core hatching payload, health and original preservation");
        }
    }
}
