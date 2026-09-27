// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class TrainerGameVersionTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static TrainerEdit Original(SaveFile s) => new(s.OT, s.TID16, s.SID16, s.Money);
    private static byte[] Export(byte[] data, TrainerEdit edit) => SaveService.Export(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.TrainerEdit));
    public static void Run()
    {
        foreach (var fixture in new[] { "SN", "US", "BD" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"))!;
            save.OT = "A";
            var data = save.Write().ToArray(); var original = data.ToArray(); var basis = Original(save);
            var choices = TrainerGameVersion.Read(save).Choices;
            var expectedChoices = fixture == "BD" ? new[] { GameVersion.BD, GameVersion.SP } : new[] { GameVersion.SN, GameVersion.MN, GameVersion.US, GameVersion.UM };
            Require(choices.Select(c => c.Id).SequenceEqual(expectedChoices.Select(v => (int)v)), "Upstream version choices");
            Require(choices.All(c => !string.IsNullOrWhiteSpace(c.Name.Zh) && !string.IsNullOrWhiteSpace(c.Name.En) && !string.IsNullOrWhiteSpace(c.Name.Ja)), "Three-language catalog");
            foreach (var choice in choices)
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!; expected.Version = (GameVersion)choice.Id;
                var output = Export(data, basis with { GameVersion = choice.Id });
                Require(output.SequenceEqual(expected.Write().ToArray()), "Entire output matches independent Core version setter");
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(after.GetType() == save.GetType() && after.ChecksumsValid && (int)after.Version == choice.Id, "Marker round trip preserves format");
                Require(Enumerable.Range(0, save.BoxCount).All(box => after.GetBoxBinary(box).SequenceEqual(save.GetBoxBinary(box))), "Box Pokemon origins and bytes preserved");
                using var report = JsonDocument.Parse(SaveService.Inspect(output));
                Require(report.RootElement.GetProperty("trainer").GetProperty("gameVersion").GetProperty("value").GetInt32() == choice.Id, "Report reflects applied marker");
                Require(Export(output, Original(after) with { GameVersion = choice.Id }).SequenceEqual(output), "Same marker is no-op");
            }
            Require(data.SequenceEqual(original), "Original input preserved");
            Console.WriteLine($"PASS {fixture}: all trainer version choices, complete export, format and Pokemon preservation, localized report");
        }
        var sw = new SAV8SWSH();
        sw.Version = GameVersion.SW;
        Require(TrainerGameVersion.Read(sw).Choices.Select(c => c.Id).SequenceEqual(new[] { (int)GameVersion.SW, (int)GameVersion.SH }), "Sword Shield catalog");
        foreach (var v in new[] { GameVersion.SH, GameVersion.SW })
        {
            var expected = sw.MyStatus.Data.ToArray(); expected[0xA4] = (byte)v;
            TrainerGameVersion.Apply(sw, (int)v);
            Require(sw.MyStatus.Data.SequenceEqual(expected), "Sword Shield changes only status game byte");
        }
        foreach (var fixture in new[] { "E", "D", "B", "X", "OR", "SN", "US", "BD" })
        {
            var save = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"))!;
            var before = save.Write().ToArray();
            foreach (var invalid in new[] { -1, 0, 255, int.MaxValue, (int)GameVersion.SW })
            {
                try { TrainerGameVersion.Apply(save, invalid); throw new Exception("Invalid version accepted"); }
                catch (ArgumentException) { Require(save.Write().ToArray().SequenceEqual(before), "Invalid version leaves bytes intact"); }
            }
            if (save.Generation < 7) Require(TrainerGameVersion.Read(save).Choices.Length == 0, "Gen6 disabled and unsupported formats have no choices");
        }
        // Unknown stored byte is retained on unrelated edits and can be explicitly repaired.
        var unusual = (SAV7SM)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/SN.sav"))!;
        unusual.Version = (GameVersion)255;
        TrainerGameVersion.Apply(unusual, 255);
        Require((int)unusual.Version == 255, "Unknown same marker retained");
        TrainerGameVersion.Apply(unusual, (int)GameVersion.MN);
        Require(unusual.Version == GameVersion.MN, "Unknown marker explicitly repaired");
        Console.WriteLine("PASS trainer version validation and Sword Shield Core status bytes (no real SWSH fixture)");
    }
}
