// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.ComponentModel;
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class BlockAccessorEditingTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { bool rejected = false; try { action(); } catch (ArgumentException) { rejected = true; } Check(rejected, "Invalid accessor edit accepted"); }
    private static SaveFile Open(byte[] bytes) => SaveUtil.GetSaveFile(bytes.ToArray()) ?? throw new Exception("Accessor fixture is unrecognized");
    private static byte[] Fixture(string name)
    {
        if (name != "Demo") return File.ReadAllBytes($".tmp/pkhex-fixtures/{name}.sav");
        var demo = new SAV6AODemo { Version = GameVersion.OR, Language = 2, OT = "DEMO" };
        BinaryPrimitives.WriteUInt32LittleEndian(demo.Data[(demo.Data.Length - 0x1F0)..], 0x42454546);
        return demo.Write().ToArray();
    }
    private static void Compare(byte[] bytes, AccessorChange[] changes, Action<SaveFile> oracle)
    {
        var original = bytes.ToArray(); var source = Open(bytes); var before = source.Data.ToArray();
        var actual = BlockAccessorEditing.Prepare(source, bytes, new(Br4Editing.Hash(bytes), changes));
        var expected = Open(bytes); oracle(expected);
        Check(actual.SequenceEqual(expected.Write().ToArray()), "Accessor independent full-file source parity: " + string.Join(",", changes.Select(c => c.Block + "/" + string.Join('/', c.Path))));
        Check(bytes.SequenceEqual(original) && source.Data.SequenceEqual(before), "Accessor original/source immutable on prepare");
    }
    internal static void Run()
    {
        foreach (string name in new[] { "B", "B2", "X", "OR", "SN", "US", "GP", "Demo" })
        {
            var data = Fixture(name); var source = Open(data); var metadata = new SaveBlockMetadata<BlockInfo>(BlockAccessorReading.Accessor(source));
            var names = metadata.GetSortedBlockList().ToArray();
            // Independent native PropertyGrid descriptor oracle for a scalar in every source family.
            var candidate = names.SelectMany(block => TypeDescriptor.GetProperties(metadata.GetBlock(block)).Cast<PropertyDescriptor>().Where(p => p.IsBrowsable && !p.IsReadOnly && p.PropertyType == typeof(bool)).Select(p => (Block: block, Property: p))).First();
            var read = JsonSerializer.Deserialize(SaveService.ReadBlockAccessor(data, JsonSerializer.Serialize(new AccessorSelection(candidate.Block), SaveJsonContext.Default.AccessorSelection)), SaveJsonContext.Default.AccessorCatalog)!;
            Check(read.Blocks.Select(b => b.Key).SequenceEqual(names) && read.Culture == "en-US", "Public accessor complete metadata JSON");
            var publicRequest = new AccessorRequest(Br4Editing.Hash(data), [new(candidate.Block, [candidate.Property.Name], "True")]);
            var publicTicket = JsonSerializer.Deserialize(SaveService.PreviewBlockAccessor(data, JsonSerializer.Serialize(publicRequest, SaveJsonContext.Default.AccessorRequest)), SaveJsonContext.Default.AccessorTicket)!;
            var publicBytes = SaveService.CommitBlockAccessor(data, JsonSerializer.Serialize(new AccessorConfirmation(publicTicket.Token, publicTicket.SourceHash, publicTicket.TargetHash), SaveJsonContext.Default.AccessorConfirmation));
            Check(publicBytes.SequenceEqual(BlockAccessorEditing.Prepare(source, data, publicRequest)) && Br4Editing.Hash(publicBytes) == publicTicket.TargetHash, "Public required JSON/frozen exact file");
            Compare(data, [new(candidate.Block, [candidate.Property.Name], "True")], s => TypeDescriptor.GetProperties(new SaveBlockMetadata<BlockInfo>(BlockAccessorReading.Accessor(s)).GetBlock(candidate.Block))[candidate.Property.Name]!.SetValue(new SaveBlockMetadata<BlockInfo>(BlockAccessorReading.Accessor(s)).GetBlock(candidate.Block), true));
            var copy = source.Data.ToArray();
            foreach (var bad in new[] { new AccessorChange("MissingBlock", ["Field"], "1"), new(names[0], ["Data"], "0"), new(names[0], [], "0") }) Reject(() => BlockAccessorEditing.Prepare(source, data, new(Br4Editing.Hash(data), [bad])));
            Check(source.Data.SequenceEqual(copy), "Accessor invalid request atomicity");
            Console.WriteLine($"PASS accessor scalar {source.GetType().Name}: source descriptor/whole file, checksums, original and atomic rejection; broader property cases follow.");
        }
        foreach (string name in new[] { "B", "B2" })
        {
            var data = Fixture(name);
            Compare(data, [new("Encount", ["Roamer1", "IVs", "[5]"], "99")], s => { var roamer = ((SAV5)s).Encount.Roamer1; var values = roamer.IVs; values[5] = 99; roamer.IVs = values; });
            Compare(data, [new("EntreeForest", ["Slots", "[529]", "Species"], "25"), new("EntreeForest", ["Slots", "[529]", "Move"], "123")], s => { var slots = ((SAV5)s).EntreeForest.Slots; slots[529].Species = 25; slots[529].Move = 123; });
        }
        foreach (string name in new[] { "X", "OR" })
        {
            var data = Fixture(name);
            Compare(data, [new("Encount", ["Radar", "RecordLatest", "Species"], "25"), new("Encount", ["Radar", "RecordLatest", "Count"], "65535")], s => { var radar = (s is SAV6XY xy ? xy.Encount : ((SAV6AO)s).Encount).Radar; var record = radar.RecordLatest; record.Species = 25; record.Count = 65535; radar.RecordLatest = record; });
            Compare(data, [new("ItemInfo", ["SelectItems"], "[1,2,3,4]", "json")], s => ((SAV6)s).ItemInfo.SelectItems = [1, 2, 3, 4]);
        }
        foreach (string name in new[] { "SN", "US" })
        {
            var data = Fixture(name);
            Compare(data, [new("Fashion", ["Wardrobe", "[1447]", "IsOwned"], "True")], s => { var block = ((SAV7)s).Fashion; var items = block.Wardrobe; items[1447].IsOwned = true; block.Wardrobe = items; });
            Compare(data, [new("BattleTree", ["ScoutedTrainers", "[49]", "Poke2", "AbilityIndex"], "-128")], s => { var block = ((SAV7)s).BattleTree; var items = block.ScoutedTrainers; items[49].Poke2.AbilityIndex = -128; block.ScoutedTrainers = items; });
            Compare(data, [new("Daycare", ["Seed"], "340282366920938463463374607431768211455")], s => ((SAV7)s).Daycare.Seed = UInt128.MaxValue);
            Compare(data, [new("BattleTree", ["ScoutedTrainers"], "[{\"ID\":-32768,\"Poke1\":{\"ID\":32767,\"AbilityIndex\":127},\"Poke2\":{\"ID\":123,\"AbilityIndex\":-128}}]", "json")], s => ((SAV7)s).BattleTree.ScoutedTrainers = [new(-32768, new(32767, 127), new(123, -128))]);
        }
        var x = Fixture("X"); var sourceX = Open(x); var immutable = sourceX.Data.ToArray();
        foreach (string name in new[] { "X", "OR", "SN", "US" })
        {
            var data = Fixture(name); var source = Open(data);
            string block = source is SAV6 ? "ItemInfo" : "BattleTree";
            string property = source is SAV6 ? "SelectItems" : "ScoutedTrainers";
            var catalog = BlockAccessorReading.Read(source, Br4Editing.Hash(data), block);
            var field = catalog.Properties.Single(p => p.Path.SequenceEqual(new[] { property }));
            Check(field.StructuredJson is not null, "Collection has a usable complete JSON editor value");
            Compare(data, [new(block, [property], field.StructuredJson!, "json")], s => { if (s is SAV6 six) six.ItemInfo.SelectItems = six.ItemInfo.SelectItems; else { var tree = ((SAV7)s).BattleTree; tree.ScoutedTrainers = tree.ScoutedTrainers; } });
        }
        foreach (byte gender in new byte[] { 0, 1 })
        {
            var source = (SAV6XY)Open(x); source.Gender = gender; var data = source.Write().ToArray();
            var catalog = BlockAccessorReading.Read(Open(data), Br4Editing.Hash(data), "Status");
            var field = catalog.Properties.Single(p => p.Path.SequenceEqual(new[] { "Fashion" }));
            Check(field.StructuredJson is not null && field.StructuredJson.Length > 2, "Abstract runtime fashion has a structured editor");
            Compare(data, [new("Status", ["Fashion"], field.StructuredJson!, "json")], s => { var status = ((SAV6XY)s).Status; status.Fashion = status.Fashion; });
        }
        Compare(x, [new("Played", ["LastSavedDate"], "")], s => ((SAV6)s).Played.LastSavedDate = null);
        Compare(x, [new("Situation", ["X"], "NaN")], s => ((SAV6)s).Situation.X = float.NaN);
        Compare(x, [new("Situation", ["X"], CultureInfo.GetCultureInfo("en-US").NumberFormat.PositiveInfinitySymbol)], s => ((SAV6)s).Situation.X = float.PositiveInfinity);
        foreach (string culture in new[] { "en-US", "zh-CN", "ja-JP" })
        {
            var changed = Open(x); ((SAV6)changed).Situation.X = float.PositiveInfinity; var changedBytes = changed.Write().ToArray(); var parsed = Open(changedBytes);
            var catalog = BlockAccessorReading.Read(parsed, Br4Editing.Hash(changedBytes), "Situation", culture);
            var value = catalog.Properties.Single(p => p.Path.SequenceEqual(new[] { "X" })).Value!;
            var same = BlockAccessorEditing.Prepare(parsed, changedBytes, new(Br4Editing.Hash(changedBytes), [new("Situation", ["X"], value)], culture));
            Check(same.SequenceEqual(changedBytes), "Source display/edit culture roundtrip for nonfinite Single");
        }
        Compare(x, [new("Encount", ["RepelSteps"], "0xFF")], s => { var block = new SaveBlockMetadata<BlockInfo>(BlockAccessorReading.Accessor(s)).GetBlock("Encount"); var property = TypeDescriptor.GetProperties(block)["RepelSteps"]!; property.SetValue(block, new ByteConverter().ConvertFromInvariantString("0xFF")); });
        Compare(Fixture("SN"), [new("Config", ["BattleStyle"], "255")], s => ((SAV7SM)s).Config.BattleStyle = (ConfigSave7.BattleStyleSetting)255);
        Reject(() => BlockAccessorEditing.Prepare(sourceX, x, new(Br4Editing.Hash(x), [new("Encount", ["RepelSteps"], "256")])));
        Reject(() => BlockAccessorEditing.Prepare(sourceX, x, new(Br4Editing.Hash(x), [new("Encount", ["RepelSteps"], "" )])));
        Check(sourceX.Data.SequenceEqual(immutable), "Overflow/empty source converter failure keeps original");
        var request = new AccessorRequest(Br4Editing.Hash(x), [new("Encount", ["RepelSteps"], "123")]);
        var ticket = BlockAccessorSession.Prepare(sourceX, x, request);
        var confirmation = new AccessorConfirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash);
        var frozen = BlockAccessorSession.Commit(x, confirmation);
        Check(frozen.SequenceEqual(BlockAccessorEditing.Prepare(sourceX, x, request)) && Br4Editing.Hash(frozen) == ticket.TargetHash, "Accessor frozen exact output/hash");
        Check(ticket.Results.Length == 1 && ticket.Blocks.Any(b => b.Key == "Encount") && ticket.ChangedOffsets.Length > 0, "Accessor before/result and all raw block diffs");
        Reject(() => BlockAccessorSession.Commit(x, confirmation));
        var first = BlockAccessorSession.Prepare(sourceX, x, request); var second = BlockAccessorSession.Prepare(sourceX, x, request);
        BlockAccessorSession.Discard(first.Token); Reject(() => BlockAccessorSession.Commit(x, new(first.Token, first.SourceHash, first.TargetHash)));
        var stale = x.ToArray(); stale[0] ^= 1; Reject(() => BlockAccessorSession.Commit(stale, new(second.Token, second.SourceHash, second.TargetHash)));
        BlockAccessorSession.Commit(x, new(second.Token, second.SourceHash, second.TargetHash));
        var failed = BlockAccessorSession.Prepare(sourceX, x, request); Reject(() => BlockAccessorSession.Prepare(sourceX, x, request with { Changes = [new("Missing", ["Field"], "0")] }));
        Reject(() => BlockAccessorSession.Commit(x, new(failed.Token, failed.SourceHash, failed.TargetHash)));
        Check(sourceX.Data.SequenceEqual(immutable), "Accessor session keeps original source");
        var jsonFailed = BlockAccessorSession.Prepare(sourceX, x, request); bool missing = false;
        try { SaveService.PreviewBlockAccessor(x, "{}"); } catch (JsonException) { missing = true; }
        Check(missing, "Accessor required JSON rejects missing source/changes");
        Reject(() => BlockAccessorSession.Commit(x, new(jsonFailed.Token, jsonFailed.SourceHash, jsonFailed.TargetHash)));
        Console.WriteLine("PASS accessor nested/array/object/UInt128 cases: ordered memory-backed and detached object propagation, source clamps, whole encrypted/CRC output and invalid numeric rejection; engineering fixtures only.");
    }
}
