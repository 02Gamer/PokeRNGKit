// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class ZaPokedexTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static Span<byte> Bytes(SAV9ZA save, int species) => save.Blocks.GetBlock(ZaBlockFixtureTests.DexKey).Data.Slice(SpeciesConverter.GetInternal9((ushort)species) * PokeDexEntry9a.SIZE, PokeDexEntry9a.SIZE);
    public static void Run()
    {
        for (int revision = 0; revision < 3; revision++)
        {
            var input = ZaBlockFixtureTests.Create(revision); var original = input.ToArray();
            var save = new SAV9ZA(input.ToArray()); var catalog = ZaPokedex.Read(save);
            Check(catalog.Entries.Length == Enumerable.Range(1, save.MaxSpeciesID).Count(s => save.Personal.IsSpeciesInGame((ushort)s)), "ZA catalog revision ceiling");
            foreach (var entry in catalog.Entries)
            {
                Check(entry.FormChoices.Length == 32 && entry.State.Languages.Length == 10 && entry.MegaChoices.Length == entry.State.Mega.Length, "ZA catalog dimensions");
                Check(entry.Name.Zh.Length > 0 && entry.Name.En.Length > 0 && entry.Name.Ja.Length > 0, "ZA localized species");
                ZaPokedex.Apply(save, new("entry", entry.State));
            }
            Check(save.Write().Span.SequenceEqual(input), "ZA all entries exact no-op preserves noncanonical booleans");
            foreach (var pair in new[] { ((int)Species.Charizard, 2), ((int)Species.Raichu, revision == 0 ? 1 : 2), ((int)Species.Lucario, revision == 0 ? 1 : 2), ((int)Species.Meowstic, 2), ((int)Species.Magearna, 2), ((int)Species.Tatsugiri, 3) })
            {
                var item = catalog.Entries.SingleOrDefault(e => e.State.Species == pair.Item1);
                if (item is not null) Check(item.State.Mega.Length == pair.Item2 && item.MegaChoices.All(m => m.Zh.Length > 0 && m.En.Length > 0 && m.Ja.Length > 0), "ZA revision-specific localized Mega choices");
            }
            var json = JsonSerializer.SerializeToNode(new Dex9aEdit("entry", catalog.Entries[0].State), SaveJsonContext.Default.Dex9aEdit)!;
            foreach (string required in new[] { "species", "isNew", "alpha", "displayForm", "displayGender", "displayShiny" })
            {
                var copy = json.DeepClone(); copy["entry"]!.AsObject().Remove(required); bool rejected = false;
                try { JsonSerializer.Deserialize(copy.ToJsonString(), SaveJsonContext.Default.Dex9aEdit); } catch (JsonException) { rejected = true; }
                Check(rejected, "ZA missing scalar rejected instead of implicit zero");
            }
            var expected = new SAV9ZA(input.ToArray());
            foreach (var entry in catalog.Entries)
            {
                var old = entry.State;
                var state = old with { Forms = Enumerable.Range(0, 3).Select(r => Enumerable.Range(0, 32).Select(f => f % 4 == r).ToArray()).ToArray(),
                    Languages = Enumerable.Range(0, 10).Select(i => i % 2 == 1).ToArray(), Genders = [true, false, true],
                    Mega = Enumerable.Repeat(true, old.Mega.Length).ToArray(), IsNew = false, Alpha = false,
                    DisplayForm = 31, DisplayGender = (uint)(old.Species % 4), DisplayShiny = false };
                ZaPokedex.Apply(save, new("entry", state));
                var raw = Bytes(expected, old.Species);
                WriteUInt32LittleEndian(raw, 0x11111111); WriteUInt32LittleEndian(raw[4..], 0x22222222); WriteUInt32LittleEndian(raw[12..], 0x44444444);
                WriteUInt16LittleEndian(raw[8..], 0xFEAA); raw[10] = 0; raw[11] = 0xA5;
                raw[16] |= (byte)((1 << old.Mega.Length) - 1); raw[17] = 0;
                raw[0x5A] = 31; raw[0x5B] = (byte)(old.Species % 4); raw[0x5C] = 0;
            }
            var output = save.Write().ToArray();
            Check(output.SequenceEqual(expected.Write().ToArray()) && SwishCrypto.GetIsHashValid(output), "ZA independent manual oracle full encrypted output");
            Check(ZaPokedex.Snapshot(new SAV9ZA(output.ToArray())) == ZaPokedex.Snapshot(save), "ZA snapshot reopen");
            // Clear caught must also clear reserved form bits without erasing seen/Alpha/Mega records.
            expected = new SAV9ZA(output.ToArray());
            for (int s = 1; s <= expected.MaxSpeciesID; s++) { var raw = Bytes(expected, s); raw[..4].Clear(); raw.Slice(8, 2).Clear(); raw.Slice(0x5A, 3).Clear(); }
            ZaPokedex.Apply(save, new("uncaught"));
            Check(save.Write().Span.SequenceEqual(expected.Write().Span), "ZA clear caught exact bytes including extra forms");
            foreach (bool shiny in new[] { false, true })
            {
                var a = new SAV9ZA(input.ToArray()); var b = new SAV9ZA(input.ToArray());
                ZaPokedex.Apply(a, new("seen", Shiny: shiny)); b.Zukan.SeenAll(shiny);
                Check(a.Write().Span.SequenceEqual(b.Write().Span), "ZA seen matches Core all bytes");
                ZaPokedex.Apply(a, new("clear")); b.Zukan.SeenNone();
                Check(a.Write().Span.SequenceEqual(b.Write().Span), "ZA clear matches Core all bytes");
                foreach (string action in new[] { "give", "caught", "complete" })
                {
                    a = new SAV9ZA(input.ToArray()); b = new SAV9ZA(input.ToArray());
                    ushort selected = (ushort)catalog.Entries[0].State.Species;
                    ZaPokedex.Apply(a, new(action, Species: action == "give" ? selected : 0, Shiny: shiny));
                    if (action == "give") b.Zukan.SetDexEntryAll(selected, shiny);
                    else if (action == "caught") b.Zukan.CaughtAll(shiny);
                    else b.Zukan.CompleteDex(shiny);
                    foreach (var item in catalog.Entries)
                    {
                        ushort s = (ushort)item.State.Species;
                        if (action == "give" && s != selected) continue;
                        byte form = 0;
                        while (form < a.Personal[s].FormCount && !a.Personal[s, form].IsPresentInGame) form++;
                        if (form == a.Personal[s].FormCount) form = 0;
                        var pi = a.Personal[s, form]; var e = a.Zukan.GetEntry(s);
                        var male = e.GetDisplayGender(Gender.Male, s, form); var female = e.GetDisplayGender(Gender.Female, s, form);
                        Check(pi.Genderless ? e.DisplayGender == DisplayGender9a.Genderless : pi.OnlyMale ? e.DisplayGender == male : pi.OnlyFemale ? e.DisplayGender == female : e.DisplayGender == male || e.DisplayGender == female, "ZA random display gender respects actual form");
                        // The only nondeterministic field is compared by its valid domain, then normalized.
                        Bytes(a, s)[0x5B] = Bytes(b, s)[0x5B];
                    }
                    Check(a.Write().Span.SequenceEqual(b.Write().Span), "ZA registration matches Core full output except validated random gender");
                }
            }
            var chosen = catalog.Entries[0].State;
            var rawSave = new SAV9ZA(input.ToArray()); var bytes = Bytes(rawSave, chosen.Species); bytes[0x5A] = 255; bytes[0x5B] = 255;
            var rawState = ZaPokedex.State(rawSave, (ushort)chosen.Species);
            ZaPokedex.Apply(rawSave, new("entry", rawState with { Alpha = false }));
            Check(bytes[0x5A] == 255 && bytes[0x5B] == 255, "ZA sibling edit preserves raw display values");
            ZaPokedex.Apply(rawSave, new("entry", rawState with { DisplayForm = 31, DisplayGender = 3 }));
            Check(bytes[0x5A] == 31 && bytes[0x5B] == 3, "ZA explicit display repair");
            foreach (var bad in new Dex9aEdit[] { new("entry", chosen with { Species = 0 }), new("entry", chosen with { Species = 65536 }),
                new("entry", chosen with { Forms = [new bool[31], new bool[32], new bool[32]] }), new("entry", chosen with { Languages = new bool[9] }),
                new("entry", chosen with { Mega = new bool[4] }), new("entry", chosen with { DisplayForm = 32 }), new("entry", chosen with { DisplayGender = 4 }),
                new("entry", chosen, Shiny: true), new("give", Species: save.MaxSpeciesID + 1), new("clear", Shiny: true), new("seen", chosen), new("unknown") })
            {
                var a = new SAV9ZA(input.ToArray()); bool rejected = false;
                try { ZaPokedex.Apply(a, bad); } catch (ArgumentException) { rejected = true; }
                Check(rejected && a.Write().Span.SequenceEqual(input), "ZA malformed edit rejected atomically");
            }
            foreach (ulong unsupported in new[] { 3UL, 1UL << 32 })
            {
                var a = new SAV9ZA(input.ToArray()); a.SetValue(SaveBlockAccessor9ZA.KSaveRevision, unsupported);
                Check(!ZaPokedex.Supports(a), "ZA raw uint64 revision checked before int truncation");
            }
            Check(input.SequenceEqual(original), "ZA original retained");
            Console.WriteLine($"PASS ZA editor revision {revision}: {catalog.Entries.Length} species, independent manual byte oracle, clear-caught regression, raw values and atomic rejection; synthetic fixture only");
        }
    }
}
