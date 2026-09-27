// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class SimplePokedexTests
{
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }
    private static SimpleDexFlagEdit[] Entries(SaveFile s) => Enumerable.Range(1, s.MaxSpeciesID).Select(i => new SimpleDexFlagEdit(i, s.GetSeen((ushort)i), s.GetCaught((ushort)i))).ToArray();
    private static byte[] Export(byte[] data, SimpleDexEdit edit) => SaveService.EditPokedex(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.SimpleDexEdit));
    private static SAV3 Gba(bool frlg)
    {
        var data = new byte[SaveUtil.SIZE_G3RAW];
        for (int slot = 0; slot < 2; slot++) for (ushort sector = 0; sector < 14; sector++)
        {
            var at = (slot * 14 + sector) * 0x1000;
            BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(at + 0xFF4), sector);
            BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(at + 0xFF8), 0x08012025);
        }
        if (frlg) data[0xAC] = 1;
        data[6] = data[7] = 0xFF;
        return frlg ? new SAV3FRLG(data) : new SAV3RS(data);
    }
    public static void Run()
    {
        SaveFile[] saves = [new SAV1(LanguageID.English), new SAV1(LanguageID.Japanese),
            new SAV2(LanguageID.English, GameVersion.GS), new SAV2(LanguageID.English, GameVersion.C),
            new SAV2(LanguageID.Japanese, GameVersion.GS), new SAV2(LanguageID.Japanese, GameVersion.C), new SAV2(LanguageID.Korean, GameVersion.GS),
            Gba(false), SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!, Gba(true)];
        foreach (var template in saves)
        {
            template.OT = "TEST";
            if (template.Generation < 3)
            {
                // Empty Core templates leave untouched list terminators uninitialized. Populate real lists for SaveUtil detection.
                var pokemon = template.BlankPKM;
                pokemon.Species = 25; pokemon.Nickname = "PIKA"; pokemon.OriginalTrainerName = "A"; pokemon.CurrentLevel = 5;
                template.SetBoxSlotAtIndex(pokemon, 0, 0);
                template.PartyData = [pokemon];
            }
            for (ushort species = 1; species <= template.MaxSpeciesID; species++) { template.SetSeen(species, species % 2 == 0); template.SetCaught(species, species % 3 == 0); }
            if (template is SAV2 two)
            {
                two.SetCaught(201, true); var offsets = new SAV2Offsets(two);
                two.Data.Slice(offsets.PokedexSeen + 0x20, 26).Fill(0xAA); two.UnownFirstSeen = 0;
            }
            if (template is SAV3 gba)
            {
                gba.Large[gba.LargeBlock.SeenOffset2] ^= 1;
                gba.Large[gba.LargeBlock.SeenOffset3 + 48] |= 0xFC;
            }
            var data = template.Write().ToArray(); var original = data.ToArray();
            var save = SaveUtil.GetSaveFile(data.ToArray()) ?? throw new Exception($"Cannot detect synthesized {template.GetType().Name}/{template.Language}/{template.Version}");
            Require(save.GetType() == template.GetType() && SaveChecksums.Valid(save), "Synthetic / fixture save recognized with valid checksum");
            if (template is ILangDeviantSave old && save is ILangDeviantSave actual) Require(old.Japanese == actual.Japanese && old.Korean == actual.Korean, "Regional layout preserved");
            var entries = Entries(save); var catalog = SimplePokedex.Read(save, "test.sav");
            if (save is SAV2 { Korean: true })
            {
                Require(!save.ChecksumsValid && SaveChecksums.Valid(save), "Korean fixture exercises upstream checksum-reader discrepancy");
                foreach (int offset in new[] { 0x2A8E, 0x106B, 0x2DAB, 0x7E6B })
                {
                    var damaged = data.ToArray(); damaged[offset] ^= 1;
                    var parsed = SaveUtil.GetSaveFile(damaged.ToArray())!;
                    Require(!SaveChecksums.Valid(parsed) && SimplePokedex.Capability(parsed)?.CanEdit == false, "Each Korean checksum/data corruption independently rejected");
                    try { Export(damaged, new("test.sav", entries)); throw new Exception("Corrupt Korean dex accepted"); } catch (ArgumentException) { }
                    try { SaveService.ExportWorkingCopy(damaged); throw new Exception("Corrupt Korean download accepted"); } catch (ArgumentException) { }
                }
            }
            Require(catalog.Entries.Length == save.MaxSpeciesID && catalog.CanEdit && catalog.Entries.All(e=>e.Name.Zh.Length > 0 && e.Name.En.Length > 0 && e.Name.Ja.Length > 0), "Complete localized catalog");
            using (var report = JsonDocument.Parse(SaveService.Inspect(data)))
            {
                Require(report.RootElement.GetProperty("pokedex").GetProperty("canEdit").GetBoolean(), "Pokedex capability advertised");
                if (save.Generation < 3) Require(!report.RootElement.GetProperty("canEdit").GetBoolean(), "Other GB editors remain closed");
            }
            var requests = new List<SimpleDexFlagEdit[]> { entries };
            foreach (bool value in new[] { false, true })
            {
                requests.Add(entries.Select(e => e with { Seen = value }).ToArray());
                requests.Add(entries.Select(e => e with { Caught = value }).ToArray());
                foreach (var species in new[] { 1, (int)save.MaxSpeciesID, Math.Min(201, (int)save.MaxSpeciesID) })
                foreach (bool caught in new[] { false, true }) requests.Add(entries.Select(e=>e.Species == species ? e with { Seen = value, Caught = caught } : e).ToArray());
            }
            foreach (var request in requests)
            {
                var expected = SaveUtil.GetSaveFile(data.ToArray())!;
                foreach (var e in request) { expected.SetSeen((ushort)e.Species, e.Seen!.Value); expected.SetCaught((ushort)e.Species, e.Caught!.Value); }
                if (expected is SAV3 three) three.MirrorSeenFlags();
                var output = Export(data, new("test.sav", request));
                Require(output.SequenceEqual(expected.Write().ToArray()), "Whole output equals desktop SaveAllFlags / SanityCheck");
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Require(SaveChecksums.Valid(after) && after.GetType() == save.GetType() && SimplePokedex.Snapshot(after) == SimplePokedex.Snapshot(expected), "Pokedex reload verification");
                Require(SaveService.ExportWorkingCopy(output).SequenceEqual(output), "Working-copy download preserves exact verified bytes");
                Require(data.SequenceEqual(original), "Original remains unchanged");
            }
            foreach (var invalid in new[] {
                new SimpleDexEdit("test.sav", []), new("test.sav", entries.Select(e=>e.Species==1 ? e with {Species=0} : e).ToArray()),
                new("test.sav", entries.Select(e=>e.Species==1 ? e with {Species=2} : e).ToArray()),
                new("test.sav", entries.Select(e=>e.Species==1 ? e with {Seen=null} : e).ToArray()),
                new("bad/name.sav", entries) })
            {
                try { Export(data, invalid); throw new Exception("Invalid Pokedex request accepted"); }
                catch(ArgumentException) { Require(data.SequenceEqual(original), "Invalid request leaves original intact"); }
            }
            Console.WriteLine($"PASS {save.GetType().Name}/{save.Language}/{save.Version}: full catalog, four bulk operations, independent flags and endpoints, desktop output, original, download, capability and invalid requests");
        }
        VirtualConsole();
        foreach (var version in new[] { "D", "X", "SN", "BD" })
        {
            var data = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"); var save = SaveUtil.GetSaveFile(data.ToArray())!;
            Require(SimplePokedex.Capability(save) is null, "Later generations await their own complete dex implementation");
            try { Export(data, new("test.sav", Entries(save))); throw new Exception("Unsupported dex accepted"); } catch (ArgumentException) { }
        }
        var badData = File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        var validEntries = Entries(SaveUtil.GetSaveFile(badData.ToArray())!);
        badData[0x100] ^= 1;
        Require(!SaveChecksums.Valid(SaveUtil.GetSaveFile(badData.ToArray())!), "Corrupted fixture checksum fails");
        try { Export(badData, new("test.sav", validEntries)); throw new Exception("Invalid checksum accepted"); } catch(ArgumentException) { }
    }
    private static void VirtualConsole()
    {
        var save = Gba(true); var data = save.Write().ToArray();
        var all = Enumerable.Range(1, 386).Select(i=>new SimpleDexFlagEdit(i,true,true)).ToArray();
        foreach (var fileName in new[] { "FireRed_001.sav", "LeafGreen_001.sav", "main.sav" })
        {
            var expected = SaveUtil.GetSaveFile(data.ToArray())!; expected.Metadata.SetExtraInfo(fileName);
            foreach (var e in all) { expected.SetSeen((ushort)e.Species,true); expected.SetCaught((ushort)e.Species,true); }
            bool vc = ((SAV3FRLG)expected).IsVirtualConsole;
            if (vc) for (ushort i=151;i<=386;i++) if (Legal.IsForeignFRLG(i)) expected.SetCaught(i,false);
            ((SAV3)expected).MirrorSeenFlags();
            var output=Export(data,new(fileName,all));
            Require(output.SequenceEqual(expected.Write().ToArray()), "Filename-specific FRLG sanitation equals upstream");
            var catalog=SimplePokedex.Read(SaveUtil.GetSaveFile(output.ToArray())!,fileName);
            Require(catalog.VirtualConsole==vc && catalog.Entries.All(e=>e.Seen && (e.Caught == (!vc || !Legal.IsForeignFRLG((ushort)e.Species)))), "VC restrictions reflect actual post-save flags");
        }
        Console.WriteLine("PASS FRLG filename-based VC sanitation, catalog and unchanged seen flags");
    }
}
