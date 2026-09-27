// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class SvPokedexTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SAV9SV Open(byte[] data) => new(data.ToArray());
    public static void Run()
    {
        foreach (var version in new[] { GameVersion.SL, GameVersion.VL })
        for (int revision = 0; revision < 3; revision++)
        {
            var input = SvBlockFixtureTests.Create(version, revision); var original = input.ToArray();
            var save = Open(input); var catalog = SvPokedex.Read(save); bool modern = revision > 0;
            uint key = modern ? SvBlockFixtureTests.Kitakami : SvBlockFixtureTests.Paldea;
            int stride = modern ? 0x20 : 0x18;
            Check(catalog.Modern == modern && catalog.Entries.Length == Enumerable.Range(1, save.MaxSpeciesID).Count(s => save.Personal.IsSpeciesInGame((ushort)s)), "SV catalog matches available species and revision cap");
            Check(catalog.Entries.All(e => e.Name.Zh.Length > 0 && e.Name.En.Length > 0 && e.Name.Ja.Length > 0 && e.FormChoices.Length > 0 && e.FormChoices.All(f => f.Zh.Length > 0 && f.En.Length > 0 && f.Ja.Length > 0)), "SV three-language species and form choices");
            foreach (var entry in catalog.Entries) SvPokedex.Apply(save, new("entry", entry.State));
            Check(save.Write().Span.SequenceEqual(input), "SV every catalog entry no-op retains raw boolean and alignment bytes");
            var expected = Open(input);
            foreach (var entry in catalog.Entries)
            {
                var old = entry.State;
                var state = old with {
                    Status = modern ? null : 3, IsNew = modern ? null : true, Different = modern ? null : true,
                    Shiny = !old.Shiny, Genders = [true, false, true], Languages = Enumerable.Range(0, 9).Select(i => i % 2 == 0).ToArray(),
                    Forms = Enumerable.Range(0, modern ? 4 : 1).Select(r => Enumerable.Range(0, 32).Select(f => f % 4 == r).ToArray()).ToArray(),
                    Displays = old.Displays.Select((d, r) => modern && entry.Regions[r] == 0 ? d : d with { Form = (uint)(entry.FormChoices.Length - 1), Gender = 2, Shiny = r == 0 ? d.Shiny : !d.Shiny }).ToArray()
                };
                SvPokedex.Apply(save, new("entry", state));
                var raw = expected.Blocks.GetBlock(key).Data.Slice(SpeciesConverter.GetInternal9((ushort)old.Species) * stride, stride);
                // Independent byte oracle for all manual fields, retaining the fixture's reserved bits.
                if (!modern)
                {
                    WriteUInt32LittleEndian(raw, 3); WriteUInt32LittleEndian(raw[4..], 0x11111111);
                    raw[8] = 5; WriteUInt16LittleEndian(raw[10..], 0xE155); raw[12] = 0; raw[13] = 1; raw[22] = 1;
                    WriteUInt32LittleEndian(raw[16..], state.Displays[0].Form); raw[20] = 2;
                }
                else
                {
                    for (int r = 0; r < 4; r++) WriteUInt32LittleEndian(raw[((r == 0 ? 1 : r == 1 ? 0 : r) * 4)..], 0x11111111u << r);
                    WriteUInt16LittleEndian(raw[16..], 0xE155); raw[18] = 0xA5; raw[19] = 0xA3;
                    for (int r = 0; r < 3; r++)
                    {
                        if (entry.Regions[r] == 0) continue;
                        raw[20 + r * 4] = (byte)state.Displays[r].Form; raw[21 + r * 4] = 2;
                        if (r != 0) raw[22 + r * 4] = 1;
                    }
                }
            }
            var output = save.Write().ToArray();
            Check(output.SequenceEqual(expected.Write().ToArray()) && SwishCrypto.GetIsHashValid(output), "SV all species/manual fields exact complete encrypted output");
            Check(SvPokedex.Snapshot(Open(output)) == SvPokedex.Snapshot(save), "SV manual snapshot survives reopen");
            // Keep malformed display values and status untouched, while changing another field in the same group.
            var rawSave = Open(input); var chosen = catalog.Entries.First(e => e.Regions[0] != 0);
            var bytes = rawSave.Blocks.GetBlock(key).Data.Slice(SpeciesConverter.GetInternal9((ushort)chosen.State.Species) * stride, stride);
            if (modern) { bytes[20] = 255; bytes[21] = 255; } else { WriteUInt32LittleEndian(bytes, uint.MaxValue); WriteUInt32LittleEndian(bytes[16..], uint.MaxValue); bytes[20] = 255; }
            var rawInput = rawSave.Write().ToArray(); var rawState = SvPokedex.State(rawSave, (ushort)chosen.State.Species);
            Check(rawState.Displays[0].Gender == 255, "SV catalog exposes raw gender instead of normalizing to genderless");
            SvPokedex.Apply(rawSave, new("entry", rawState)); Check(rawSave.Write().Span.SequenceEqual(rawInput), "SV raw out-of-picker values retained");
            var displays = rawState.Displays.ToArray(); displays[0] = displays[0] with { Shiny = !displays[0].Shiny };
            SvPokedex.Apply(rawSave, new("entry", rawState with { Displays = displays }));
            var rawExpected = Open(rawInput); var rawBytes = rawExpected.Blocks.GetBlock(key).Data.Slice(SpeciesConverter.GetInternal9((ushort)chosen.State.Species) * stride, stride);
            rawBytes[modern ? 22 : 21] = displays[0].Shiny ? (byte)1 : (byte)0;
            Check(rawSave.Write().Span.SequenceEqual(rawExpected.Write().Span), "SV sibling edits preserve raw form/gender bytes");
            displays[0] = displays[0] with { Gender = 2 };
            SvPokedex.Apply(rawSave, new("entry", rawState with { Displays = displays }));
            rawBytes[modern ? 21 : 20] = 2;
            Check(rawSave.Write().Span.SequenceEqual(rawExpected.Write().Span), "SV explicit repair changes only raw gender");
            var good = chosen.State;
            foreach (var bad in new[] { good with { Species = 0 }, good with { Species = save.MaxSpeciesID + 1 }, good with { Languages = [] }, good with { Genders = [true] }, good with { Forms = [new bool[31]] }, good with { Status = modern ? 1u : null }, good with { Displays = [new(uint.MaxValue, 3, false)] } }) Reject(input, new("entry", bad));
            if (modern)
            {
                var absent = catalog.Entries.First(e => e.Regions.Contains(0)); int r = Array.IndexOf(absent.Regions, 0);
                var badDisplays = absent.State.Displays.ToArray(); badDisplays[r] = badDisplays[r] with { Shiny = !badDisplays[r].Shiny };
                Reject(input, new("entry", absent.State with { Displays = badDisplays }));
            }
            foreach (var bad in new[] { new Dex9Edit("bogus"), new("give", Species: save.MaxSpeciesID + 1), new("clear", Shiny: true), new("seen", Species: 25), new("entry", good, Shiny: true) }) Reject(input, bad);
            foreach (string property in new[] { "species", "status", "isNew", "different", "shiny" })
            {
                var json = System.Text.Json.Nodes.JsonNode.Parse(JsonSerializer.Serialize(new Dex9Edit("entry", good), SaveJsonContext.Default.Dex9Edit))!;
                json["entry"]!.AsObject().Remove(property);
                try { JsonSerializer.Deserialize(json.ToJsonString(), SaveJsonContext.Default.Dex9Edit); throw new Exception("Missing required SV state accepted"); } catch (JsonException) { }
            }
            Batches(input, catalog);
            Check(input.SequenceEqual(original), "SV original input preserved");
            Console.WriteLine($"PASS {version} dex revision {revision}: {catalog.Entries.Length} species, every manual field and form bit, exact byte export, raw preservation, batches and rejection; synthetic fixture, browser/product acceptance pending");
        }
    }
    private static void Reject(byte[] input, Dex9Edit edit)
    {
        var save = Open(input);
        try { SvPokedex.Apply(save, edit); throw new Exception("Invalid SV edit accepted"); }
        catch (ArgumentException) { Check(save.Write().Span.SequenceEqual(input), "SV invalid request is atomic"); }
    }
    private static void Batches(byte[] input, Dex9Catalog catalog)
    {
        foreach (string action in new[] { "clear", "uncaught", "seen", "caught", "complete", "give" })
        foreach (bool shiny in new[] { false, true })
        {
            if (shiny && action is "clear" or "uncaught") continue;
            var save = Open(input); var before = Open(input);
            var selected = catalog.Entries.First(e => e.State.Species == 128); // Tauros regional forms.
            var snapshot = SvPokedex.Apply(save, new(action, Species: action == "give" ? 128 : 0, Shiny: shiny));
            var output = save.Write().ToArray(); var after = Open(output);
            Check(SwishCrypto.GetIsHashValid(output) && SvPokedex.Snapshot(after) == snapshot, "SV every batch hash/snapshot roundtrip");
            for (int i = 0; i < save.AllBlocks.Count; i++)
            {
                var a = before.AllBlocks[i]; var b = after.AllBlocks[i];
                Check(a.Key == b.Key && a.Type == b.Type && a.SubType == b.SubType, "SV batch block metadata unchanged");
                if (a.Key is not (SvBlockFixtureTests.Paldea or SvBlockFixtureTests.Kitakami)) Check(a.Data.SequenceEqual(b.Data), "SV batches leave non-dex blocks unchanged");
            }
            if (action == "clear") { before.Zukan.SeenNone(); Check(output.SequenceEqual(before.Write().ToArray()), "SV clear equals full Core block clear"); continue; }
            if (action == "uncaught")
            {
                before.Zukan.DexPaldea.CaughtNone();
                if (catalog.Modern) before.Zukan.DexKitakami.CaughtNone();
                Check(output.SequenceEqual(before.Write().ToArray()), "SV uncaught matches existing blocks, including missing DLC block protection"); continue;
            }
            if (catalog.Modern) Check(before.Blocks.GetBlock(SvBlockFixtureTests.Paldea).Data.SequenceEqual(after.Blocks.GetBlock(SvBlockFixtureTests.Paldea).Data), "SV registration leaves obsolete Paldea block untouched");
            if (action == "seen" || !catalog.Modern)
            {
                var oracle = Open(input);
                switch (action)
                {
                    case "seen": oracle.Zukan.SeenAll(shiny); break;
                    case "caught": oracle.Zukan.CaughtAll(shiny); break;
                    case "complete": oracle.Zukan.CompleteDex(shiny); break;
                    case "give": oracle.Zukan.SetDexEntryAll(128, shiny); break;
                }
                // Match the corrected inclusive last item; normalize only nondeterministic gender bytes.
                if (action is "seen" or "caught" && oracle.Zukan.GetDexIndex(oracle.MaxSpeciesID).Index != 0)
                {
                    if (catalog.Modern) oracle.Zukan.DexKitakami.SeenAll(oracle.MaxSpeciesID, oracle.Personal[oracle.MaxSpeciesID].FormCount, true, shiny);
                    else oracle.Zukan.DexPaldea.SeenAll(oracle.MaxSpeciesID, oracle.Personal[oracle.MaxSpeciesID].FormCount, true, shiny);
                }
                if (!catalog.Modern && action != "seen")
                    foreach (var e in catalog.Entries.Where(e => action == "give" ? e.State.Species == 128 : oracle.Zukan.GetDexIndex((ushort)e.State.Species).Index != 0))
                    {
                        ushort s = (ushort)e.State.Species; uint gender = after.Zukan.DexPaldea.Get(s).GetDisplayGender(); var pi = oracle.Personal[s];
                        Check(pi.IsDualGender ? gender < 2 : gender == pi.FixedGender(), "SV original randomized gender is valid");
                        oracle.Zukan.DexPaldea.Get(s).SetDisplayGender((int)gender);
                    }
                Check(output.SequenceEqual(oracle.Write().ToArray()), "SV original batches and seen action match complete Core output with documented fixes");
            }
            foreach (var item in catalog.Entries.Where(e => action == "give" ? e.State.Species == 128 : before.Zukan.GetDexIndex((ushort)e.State.Species).Index != 0))
            {
                ushort s = (ushort)item.State.Species;
                var state = SvPokedex.State(after, s);
                Check(after.Zukan.GetSeen(s), "SV batch seen covers target species including last index");
                if (shiny) Check(state.Shiny, "SV shiny batch seen flag");
                if (action == "seen") continue;
                Check(after.Zukan.GetCaught(s) && state.Languages.All(v => v), "SV batch caught and all supported languages");
                if (!catalog.Modern) continue;
                for (byte f = 0; f < after.Personal[s].FormCount; f++)
                    if (after.Personal.IsPresentInGame(s, f)) Check(state.Forms[1][f], "SV batch obtains each present form");
                for (int r = 0; r < 3; r++)
                {
                    var forms = Enumerable.Range(0, after.Personal[s].FormCount).Where(f => {
                        var p = after.Personal.GetFormEntry(s, (byte)f);
                        return p.IsPresentInGame && (r == 0 ? p.DexPaldea : r == 1 ? p.DexKitakami : p.DexBlueberry) != 0;
                    }).ToArray();
                    if (forms.Length == 0) { Check(state.Displays[r] == item.State.Displays[r], "SV unavailable region display retained"); continue; }
                    int display = forms.FirstOrDefault(f => f != 0);
                    Check(state.Displays[r].Form == display && state.Displays[r].Shiny == shiny, "SV display uses regional form membership");
                    var pi = after.Personal.GetFormEntry(s, (byte)display);
                    Check(pi.IsDualGender ? state.Displays[r].Gender < 2 : state.Displays[r].Gender == pi.FixedGender(), "SV randomized displayed gender valid for actual form");
                }
            }
            if (action == "give")
            {
                uint key = catalog.Modern ? SvBlockFixtureTests.Kitakami : SvBlockFixtureTests.Paldea; int stride = catalog.Modern ? 0x20 : 0x18;
                var expected = before.Blocks.GetBlock(key).Data.ToArray(); int offset = SpeciesConverter.GetInternal9(128) * stride;
                after.Blocks.GetBlock(key).Data.Slice(offset, stride).CopyTo(expected.AsSpan(offset));
                Check(after.Blocks.GetBlock(key).Data.SequenceEqual(expected), "SV current species action leaves other entries unchanged");
            }
        }
    }
}
