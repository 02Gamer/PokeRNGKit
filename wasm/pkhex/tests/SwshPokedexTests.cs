// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class SwshPokedexTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SAV8SWSH Open(byte[] bytes) => new(bytes.ToArray());
    public static void Run()
    {
        foreach (var version in new[] { GameVersion.SW, GameVersion.SH })
        for (int revision = 0; revision < 3; revision++)
        {
            var input = SwshBlockFixtureTests.Create(version, revision); var original = input.ToArray();
            var seed = Open(input); var catalog = SwshPokedex.Read(seed);
            Check(catalog.Entries.Length == new[] { 400, 611, 821 }[revision], "SWSH complete physical catalog");
            Check(catalog.Entries.All(e => e.FormChoices.Length == 64 && e.Name.Zh.Length > 0 && e.Name.En.Length > 0 && e.Name.Ja.Length > 0), "SWSH localized entries and 64 raw form bits");
            Check(catalog.Entries.Count(e => e.Primary) == seed.Zukan.DexLookup.Count, "SWSH primary-entry mapping");
            foreach (var e in catalog.Entries.Where(e => e.Number is 1 or 2 || e.Species is 25 or 869 or 892 || e.State.Index == catalog.Entries[^1].State.Index))
            {
                var save = Open(input); SwshPokedex.Apply(save, new("entry", e.State));
                Check(save.Write().Span.SequenceEqual(input), "SWSH manual no-op preserves complete encrypted bytes");
                var state = e.State with { Seen = Enumerable.Range(0, 4).Select(r => Enumerable.Range(0, 64).Select(f => (r + f) % 3 == 0).ToArray()).ToArray(), Languages = Enumerable.Range(0, 9).Select(i => i % 2 == 0).ToArray(), Caught = true, Gigantamaxed = true, Form = 100, Gender = 2, DisplayGigantamax = true, DisplayShiny = true, Battled = int.MaxValue, Gigantamaxed1 = e.Species == 892 ? true : null };
                var expected = Open(input); var dex = expected.Zukan; var index = new Zukan8Index((Zukan8Type)e.Region, (ushort)e.Number);
                for (int r = 0; r < 4; r++) for (byte f = 0; f < 64; f++) dex.SetSeenRegion(index, f, r, state.Seen[r][f]);
                for (int l = 0; l < 9; l++) dex.SetIsLanguageIndexObtained(index, l, state.Languages[l]);
                dex.SetCaught(index); dex.SetCaughtGigantamax(index); dex.SetFormDisplayed(index, 100); dex.SetGenderDisplayed(index, 2); dex.SetDisplayDynamaxInstead(index); dex.SetDisplayShiny(index); dex.SetBattledCount(index, int.MaxValue);
                if (e.Species == 892) dex.SetCaughtGigantamax1(index);
                var snapshot = SwshPokedex.Apply(save, new("entry", state)); var output = save.Write().ToArray();
                Check(output.SequenceEqual(expected.Write().ToArray()) && SwishCrypto.GetIsHashValid(output) && SwshPokedex.Snapshot(Open(output)) == snapshot, "SWSH all manual fields, complete export and reopened snapshot");
                dex.SetFormDisplayed(index, 8191); dex.SetGenderDisplayed(index, 3); dex.SetBattledCount(index, uint.MaxValue);
                var unusual = expected.Write().ToArray(); var raw = SwshPokedex.State(expected, new((ushort)e.Species, index));
                SwshPokedex.Apply(expected, new("entry", raw));
                Check(expected.Write().Span.SequenceEqual(unusual), "SWSH unchanged out-of-picker raw fields preserved");
                foreach (var invalid in new[] { state with { Index = 0 }, state with { Seen = [new bool[63], new bool[64], new bool[64], new bool[64]] }, state with { Languages = [] }, state with { Form = 101 }, state with { Gender = 3 }, state with { Battled = 2147483648 }, state with { Gigantamaxed1 = e.Species == 892 ? null : true } })
                    Reject(input, new("entry", invalid));
            }
            foreach (string action in new[] { "clear", "seen", "caught", "uncaught", "complete", "give", "counts" })
            foreach (bool shiny in new[] { false, true })
            {
                if (shiny && action is not ("seen" or "caught" or "complete" or "give")) continue;
                var save = Open(input); var selectedEntry = catalog.Entries.LastOrDefault(e => !e.Primary) ?? catalog.Entries.Last(); int selected = selectedEntry.State.Index;
                var snapshot = SwshPokedex.Apply(save, new(action, Index: action == "give" ? selected : 0, Shiny: shiny, Battled: action == "counts" ? 500u : null));
                var output = save.Write().ToArray(); var after = Open(output);
                Check(SwishCrypto.GetIsHashValid(output) && SwshPokedex.Snapshot(after) == snapshot, "SWSH every batch survives encrypted serialization");
                var expected = Open(input); var expectedDex = expected.Zukan;
                ushort selectedSpecies = (ushort)selectedEntry.Species;
                switch (action)
                {
                    case "clear": expectedDex.SeenNone(); break;
                    case "seen": expectedDex.SeenAll(shiny); break;
                    case "caught": expectedDex.CaughtAll(shiny); break;
                    case "uncaught": expectedDex.CaughtNone(); break;
                    case "complete": expectedDex.CompleteDex(shiny); break;
                    case "give": expectedDex.SetDexEntryAll(selectedSpecies, shiny); break;
                    case "counts": expectedDex.SetAllBattledCount(500); break;
                }
                if (action is "caught" or "complete" or "give")
                    foreach (var pair in after.Zukan.DexLookup.Where(pair => action != "give" || pair.Key == selectedSpecies))
                    {
                        uint gender = after.Zukan.GetGenderDisplayed(pair.Value); var personal = after.Personal[pair.Key];
                        Check(personal.IsDualGender ? gender <= 1 : gender == personal.FixedGender(), "SWSH bulk display gender matches species");
                        // Core intentionally randomizes dual-gender display. Compare every other bit exactly.
                        expectedDex.SetGenderDisplayed(pair.Value, gender);
                    }
                Check(output.SequenceEqual(expected.Write().ToArray()), "SWSH every desktop batch equals Core complete output apart from validated random gender");
                // Non-primary records are not targets of species-based Core batches; SeenNone explicitly clears all blocks.
                foreach (var duplicate in catalog.Entries.Where(e => !e.Primary))
                {
                    var idx = new Zukan8Index((Zukan8Type)duplicate.Region, (ushort)duplicate.Number);
                    Check(after.Zukan.GetBattledCount(idx) == 0 && !after.Zukan.GetCaught(idx), "SWSH batches preserve duplicate entries");
                    Check(after.Zukan.GetUnk2Count(idx) == (action == "clear" ? 0u : 0xA7000000u), "SWSH clear semantics and duplicate reserved bytes");
                }
                for (int i = 0; i < seed.AllBlocks.Count; i++)
                    if (seed.AllBlocks[i].Key is not (0x4716C404 or 0x3F936BA9 or 0x3C9366F0))
                        Check(seed.AllBlocks[i].Data.SequenceEqual(after.AllBlocks[i].Data), "SWSH batch unrelated blocks preserved");
                if (action == "counts") Check(after.Zukan.DexLookup.Values.All(e => after.Zukan.GetBattledCount(e) == 500), "SWSH all primary battle counts");
            }
            foreach (var invalid in new[] { new Dex8Edit("counts"), new("counts", Battled: uint.MaxValue), new("clear", Shiny: true), new("seen", Index: 1), new("give", Index: 9999), new("unknown"), new("seen", Battled: 0) }) Reject(input, invalid);
            var json = JsonSerializer.Serialize(new Dex8Edit("entry", catalog.Entries[0].State), SaveJsonContext.Default.Dex8Edit);
            foreach (string property in new[] { "index", "caught", "gigantamaxed", "form", "gender", "displayGigantamax", "displayShiny", "battled" })
            {
                var node = System.Text.Json.Nodes.JsonNode.Parse(json)!; node["entry"]!.AsObject().Remove(property);
                try { JsonSerializer.Deserialize(node.ToJsonString(), SaveJsonContext.Default.Dex8Edit); throw new Exception("Missing SWSH field accepted"); } catch (JsonException) { }
            }
            Check(input.SequenceEqual(original), "SWSH source bytes unchanged");
            Console.WriteLine($"PASS {version} dex revision {revision}: physical/primary entries, raw fields, every menu, invalid requests and synthetic encrypted roundtrip (real SaveService fixture still pending)");
        }
    }
    private static void Reject(byte[] input, Dex8Edit edit)
    {
        var save = Open(input);
        try { SwshPokedex.Apply(save, edit); throw new Exception("Invalid SWSH edit accepted"); }
        catch (ArgumentException) { Check(save.Write().Span.SequenceEqual(input), "SWSH rejection is atomic"); }
    }
}
