using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonLegalityTests
{
    public static void Run(Func<GameVersion, SaveFile> create)
    {
        foreach (var (file, expected) in new[] { ("legal-shedinja.pk3", true), ("illegal-shedinja.pk3", false) })
        {
            var save = create(GameVersion.E);
            var pokemon = new PK3(File.ReadAllBytes($"third_party/pkhex/legality-fixtures/{file}"));
            save.SetBoxSlotAtIndex(pokemon, 0, 0, EntityImportSettings.None);
            var input = save.Write().ToArray();
            var before = input.ToArray();
            var result = JsonSerializer.Deserialize(SaveService.AnalyzePokemon(input, "{\"box\":0,\"slot\":0}"), SaveJsonContext.Default.PokemonLegalityReport)!;
            if (!result.Parsed || result.Valid != expected) throw new Exception($"{file}: unexpected legality\n{result.Details.En}");
            if (!input.SequenceEqual(before)) throw new Exception("Legality analysis changed the input save.");
            var parsed = SaveUtil.GetSaveFile(input.ToArray())!;
            var reference = new LegalityAnalysis(parsed.GetBoxSlotAtIndex(0, 0), parsed.Personal, StorageSlotType.Box);
            if (result.Summary.Zh != reference.Report("zh-Hans") || result.Summary.En != reference.Report("en") || result.Summary.Ja != reference.Report("ja") ||
                result.Details.Zh != reference.Report("zh-Hans", true) || result.Details.En != reference.Report("en", true) || result.Details.Ja != reference.Report("ja", true))
                throw new Exception("Localized reports differ from upstream.");
            if (result.Summary.Zh == result.Summary.En || result.Summary.Ja == result.Summary.En)
                throw new Exception("Legality translations did not load.");
            Directory.CreateDirectory(".tmp/pkhex-fixtures");
            File.WriteAllBytes($".tmp/pkhex-fixtures/{file}.sav", input);
            Console.WriteLine($"PASS {file}: expected legality, three languages, full upstream report, input preservation");
            foreach (var position in new[] { "{\"box\":0,\"slot\":1}", "{\"box\":-1,\"slot\":6}", "{\"box\":-2,\"slot\":0}", "{\"box\":0,\"slot\":30}" })
            {
                try { SaveService.AnalyzePokemon(input, position); throw new Exception("Invalid legality position accepted."); }
                catch (ArgumentException) { }
            }
        }
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var bytes = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            foreach (var position in new[] { new PokemonPosition(-1, 0), new PokemonPosition(0, 0) })
            {
                var input = bytes.ToArray();
                var report = JsonSerializer.Deserialize(SaveService.AnalyzePokemon(input, JsonSerializer.Serialize(position, SaveJsonContext.Default.PokemonPosition)), SaveJsonContext.Default.PokemonLegalityReport)!;
                var save = SaveUtil.GetSaveFile(bytes.ToArray())!;
                var reference = new LegalityAnalysis(PokemonEditing.Read(save, position.Box, position.Slot), save.Personal, position.Box == -1 ? StorageSlotType.Party : StorageSlotType.Box);
                if (report.Parsed != reference.Parsed || report.Valid != (reference.Parsed && reference.Valid) || !bytes.SequenceEqual(input))
                    throw new Exception($"{version}: legality context or input mismatch");
            }
        }
        Console.WriteLine("PASS party/box legality context across 11 save formats and invalid-position rejection");
    }
}
