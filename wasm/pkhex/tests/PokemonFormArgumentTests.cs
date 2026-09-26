using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonFormArgumentTests
{
    private static SaveFile Open(byte[] bytes) => SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); }
        catch (ArgumentException) { return; }
        throw new Exception("Invalid form argument accepted");
    }
    public static void Run()
    {
        foreach (var version in new[] { "X", "OR", "SN", "US" })
        foreach (ushort species in new ushort[] { 676, 720 })
        {
            if (version == "X" && species == 720) continue;
            var save = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            var p = save.GetBoxSlotAtIndex(0, 0);
            p.Species = species;
            p.Form = 1;
            p.RefreshAbility(0);
            p.RefreshChecksum();
            save.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            save.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            var data = save.Write().ToArray();
            var original = data.ToArray();
            var before = Open(data);
            foreach (var box in new[] { -1, 0 })
            {
                var startingSave = Open(data);
                var starting = PokemonEditing.Read(startingSave, box, 0);
                var startingArgument = (IFormArgument)starting;
                startingArgument.FormArgumentMaximum = 7;
                startingArgument.FormArgumentElapsed = 3;
                startingArgument.FormArgumentRemain = 2;
                starting.RefreshChecksum();
                if (box == -1) startingSave.SetPartySlotAtIndex(starting, 0, EntityImportSettings.None);
                else startingSave.SetBoxSlotAtIndex(starting, 0, 0, EntityImportSettings.None);
                var identityInput = startingSave.Write().ToArray();
                var inputCopy = identityInput.ToArray();
                var clear = new PokemonEdit(box, 0, "FORMTEST", 25, 100, "TEST", 42, 43,
                    [0,0,0,0,0,0], [0,0,0,0,0,0], [85,0,0,0], [10,0,0,0],
                    Identity: new(25, 0, 0, false));
                var cleared = Open(SaveService.EditPokemon(identityInput, JsonSerializer.Serialize(clear, SaveJsonContext.Default.PokemonEdit)));
                Require(((IFormArgument)PokemonEditing.Read(cleared, box, 0)).FormArgument == 0, "Changing to ordinary species clears argument");
                Require(identityInput.SequenceEqual(inputCopy), "Identity normalization preserves original");
                if (species == 676)
                {
                    var retain = clear with { Identity = new(676, 2, 0, false) };
                    var retained = Open(SaveService.EditPokemon(identityInput, JsonSerializer.Serialize(retain, SaveJsonContext.Default.PokemonEdit)));
                    var retainedArgument = (IFormArgument)PokemonEditing.Read(retained, box, 0);
                    Require(retainedArgument.FormArgumentMaximum == (p.Format == 6 && box == -1 ? 3 : 7), "Compatible timer retains stored streak");
                }
            }
            foreach (var box in new[] { -1, 0 })
            {
                var info = PokemonFormArgument.Read(PokemonEditing.Read(before, box, 0), box)!;
                Require(info.Mode == (p.Format == 6 ? "TripleParty" : "Triple"), "Counter mode");
                var edit = new FormArgumentEdit(Remain: info.CanRemain ? (byte)255 : null,
                    Elapsed: info.CanElapsed ? (byte)255 : null, Maximum: info.CanMaximum ? (byte)255 : null);
                if (!info.CanRemain && !info.CanElapsed && !info.CanMaximum)
                {
                    Reject(() => PokemonFormArgument.Apply(p, box, new(Remain: 1)));
                    continue;
                }
                var request = new PokemonRawEdit(box, 0, "formArgument", FormArgument: edit);
                var bytes = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                var after = Open(bytes);
                var actual = (IFormArgument)PokemonEditing.Read(after, box, 0);
                Require(after.ChecksumsValid && data.SequenceEqual(original), "Checksums and original");
                if (info.CanRemain) Require(actual.FormArgumentRemain == 255, "Remain byte persisted");
                if (info.CanElapsed) Require(actual.FormArgumentElapsed == 255, "Elapsed byte persisted");
                if (info.CanMaximum || (p.Format == 6 && species == 676 && box == -1)) Require(actual.FormArgumentMaximum == 255, "Maximum persisted");
                if (p.Format == 6 && box >= 0)
                {
                    Require(actual.FormArgumentRemain == 0 && actual.FormArgumentElapsed == 0, "No box party counters");
                    Reject(() => PokemonFormArgument.Apply(PokemonEditing.Read(before, box, 0), box, new(Remain: 1)));
                }
                Require(after.GetBoxSlotAtIndex(save.BoxCount - 1, save.BoxSlotCount - 1).Data.SequenceEqual(before.GetBoxSlotAtIndex(save.BoxCount - 1, save.BoxSlotCount - 1).Data), "Other box preserved");
                Require(after.GetPartySlotAtIndex(0).Stat_HPCurrent == before.GetPartySlotAtIndex(0).Stat_HPCurrent && after.GetPartySlotAtIndex(0).Status_Condition == before.GetPartySlotAtIndex(0).Status_Condition, "HP/status preserved");
            }
            Console.WriteLine($"PASS {version}/{species}: form counters and party/box persistence");
        }
        // PK8 parameter semantics only: this is not a serialized SWSH save acceptance fixture.
        var alcremie = new PK8 { Species = 869 };
        var named = PokemonFormArgument.Read(alcremie, 0)!;
        Require(named.Mode == "Named" && named.Max == 6 && named.Choices.Length == 7, "Alcremie range");
        Require(named.Choices[1].Zh == "野莓糖饰" && named.Choices[2].En == "Love Sweet", "Decoration ordering and translation");
        foreach (uint value in new uint[] { 0, 6 }) { PokemonFormArgument.Apply(alcremie, 0, new(value)); Require(alcremie.FormArgument == value, "Decoration"); }
        Reject(() => PokemonFormArgument.Apply(alcremie, 0, new(7)));
        var yamask = new PK8 { Species = 562, Form = 1 };
        Require(PokemonFormArgument.Read(yamask, 0)!.Max == 9999, "Raw maximum");
        foreach (uint value in new uint[] { 0, 9999 }) { PokemonFormArgument.Apply(yamask, 0, new(value)); Require(yamask.FormArgument == value, "Raw counter"); }
        Reject(() => PokemonFormArgument.Apply(yamask, 0, new(10000)));
        Reject(() => PokemonFormArgument.Apply(new PK6 { Species = 25 }, 0, new(1)));
        var transition = new PK8 { Species = 869, FormArgument = 9000 };
        PokemonFormArgument.NormalizeIdentityChange(transition, 562, 1, 0);
        Require(transition.FormArgument == 6, "Raw to named clamps to enum range");
        transition.Species = 562;
        transition.Form = 1;
        transition.FormArgument = uint.MaxValue;
        PokemonFormArgument.NormalizeIdentityChange(transition, 25, 0, 0);
        Require(transition.FormArgument == 0, "Unused old argument is cleared before loading raw mode");
        transition.FormArgument = 123;
        PokemonFormArgument.NormalizeIdentityChange(transition, 562, 1, 0);
        Require(transition.FormArgument == 123, "Unchanged identity does not normalize unrelated data");
        Console.WriteLine("PASS PK8 form parameter bounds and named translations (entity-level only)");
    }
}
