using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonRibbonSuggestionTests
{
    private static void Require(bool condition, string message) { if (!condition) throw new Exception(message); }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var fixture = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var pokemon = fixture.GetPartySlotAtIndex(0);
            pokemon.Stat_HPCurrent = Math.Max(1, pokemon.Stat_HPMax / 2);
            pokemon.Status_Condition = 8;
            var entries = PokemonRibbons.Read(pokemon).Entries;
            PokemonRibbons.Apply(pokemon, new(entries.Select(r => new RibbonValue(r.Key, r.Max)).ToArray()));
            pokemon.RefreshChecksum();
            fixture.SetPartySlotAtIndex(pokemon, 0, EntityImportSettings.None);
            fixture.SetBoxSlotAtIndex(pokemon, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray();
            var original = data.ToArray();
            var before = SaveUtil.GetSaveFile(data.ToArray())!;
            foreach (var box in new[] { -1, 0 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                var catalog = PokemonRibbons.Read(source, analyze: true);
                Require(catalog.AnalysisComplete, "Analysis completes for fixture");
                var analysis = new LegalityAnalysis(source);
                var results = new RibbonResult[RibbonVerifier.MaxRibbonCount];
                var args = new RibbonVerifierArguments(source, analysis.EncounterOriginal, analysis.Info.EvoChainsAllGens);
                var count = RibbonVerifier.GetRibbonResults(args, results);
                foreach (var result in results.Take(count))
                {
                    var entry = catalog.Entries.FirstOrDefault(e => e.Key == result.PropertyName);
                    if (entry is not null) Require(entry.Status == (result.IsMissing ? "missing" : "invalid"), "Status matches Core verifier");
                }
                Require(data.SequenceEqual(original), "Catalog analysis preserves original");
                foreach (var mode in new[] { "suggest", "minimal" })
                {
                    var expected = source.Clone();
                    RibbonApplicator.RemoveAllValidRibbons(expected);
                    if (mode == "suggest") RibbonApplicator.SetAllValidRibbons(expected);
                    else if (expected is IRibbonSetAffixed affixed) affixed.AffixedRibbon = AffixedRibbon.None;
                    expected.RefreshChecksum();
                    var request = new PokemonRawEdit(box, 0, "ribbons", Ribbons: new([], Mode: mode));
                    var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                    var after = SaveUtil.GetSaveFile(output.ToArray())!;
                    var actual = PokemonEditing.Read(after, box, 0);
                    Require(actual.Data.SequenceEqual(expected.Data), $"{version}/{box}/{mode}: full upstream suggestion payload including related fields");
                    Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "Health preserved");
                    Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original), "Checksums and original preserved");
                    for (var b = 0; b < before.BoxCount; b++)
                        for (var slot = 0; slot < before.BoxSlotCount; slot++)
                            if (b != box || slot != 0)
                                Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other boxes preserved");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Party preserved");
                }
                foreach (var invalid in new[] { new RibbonEdit([], Mode: "invalid"), new([], 0, "suggest"), new([new(entries[0].Key, 0)], Mode: "minimal") })
                {
                    var rejected = false;
                    try { PokemonRibbons.Apply(source.Clone(), invalid); } catch (ArgumentException) { rejected = true; }
                    Require(rejected, "Reject mixed or unknown modes");
                }
            }
            Console.WriteLine($"PASS {version}: ribbon hints, Core suggestions/minimization, related fields and data preservation");
        }
    }
}
