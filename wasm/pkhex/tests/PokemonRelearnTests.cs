using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonRelearnTests
{
    private static void Require(bool condition, string message) { if (!condition) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Invalid relearn edit accepted");
    }
    public static void Run()
    {
        foreach (var version in new[] { "X", "OR", "SN", "US", "BD" })
        {
            var fixture = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var p = fixture.GetPartySlotAtIndex(0);
            p.Move1_PP = 3;
            p.Move1_PPUps = 2;
            p.Stat_HPCurrent = Math.Max(1, p.Stat_HPMax / 2);
            p.Status_Condition = 8;
            p.RefreshChecksum();
            fixture.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            fixture.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None);
            var data = fixture.Write().ToArray();
            var original = data.ToArray();
            var before = SaveUtil.GetSaveFile(data.ToArray())!;
            foreach (var box in new[] { -1, 0 })
            {
                var source = PokemonEditing.Read(before, box, 0);
                Require(PokemonReader.Read(before).First(p => p.Box == box && p.Slot == 0).RelearnMoves!.SequenceEqual(source.RelearnMoves), "Reader exposes relearn slots");
                foreach (int[] moves in new int[][] { [85, 0, 85, source.MaxMoveID], [0, 0, 0, 0], [1, 2, 3, 4] })
                {
                    var request = new PokemonRawEdit(box, 0, "relearn", Relearn: new(moves));
                    var output = SaveService.EditPokemonRaw(data, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonRawEdit));
                    var after = SaveUtil.GetSaveFile(output.ToArray())!;
                    var actual = PokemonEditing.Read(after, box, 0);
                    var expected = source.Clone();
                    expected.SetRelearnMoves(moves.Select(m => (ushort)m).ToArray());
                    expected.RefreshChecksum();
                    Require(actual.Data.SequenceEqual(expected.Data), $"{version}/{box}: exact relearn-only payload");
                    Require(actual.Moves.SequenceEqual(source.Moves) && actual.Move1_PP == 3 && actual.Move1_PPUps == 2, "Current moves and PP unchanged");
                    Require(actual.Stat_HPCurrent == source.Stat_HPCurrent && actual.Status_Condition == source.Status_Condition, "Health unchanged");
                    Require(after.ChecksumsValid && actual.ChecksumValid && data.SequenceEqual(original), "Checksums and original data");
                    for (var b = 0; b < before.BoxCount; b++)
                        for (var slot = 0; slot < before.BoxSlotCount; slot++)
                            if (b != box || slot != 0)
                                Require(after.GetBoxSlotAtIndex(b, slot).Data.SequenceEqual(before.GetBoxSlotAtIndex(b, slot).Data), "Other boxes unchanged");
                    if (box != -1) Require(after.GetPartySlotAtIndex(0).Data.SequenceEqual(before.GetPartySlotAtIndex(0).Data), "Party unchanged");
                }
                var analysis = new LegalityAnalysis(source, before.Personal, box == -1 ? StorageSlotType.Party : StorageSlotType.Box);
                Require(analysis.Parsed, "Fixture analysis completes");
                ushort[] suggested = new ushort[4];
                analysis.GetSuggestedRelearnMoves(suggested);
                var result = SaveService.SuggestRelearn(data, JsonSerializer.Serialize(new PokemonPosition(box, 0), SaveJsonContext.Default.PokemonPosition));
                Require(JsonSerializer.Deserialize(result, SaveJsonContext.Default.UInt16Array)!.SequenceEqual(suggested), "Suggestions match Core");
                Require(data.SequenceEqual(original), "Suggestion is read-only");
                foreach (var invalid in new int[][] { [], [1, 2, 3], [1, 2, 3, 4, 5], [-1, 0, 0, 0], [source.MaxMoveID + 1, 0, 0, 0], null! })
                    Reject(() => PokemonRelearn.Apply(source.Clone(), new(invalid)));
            }
            Console.WriteLine($"PASS {version}: relearn slots, read-only Core suggestions, boundaries and payload preservation");
        }
        foreach (var p in new PKM[] { new PK3(), new PK4(), new PK5(), new CK3(), new XK3() })
        {
            Require(PokemonRelearn.Read(p) is null, "No dummy fields in unsupported formats");
            Reject(() => PokemonRelearn.Apply(p, new([0, 0, 0, 0])));
        }
        foreach (var p in new PKM[] { new PB7(), new PK8(), new PA8(), new PK9(), new PA9() })
        {
            PokemonRelearn.Apply(p, new([85, 0, 85, p.MaxMoveID]));
            Require(p.RelearnMoves.SequenceEqual(new ushort[] { 85, 0, 85, (ushort)p.MaxMoveID }), "Other supported entities store actual fields");
        }
    }
}
