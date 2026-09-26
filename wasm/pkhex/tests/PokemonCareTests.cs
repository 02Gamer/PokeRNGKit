using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonCareTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid care edit accepted"); }
    private static void Set(PKM p, string key, byte value)
    {
        switch (key)
        {
            case "originalFriendship": p.OriginalTrainerFriendship = value; break;
            case "handlingFriendship": p.HandlingTrainerFriendship = value; break;
            case "originalAffection": ((IAffection)p).OriginalTrainerAffection = value; break;
            case "handlingAffection": ((IAffection)p).HandlingTrainerAffection = value; break;
            case "fullness": ((IFullnessEnjoyment)p).Fullness = value; break;
            case "enjoyment": ((IFullnessEnjoyment)p).Enjoyment = value; break;
            case "sociability": ((G8PKM)p).Sociability = value; break;
        }
    }
    public static void Run()
    {
        foreach (var version in new[] { "X", "OR", "SN", "US", "BD" })
        {
            var fixture = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var p = fixture.GetPartySlotAtIndex(0);
            p.HandlingTrainerName = "OTHER";
            p.Stat_HPCurrent = Math.Max(1, p.Stat_HPMax / 2);
            p.Status_Condition = 8;
            if (p is ISociability s) s.Sociability = uint.MaxValue;
            p.RefreshChecksum();
            fixture.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            fixture.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray(); var original = data.ToArray();
            var before = SaveUtil.GetSaveFile(data.ToArray())!;
            foreach (var box in new[] { -1, 0 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                foreach (var field in PokemonCare.Read(source).Where(f => f.CanEdit))
                    foreach (byte value in new byte[] { 0, 255 })
                    {
                        var request = new PokemonRawEdit(box, 0, "care", Care: new([new(field.Key, value)]));
                        var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                        var after = SaveUtil.GetSaveFile(output.ToArray())!;
                        var actual = PokemonEditing.Read(after, box, 0);
                        var expected = source.Clone(); Set(expected, field.Key, value); expected.RefreshChecksum();
                        Require(actual.Data.SequenceEqual(expected.Data), $"{version}/{box}/{field.Key}: full payload");
                        Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "Health preserved");
                        Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original), "Original and checksums");
                        for (var b = 0; b < before.BoxCount; b++) for (var slot = 0; slot < before.BoxSlotCount; slot++)
                            if (b != box || slot != 0) Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other slots");
                        if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Other party");
                    }
                var catalog = JsonSerializer.Deserialize(SaveService.ReadMemory(data, JsonSerializer.Serialize(new MemoryQuery(box, 0, 0), SaveJsonContext.Default.MemoryQuery)), SaveJsonContext.Default.MemoryCatalog)!;
                Require(catalog.Care.SequenceEqual(PokemonCare.Read(source)), "Care fields in read-only catalog");
            }
            Console.WriteLine($"PASS {version}: care fields, boundaries, full payload and health preservation");
        }
        foreach (var p in new PKM[] { new PK6(), new PK7(), new PK8(), new PB8() })
        {
            p.Species = 25; p.Version = GameVersion.X;
            Require(PokemonCare.Read(p).Any(f => f.Key == "originalAffection") == (p is IAffection), "Affection capability");
            Require(!PokemonCare.Read(p).Single(f => f.Key == "handlingFriendship").CanEdit, "Untraded handling disabled");
            Reject(() => PokemonCare.Apply(p, new([new("handlingFriendship", 100)])));
            p.HandlingTrainerName = "OTHER";
            foreach (var f in PokemonCare.Read(p).Where(f => f.CanEdit))
            {
                Reject(() => PokemonCare.Apply(p, new([new(f.Key, -1)])));
                Reject(() => PokemonCare.Apply(p, new([new(f.Key, 256)])));
                Reject(() => PokemonCare.Apply(p, new([new(f.Key, 1), new(f.Key, 2)])));
            }
            Reject(() => PokemonCare.Apply(p, new([new("unknown", 0)])));
            Reject(() => PokemonCare.Apply(p, new([])));
            if (p is not IAffection) Reject(() => PokemonCare.Apply(p, new([new("originalAffection", 0)])));
            p.IsEgg = true; p.HandlingTrainerName = "";
            PokemonCare.Apply(p, new([new("originalFriendship", 37)]));
            Require(p.OriginalTrainerFriendship == 37 && p.IsEgg, "Egg cycles preserve egg state");
        }
        Reject(() => PokemonCare.Read(new PK3()));
        var eight = new PK8 { Sociability = uint.MaxValue };
        PokemonCare.Apply(eight, new([new("originalFriendship", 17)]));
        Require(eight.Sociability == uint.MaxValue, "Untouched oversized sociability preserved");
        PokemonCare.Apply(eight, new([new("sociability", 255)]));
        Require(eight.Sociability == 255, "Sociability desktop write range");
    }
}
