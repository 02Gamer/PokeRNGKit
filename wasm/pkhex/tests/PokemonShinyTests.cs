using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonShinyTests
{
    private static SaveFile Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray())!;
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var fixture = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            var p = fixture.GetPartySlotAtIndex(0);
            p.SetShinySID(Shiny.AlwaysSquare);
            p.Stat_HPCurrent = 1; p.Status_Condition = 8; p.RefreshChecksum();
            fixture.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            fixture.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray(); var original = data.ToArray();
            foreach (var box in new[] { -1, 0 })
            foreach (var method in new[] { "pid", "sid" })
            foreach (var type in new[] { "any", "star", "square", "off" })
            {
                var caseSave = Open(data);
                var starting = PokemonEditing.Read(caseSave, box, 0);
                if (type == "off") starting.SetShinySID(Shiny.AlwaysSquare);
                else starting.SetUnshiny();
                starting.RefreshChecksum();
                if (box == -1) caseSave.SetPartySlotAtIndex(starting, 0, EntityImportSettings.None);
                else caseSave.SetBoxSlotAtIndex(starting, 0, 0, EntityImportSettings.None);
                var input = caseSave.Write().ToArray(); var inputCopy = input.ToArray();
                var before = Open(input);
                var source = PokemonEditing.Read(before, box, 0);
                Require(source.IsShiny == (type == "off"), "Opposite initial shiny state");
                var request = new PokemonRawEdit(box, 0, "shiny", Shiny: new(method, type));
                var after = Open(SaveService.EditPokemonRaw(input, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit)));
                var actual = PokemonEditing.Read(after, box, 0);
                Require(actual.IsShiny == (type != "off"), "Shiny state");
                if (type == "star") Require(actual.ShinyXor == 1, "Exact star XOR");
                if (type == "square") Require(actual.ShinyXor == 0, "Exact square XOR");
                Require(actual.TID16 == source.TID16 && actual.Nature == source.Nature && actual.Gender == source.Gender && actual.Form == source.Form, "Preserved identity fields");
                if (method == "sid") Require(actual.PID == source.PID && actual.EncryptionConstant == source.EncryptionConstant, "SID method preserves PID and EC");
                else Require(actual.SID16 == source.SID16, "PID method preserves IDs");
                Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "Health preserved");
                Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original) && input.SequenceEqual(inputCopy) && after.PartyCount == before.PartyCount, "Checksums and original");
                for (var b = 0; b < before.BoxCount; b++)
                    for (var slot = 0; slot < before.BoxSlotCount; slot++)
                        if (b != box || slot != 0) Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other box slots");
                if (box == 0) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Unselected party");
            }
            Console.WriteLine($"PASS {version}: shiny PID/SID modes, exact XOR, remove shiny and data preservation");
        }
        int found = 0, rejected = 0;
        for (byte form = 0; form < 28; form++)
        {
            var p = new PK3 { Species = 201, Version = GameVersion.E, TID16 = 1, SID16 = 2 };
            p.PID = EntityPID.GetRandomPID(new Random(form), 201, 2, GameVersion.FR, Nature.Hardy, form, 0);
            var original = p.Data.ToArray();
            try
            {
                PokemonShiny.Apply(p, new("pid", "square")); found++;
                Require(p.Form == form && p.Nature == Nature.Hardy && p.ShinyXor == 0 && p.Version == GameVersion.E, "Unown constraints");
                PokemonShiny.Apply(p, new("pid", "off"));
                Require(!p.IsShiny && p.Form == form && p.Nature == Nature.Hardy && p.Version == GameVersion.E, "Unown remove shiny constraints");
            }
            catch (ArgumentException e) when (e.Message.Contains("no solution"))
            { rejected++; Require(p.Data.SequenceEqual(original), "No-solution input preserved"); }
        }
        Require(found > 0 && rejected > 0, "Unown solvable and impossible forms covered");
        var transferred = new PK6 { Species = 25, Version = GameVersion.E, Nature = Nature.Hardy, Gender = 0, PID = 123, EncryptionConstant = 456 };
        PokemonShiny.Apply(transferred, new("pid", "square"));
        Require(transferred.IsShiny && transferred.PID == transferred.EncryptionConstant, "Legacy origin synchronizes EC");
        transferred.EncryptionConstant = transferred.PID ^ 1;
        PokemonShiny.Apply(transferred, new("pid", "square"));
        Require(transferred.EncryptionConstant == transferred.PID, "Already shiny PID route also synchronizes legacy EC");
        Console.WriteLine($"PASS Unown exhaustive form cases: {found} solved, {rejected} safely rejected; legacy EC checked");
    }
}
