using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonMemoryTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Invalid memory edit accepted");
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
            p.RefreshChecksum();
            fixture.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            fixture.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray();
            var original = data.ToArray();
            var before = SaveUtil.GetSaveFile(data.ToArray())!;
            foreach (var box in new[] { -1, 0 })
                foreach (var handler in new[] { 0, 1 })
                {
                    var source = PokemonEditing.Read(before, box, 0);
                    var basic = PokemonMemories.Read(source, handler);
                    Require(basic.CanEdit, "Both named trainers editable");
                    var generation = handler == 0 ? source.Generation : source.Format;
                    var ids = basic.Memories.GroupBy(c => Memories.GetMemoryArgType((byte)c.Id, generation)).Select(g => g.First().Id).Append(0).Distinct();
                    foreach (var id in ids)
                    {
                        var catalog = PokemonMemories.Read(source, handler, id);
                        var upstream = new MemoryStrings(GameInfo.GetStrings("en"));
                        var type = Memories.GetMemoryArgType((byte)id, generation);
                        Require(catalog.Variables.Select(c => c.Id).Order().SequenceEqual(upstream.GetArgumentStrings(type, generation).Select(c => c.Value).Order()), "Core argument catalog");
                        var query = new MemoryQuery(box, 0, handler, id);
                        var json = SaveService.ReadMemory(data, JsonSerializer.Serialize(query, SaveJsonContext.Default.MemoryQuery));
                        Require(JsonSerializer.Deserialize(json, SaveJsonContext.Default.MemoryCatalog)!.Current.Memory == id && data.SequenceEqual(original), "Read-only catalog preview");
                        var variable = catalog.Variables.Length > 1 ? catalog.Variables[^1].Id : 0;
                        var intensity = id == 0 ? 0 : catalog.Intensities[^1].Id;
                        var feeling = id == 0 ? 0 : catalog.Feelings[^1].Id;
                        var edit = new MemoryEdit(handler, id, variable, intensity, feeling);
                        var request = new PokemonRawEdit(box, 0, "memory", Memory: edit);
                        var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                        var after = SaveUtil.GetSaveFile(output.ToArray())!;
                        var actual = PokemonEditing.Read(after, box, 0);
                        var expected = source.Clone();
                        var memory = (ITrainerMemories)expected;
                        if (handler == 0)
                        {
                            memory.OriginalTrainerMemory = (byte)id;
                            memory.OriginalTrainerMemoryVariable = (ushort)variable;
                            memory.OriginalTrainerMemoryIntensity = (byte)intensity;
                            memory.OriginalTrainerMemoryFeeling = (byte)feeling;
                        }
                        else
                        {
                            memory.HandlingTrainerMemory = (byte)id;
                            memory.HandlingTrainerMemoryVariable = (ushort)variable;
                            memory.HandlingTrainerMemoryIntensity = (byte)intensity;
                            memory.HandlingTrainerMemoryFeeling = (byte)feeling;
                        }
                        expected.RefreshChecksum();
                        Require(actual.Data.SequenceEqual(expected.Data), $"{version}/{box}/{handler}/{id}: exact memory-only payload");
                        Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "Health preserved");
                        Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original), "Original and checksums");
                        for (var b = 0; b < before.BoxCount; b++)
                            for (var slot = 0; slot < before.BoxSlotCount; slot++)
                                if (b != box || slot != 0) Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other slots unchanged");
                        if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Other party unchanged");
                    }
                    foreach (var invalid in new[] { new MemoryEdit(2, 0, 0, 0, 0), new(handler, 999, 0, 0, 0), new(handler, 4, 65536, 1, 0), new(handler, 4, 0, 256, 0), new(handler, 4, 0, 1, 256), new(handler, 4, -1, 1, 0) })
                        Reject(() => PokemonMemories.Apply(source.Clone(), invalid));
                    var clear = source.Clone();
                    PokemonMemories.Apply(clear, new(handler, 0, 100, 100, 100));
                    var cleared = MemoryVariableSet.Read((ITrainerMemories)clear, handler);
                    Require(cleared.MemoryID == 0 && cleared.Variable == 0 && cleared.Intensity == 0 && cleared.Feeling == 0, "No memory clears hidden parameters");
                }
            Console.WriteLine($"PASS {version}: both trainer memories, argument categories, boundaries and full payload preservation");
        }
        Reject(() => PokemonMemories.Read(new PK3(), 0));
        var transferred = new PK6 { Species = 25, Version = GameVersion.E };
        Require(!PokemonMemories.Read(transferred, 0).CanEdit, "Old origin original memory is disabled");
        var untraded = new PK6 { Species = 25, Version = GameVersion.X };
        Require(!PokemonMemories.Read(untraded, 1).CanEdit, "Unnamed handler memory is disabled");
        Reject(() => PokemonMemories.Apply(untraded, new(1, 0, 0, 0, 0)));
    }
}
