// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Raid9EditingTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { bool failed = false; try { action(); } catch (ArgumentException) { failed = true; } Check(failed, "Invalid Raid9 request accepted"); }
    private static void W(Span<byte> span, int offset, uint value) => BinaryPrimitives.WriteUInt32LittleEndian(span[offset..], value);
    private static uint U(ReadOnlySpan<byte> span, int offset) => BinaryPrimitives.ReadUInt32LittleEndian(span[offset..]);
    private static int Offset(string origin, int i) => (origin == "Paldea" ? 16 : origin == "BlueberryAcademy" ? 0xC80 : 0) + i * 32;
    private static SCBlock Block(SAV9SV save, string origin) => save.Blocks.GetBlock(origin == "Paldea" ? 0xCAAC8800u : 0x100B93DAu);
    private static SAV9SV Open(byte[] data) => new(data.ToArray());
    private static byte[] Create(GameVersion version, int revision)
    {
        var s = Open(SvBlockFixtureTests.Create(version, revision));
        foreach (string origin in Raid9Editing.Origins.Where(o => Raid9Editing.Available(s, o)))
        {
            var b = Block(s, origin).Data;
            for (int i = 0; i < Raid9Editing.Region(s, origin).CountAll; i++)
            {
                int p = Offset(origin, i);
                W(b, p, i % 2 == 0 ? 7u : 0); W(b, p + 4, i % 3 == 1 ? 0 : (uint)i + 1);
                W(b, p + 8, (uint)i + 100); W(b, p + 12, (uint)i + 200); W(b, p + 16, (uint)i + 300);
                W(b, p + 20, 0xF0123456); W(b, p + 24, 0xEE000000 + (uint)i); W(b, p + 28, i % 4 == 0 ? 0u : 9);
            }
        }
        var paldea = Block(s, "Paldea").Data;
        BinaryPrimitives.WriteUInt64LittleEndian(paldea, 0x123456789ABCDEF0);
        BinaryPrimitives.WriteUInt64LittleEndian(paldea[8..], 0xFEDCBA9876543210);
        return s.Write().ToArray();
    }
    private static R9Field[] Fields() => [new("IsEnabled", "False"), new("AreaID", "4294967295"), new("LotteryGroup", "0xFFFFFFFF"), new("SpawnPointID", "0"), new("Seed", "0xFFFFFFFe"), new("Unused", "0x80000000"), new("Content", "123"), new("IsClaimedLeaguePoints", "False")];
    internal static void Run()
    {
        Check(SaveService.ApiVersion == 173, "Raid9 product protocol");
        foreach (var version in new[] { GameVersion.SL, GameVersion.VL })
        foreach (int revision in new[] { 0, 1, 2 })
        {
            var input = Create(version, revision); var original = input.ToArray(); var save = Open(input); string hash = Br4Editing.Hash(input);
            var catalog = Raid9Editing.Read(save, hash);
            var json = JsonSerializer.Serialize(catalog, SaveJsonContext.Default.R9Catalog);
            var decoded = JsonSerializer.Deserialize(json, SaveJsonContext.Default.R9Catalog)!;
            Check(decoded.Regions[0].Entries.Length == 72 && decoded.Regions[0].Entries[0] == catalog.Regions[0].Entries[0] && json.Contains("\"areaID\":"), "Generated raid schema uses verified acronym casing");
            Check(catalog.CanEdit && catalog.Regions.Select(r => r.CountUsed).SequenceEqual(new[] { 72, 100, 80 }), "Exact source legal counts");
            Check(catalog.Regions[0].HasSeeds && !catalog.Regions[1].HasSeeds && !catalog.Regions[2].HasSeeds && catalog.Regions[1].Available == (revision > 0), "Real DLC availability and seed controls");
            var output = Raid9Editing.Prepare(save, new(hash, []), hash, input.Length, out _);
            Check(output.SequenceEqual(input), "Unchanged source noncanonical booleans and unknown enum survive");
            foreach (string origin in Raid9Editing.Origins.Where(o => Raid9Editing.Available(save, o)))
            {
                foreach (string culture in new[] { "zh-CN", "en-US", "ja-JP" })
                {
                    var expected = Open(input); var b = Block(expected, origin).Data; int p = Offset(origin, 0);
                    W(b, p, 0); W(b, p + 4, uint.MaxValue); W(b, p + 8, uint.MaxValue); W(b, p + 12, 0);
                    W(b, p + 16, 0xFFFFFFFE); W(b, p + 20, 0x80000000); W(b, p + 24, 123); W(b, p + 28, 0);
                    output = Raid9Editing.Prepare(save, new(hash, [new("fields", origin, 0, Fields())], culture), hash, input.Length, out var ignored);
                    Check(ignored.Length == 0 && output.SequenceEqual(expected.Write().ToArray()), "Independent eight-field full-file oracle/culture");
                    var entry = Raid9Editing.Entry(Open(output), origin, 0);
                    Check(entry.ScenePointName == "Raid_Point_4294967295_4294967295_0" && entry.ContentRaw == 123, "Read-only derived scene and unknown enum value");
                }
                foreach (bool seedToo in new[] { false, true })
                {
                    var expected = Open(input); var b = Block(expected, origin).Data; int src = Offset(origin, 0);
                    var values = new[] { U(b, src) != 0 ? 1u : 0, U(b, src + 24), U(b, src + 28) != 0 ? 1u : 0, U(b, src + 16) };
                    for (int i = 0; i < Raid9Editing.Region(save, origin).CountUsed; i++)
                    {
                        int p = Offset(origin, i); if (U(b, p + 4) == 0) continue;
                        W(b, p, values[0]); W(b, p + 24, values[1]); W(b, p + 28, values[2]); if (seedToo) W(b, p + 16, values[3]);
                    }
                    output = Raid9Editing.Prepare(save, new(hash, [new("propagate", origin, 0, SeedToo: seedToo)]), hash, input.Length, out _);
                    Check(output.SequenceEqual(expected.Write().ToArray()), "Propagation skip holes, self normalization, optional Seed, protected position/unused/header/other-region/blueberry tail");
                }
                int count = Raid9Editing.Region(save, origin).CountUsed;
                Reject(() => Raid9Editing.Prepare(save, new(hash, [new("fields", origin, count, [new("AreaID", "1")])]), hash, input.Length, out _));
                Reject(() => Raid9Editing.Prepare(save, new(hash, [new("fields", origin, 0, [new("ScenePointName", "test")])]), hash, input.Length, out _));
                Reject(() => Raid9Editing.Prepare(save, new(hash, [new("fields", origin, 0, [new("AreaID", "4294967296")])]), hash, input.Length, out _));
                Reject(() => Raid9Editing.Prepare(save, new(hash, [new("fields", origin, 0, [new("Seed", new string('1', 32768))])]), hash, input.Length, out _));
                var expectedSeed = Open(input); W(Block(expectedSeed, origin).Data, Offset(origin, 0) + 16, 0);
                output = Raid9Editing.Prepare(save, new(hash, [new("fields", origin, 0, [new("Seed", "invalid")])]), hash, input.Length, out _);
                Check(output.SequenceEqual(expectedSeed.Write().ToArray()), "Property seed invalid resets to zero through source converter");
            }
            var seeds = new R9Edit(hash, [new("seeds", "Paldea", Today: "FFFFFFFFFFFFFFFF", Tomorrow: "0x1")]);
            var expectedSeeds = Open(input); BinaryPrimitives.WriteUInt64LittleEndian(Block(expectedSeeds, "Paldea").Data, ulong.MaxValue);
            output = Raid9Editing.Prepare(save, seeds, hash, input.Length, out var ignoredSeeds);
            Check(output.SequenceEqual(expectedSeeds.Write().ToArray()) && ignoredSeeds.SequenceEqual(new[] { "Paldea:TomorrowSeed" }), "Validated region seeds have distinct Undo/retain semantics");
            Reject(() => Raid9Editing.Prepare(save, new(hash, [new("seeds", "Paldea", Today: new string('F', 17))]), hash, input.Length, out _));
            Reject(() => Raid9Editing.Prepare(save, new(hash, [new("seeds", "Kitakami", Today: "1")]), hash, input.Length, out _));
            var t = Raid9Session.Prepare(save, seeds, input); var c = new R9Confirmation(t.Token, t.SourceHash, t.TargetHash);
            var ticketJson = JsonSerializer.Serialize(t, SaveJsonContext.Default.R9Ticket);
            var decodedTicket = JsonSerializer.Deserialize(ticketJson, SaveJsonContext.Default.R9Ticket)!;
            Check(decodedTicket.Blocks.Length == 1 && decodedTicket.TargetHash == decodedTicket.Result.SourceHash, "Complete frozen JSON schema");
            Check(t.Entries.Length == 0 && t.Blocks.Length == 1 && t.ChangedOffsets.Length > 0, "Header-only frozen changes");
            Check(Raid9Session.Commit(input, c).SequenceEqual(output), "Frozen output commit"); Reject(() => Raid9Session.Commit(input, c));
            t = Raid9Session.Prepare(save, seeds, input); c = new(t.Token, t.SourceHash, t.TargetHash);
            Reject(() => Raid9Session.Prepare(save, new(hash, [new("fields", "Paldea", 0, [new("AreaID", "1")]), new("fields", "Paldea", 0, [new("AreaID", "invalid")])]), input));
            Reject(() => Raid9Session.Commit(input, c));
            t = Raid9Session.Prepare(save, seeds, input); c = new(t.Token, t.SourceHash, t.TargetHash); Raid9Session.Discard(t.Token); Reject(() => Raid9Session.Commit(input, c));
            t = Raid9Session.Prepare(save, seeds, input); c = new(t.Token, t.SourceHash, t.TargetHash);
            Reject(() => SaveService.PreviewRaid9([], JsonSerializer.Serialize(seeds, SaveJsonContext.Default.R9Edit))); Reject(() => Raid9Session.Commit(input, c));
            t = Raid9Session.Prepare(save, seeds, input); var replaced = new R9Confirmation(t.Token, t.SourceHash, t.TargetHash);
            t = Raid9Session.Prepare(save, new(hash, []), input); c = new(t.Token, t.SourceHash, t.TargetHash);
            Reject(() => Raid9Session.Commit(input, replaced)); var stale = input.ToArray(); stale[^1] ^= 1; Reject(() => Raid9Session.Commit(stale, c));
            Check(Raid9Session.Commit(input, c).SequenceEqual(input), "Replaced/stale confirmation leaves current frozen output intact");
            Check(input.SequenceEqual(original) && save.Write().Span.SequenceEqual(original), "Source and original survive all operations and rejections");
            Console.WriteLine($"PASS Raid9 {version}/revision {revision}: three real regions/counts/slices, every property and culture, both seed semantics, propagation/holes/tails, derived read-only value, independent full-file oracle and frozen rejection/original");
        }
    }
}
