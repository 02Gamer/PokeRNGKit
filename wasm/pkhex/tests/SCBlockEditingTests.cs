// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
using System.IO.Compression;
using PokeRNGKit.SaveEditor;

internal static class SCBlockEditingTests
{
    internal static void Run()
    {
        foreach (var template in new SaveFile[] {
            new SAV8SWSH(SwshBlockFixtureTests.Create(GameVersion.SW, 2)),
            new SAV8LA(LegendsPokedexTests.Fixture(1)),
            new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL, 2)),
            new SAV9ZA(ZaBlockFixtureTests.Create(2)),
        })
        {
            // Existing schema fixtures need not include a Boolean. Add an explicit engineering-only block.
            const uint flagTestKey = 0x01020304;
            var fixtureBlocks = ((ISCBlockArray)template).AllBlocks.Where(b => b.Key != flagTestKey).Select(b => b.Clone()).ToList();
            fixtureBlocks.Add(SwshBlockFixtureTests.Typed(flagTestKey, [], SCTypeCode.Bool1));
            fixtureBlocks.RemoveAll(b => b.Key is 0x01020305 or 0x01020306);
            fixtureBlocks.Add(SwshBlockFixtureTests.Typed(0x01020305, [1, 2, 3, 4], SCTypeCode.Array, SCTypeCode.Byte));
            fixtureBlocks.Add(SwshBlockFixtureTests.Typed(0x01020306, [1, 0, 192, 127], SCTypeCode.Single));
            fixtureBlocks.Sort((a, b) => a.Key.CompareTo(b.Key));
            var seed = SCBlockEditing.Reopen(template, SwishCrypto.Encrypt(fixtureBlocks));
            byte[] input = seed.Write().ToArray(); byte[] original = input.ToArray();
            var storage = (ISCBlockArray)seed;
            var page = SCBlockEditing.Read(seed, Br4Editing.Hash(input), new());
            Check(page.Total == storage.AllBlocks.Count && page.Blocks.Length == 50, "Complete physical catalog/paging");
            Check(seed.Write().Span.SequenceEqual(original), "Read does not mutate source");
            string names = "01020304\tCustom flag\n01020304\tIgnored duplicate\n100000001020305\tArray alias";
            var metadata = new SCBlockMetadata(storage.Accessor, names.Split('\n'));
            var expectedNames = metadata.GetSortedBlockKeyList().Select(x => ((uint)x.Value).ToString("X8")).ToArray();
            var namedPage = SCBlockEditing.Read(seed, "hash", new(Names: names, Offset: 1, Limit: 200));
            Check(namedPage.Blocks.Select(b => b.Key).SequenceEqual(expectedNames.Skip(1).Take(200)), "Exact source names/sort/paging including ulong-to-uint alias");
            var filtered = SCBlockEditing.Read(seed, "hash", new(Names: names, Filter: "custom FLAG"));
            Check(filtered.Total == 1 && filtered.Blocks[0].Key == "01020304", "Source case-insensitive name filter and first duplicate");
            var excluded = SCBlockEditing.Read(seed, "hash", new(Names: names, Exclusions: ["Custom"]));
            Check(excluded.Total == storage.AllBlocks.Count && excluded.Blocks.All(x => x.Name != "Custom flag"), "Exclusions remove labels, retain physical blocks");
            Reject(() => SCBlockEditing.Read(seed, "hash", new(Limit: 201)));
            for (int option = 0; option < 16; option++) Check(SCBlockEditing.ExportSingle(seed, option).AsSpan().SequenceEqual(SCBlockUtil.ExportAllBlocks(storage.Accessor.BlockInfo, (SCBlockExportOption)option)), "All 16 source export combinations");
            Check(SCBlockEditing.ExportFolder(seed).Length == storage.AllBlocks.Count(b => b.Data.Length != 0), "Folder excludes zero-length flags");
            var archive = SaveService.ArchiveSCBlocks(SCBlockEditing.ExportFolder(seed));
            using (var zip = new ZipArchive(new MemoryStream(Convert.FromBase64String(archive.Data)), ZipArchiveMode.Read))
            {
                Check(zip.Entries.Count == storage.AllBlocks.Count(b => b.Data.Length != 0), "Offline ZIP contains every nonempty block");
                foreach (var entry in zip.Entries) { uint archiveKey = Util.GetHexValue(entry.Name.Split(' ')[0].Split('.')[0]); using var reader = entry.Open(); using var raw = new MemoryStream(); reader.CopyTo(raw); Check(raw.ToArray().AsSpan().SequenceEqual(storage.Accessor.GetBlock(archiveKey).Data), "ZIP raw bytes/names equal source export"); }
            }
            var block = storage.AllBlocks.First(b => b.Data.Length > 0 && b.Type == SCTypeCode.Object);
            var flag = storage.Accessor.GetBlock(flagTestKey);
            string key = block.Key.ToString("X8"), flagKey = flag.Key.ToString("X8");
            var bytes = block.Data.ToArray(); bytes[^1] ^= 0x5A;
            string data = Convert.ToBase64String(bytes);
            var actions = new SCBlockAction[] { new("toggle", flagKey, "Bool2"), new("folder", Files: [new(key + " value.bin", data), new(key + ".bad", "AA=="), new("00000000.bin", ""), new(key + ".bin", Convert.ToBase64String(block.Data))]) };
            var prepared = SCBlockEditing.Prepare(seed, input, actions);
            Check(prepared.Imports.Select(x => x.Imported).SequenceEqual(new[] { true, false, false, true }), "Partial folder success and ordered duplicate overwrite");
            var oracle = seed.Clone(); ((ISCBlockArray)oracle).Accessor.GetBlock(flag.Key).ChangeBooleanType(SCTypeCode.Bool2);
            Check(prepared.Output.AsSpan().SequenceEqual(oracle.Write().Span), "Independent whole-file operation oracle");
            var request = new SCBlockRequest(Br4Editing.Hash(input), actions);
            request = JsonSerializer.Deserialize(JsonSerializer.Serialize(request, SaveJsonContext.Default.SCBlockRequest), SaveJsonContext.Default.SCBlockRequest)!;
            foreach (var json in new[] { "{}", "{\"sourceHash\":\"x\"}", "{\"actions\":[]}" })
                Reject(() => JsonSerializer.Deserialize(json, SaveJsonContext.Default.SCBlockRequest));
            Reject(() => JsonSerializer.Deserialize("{}", SaveJsonContext.Default.SCBlockExportQuery));
            Reject(() => JsonSerializer.Deserialize("{}", SaveJsonContext.Default.SCBlockCompareQuery));
            var ticket = SCBlockSession.Prepare(seed, input, request);
            Check(ticket.RequiresPartialAcceptance && ticket.Blocks.Any(x => x.Key == flagKey), "Frozen complete changes/partial results");
            Reject(() => SCBlockSession.Commit(input, new(ticket.Token, ticket.SourceHash, ticket.TargetHash, false)));
            Check(SCBlockSession.Commit(input, new(ticket.Token, ticket.SourceHash, ticket.TargetHash, true)).AsSpan().SequenceEqual(prepared.Output), "Exact frozen one-time output");
            Reject(() => SCBlockSession.Commit(input, new(ticket.Token, ticket.SourceHash, ticket.TargetHash, true)));
            var old = SCBlockSession.Prepare(seed, input, request);
            var fresh = SCBlockSession.Prepare(seed, input, request); SCBlockSession.Discard(old.Token);
            Reject(() => SCBlockSession.Commit(input, new(old.Token, old.SourceHash, old.TargetHash, true)));
            var stale = input.ToArray(); stale[0] ^= 1;
            Reject(() => SCBlockSession.Commit(stale, new(fresh.Token, fresh.SourceHash, fresh.TargetHash, true)));
            SCBlockSession.Commit(input, new(fresh.Token, fresh.SourceHash, fresh.TargetHash, true));
            var failed = SCBlockSession.Prepare(seed, input, request);
            Reject(() => SaveService.PreviewSCBlocks(input, "{}"));
            Reject(() => SCBlockSession.Commit(input, new(failed.Token, failed.SourceHash, failed.TargetHash, true)));
            Check(seed.Write().Span.SequenceEqual(original), "Original immutable after edit");
            var selected = SCBlockEditing.Read(seed, Br4Editing.Hash(input), new(Selected: key));
            Check(selected.Selected?.Key == key && selected.Data == Convert.ToBase64String(block.Data), "Selected complete raw data");
            var changed = seed.Clone(); ((ISCBlockArray)changed).Accessor.GetBlock(block.Key).ChangeData(bytes);
            var comparison = SCBlockEditing.Compare(seed, changed, "old", "new", "");
            Check(comparison.Blocks.Length == 1 && comparison.Blocks[0].Key == key && comparison.Blocks[0].AfterData == data, "Complete physical comparison");
            var structuralBlocks = storage.AllBlocks.Where(b => b.Key != 0x01020305).Select(b => b.Clone()).ToList();
            structuralBlocks.Add(SwshBlockFixtureTests.Typed(0x01020305, [1, 2, 3, 4], SCTypeCode.Array, SCTypeCode.UInt16));
            structuralBlocks.First(b => b.Key == 0x01020306).Data[0] = 2;
            structuralBlocks.Sort((a, b) => a.Key.CompareTo(b.Key));
            var structural = SCBlockEditing.Reopen(seed, SwishCrypto.Encrypt(structuralBlocks));
            var complete = SCBlockEditing.Compare(seed, structural, "old", "new", names);
            Check(complete.Blocks.Select(b => b.Key).SequenceEqual(new[] { "01020305", "01020306" }), "Array subtype and equal-NaN byte differences retained beyond source report");
            Reject(() => SCBlockEditing.Prepare(seed, input, [new("import", key, Data: "AA==")]));
            Check(seed.Write().Span.SequenceEqual(original), "Rejected request preserves original");
            Console.WriteLine($"PASS SCBlock {seed.GetType().Name}: physical catalog/read clone, all16 exports, folder partial/ordered duplicates, independent full-file oracle, bool/raw edits, selected bytes and compare; synthetic fixture only");
        }
    }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); throw new Exception("Invalid SCBlock action accepted"); } catch (ArgumentException) {} catch (InvalidOperationException) {} catch (JsonException) {} }
}
