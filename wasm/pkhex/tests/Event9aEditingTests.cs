// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class Event9aEditingTests
{
    private static void Check(bool condition, string text) { if (!condition) throw new Exception(text); }
    private static void Reject(Action action)
    {
        bool failed = false;
        try { action(); } catch (ArgumentException) { failed = true; }
        Check(failed, "Invalid Event9a operation accepted");
    }
    private static SAV9ZA Open(byte[] bytes) => new(bytes.ToArray());
    private static void U64(Span<byte> row, int offset, ulong value) => BinaryPrimitives.WriteUInt64LittleEndian(row[offset..], value);
    private static ulong U64(ReadOnlySpan<byte> row, int offset) => BinaryPrimitives.ReadUInt64LittleEndian(row[offset..]);
    private static bool Empty(ReadOnlySpan<byte> row, int keys)
    {
        for (int k = 0; k < keys; k++) if (U64(row, k * 8) != FnvHash.HashEmpty) return false;
        return true;
    }
    private static void Compress(Span<byte> block, Event9aEditing.Definition d)
    {
        int write = 0;
        for (int read = 0; read < block.Length / d.Size; read++)
        {
            var row = block.Slice(read * d.Size, d.Size);
            if (Empty(row, d.KeyCount)) continue;
            if (write != read)
            {
                row.CopyTo(block.Slice(write * d.Size, d.Size));
                for (int k = 0; k < d.KeyCount; k++) U64(row, k * 8, FnvHash.HashEmpty);
                U64(row, d.KeyCount * 8, 0);
            }
            write++;
        }
    }
    private static byte[] Create(int revision)
    {
        var save = Open(ZaBlockFixtureTests.Create(revision));
        foreach (var d in Event9aEditing.Definitions)
        {
            var raw = save.Blocks.GetBlock(d.Key).Data;
            int count = raw.Length / d.Size; Check(count > 3, "Event9a full physical source storage");
            for (int i = 0; i < count; i++)
            {
                var row = raw.Slice(i * d.Size, d.Size);
                for (int k = 0; k < d.KeyCount; k++) U64(row, k * 8, FnvHash.HashEmpty);
                U64(row, d.KeyCount * 8, 0);
            }
            foreach (int i in new[] { 0, 2, count - 1 })
            {
                var row = raw.Slice(i * d.Size, d.Size);
                for (int k = 0; k < d.KeyCount; k++) U64(row, k * 8, (ulong)(0x11 + i + k));
                if (d.Kind == "tuple") U64(row, 8, unchecked((ulong)-7L));
                U64(row, d.KeyCount * 8, d.Kind == "bool" ? 7UL : (ulong)(17 + i));
            }
        }
        return save.Write().ToArray();
    }
    private static byte[] Oracle(byte[] input, bool patch)
    {
        var s = Open(input);
        foreach (var d in Event9aEditing.Definitions)
        {
            var block = s.Blocks.GetBlock(d.Key).Data;
            for (int i = 0; i < block.Length / d.Size; i++)
            {
                var row = block.Slice(i * d.Size, d.Size);
                if (d.Kind == "bool") U64(row, d.KeyCount * 8, U64(row, d.KeyCount * 8) != 0 ? 1UL : 0UL);
            }
            if (patch)
            {
                var row = block.Slice(2 * d.Size, d.Size);
                string name = "  New_" + d.Id + "  ";
                U64(row, 0, FnvHash.HashFnv1a_64(d.KeyCount == 1 ? name.Trim() : name));
                if (d.KeyCount > 1) U64(row, 8, d.Kind == "tuple" ? 0x8000000000000000 : FnvHash.HashFnv1a_64("Second"));
                if (d.KeyCount > 2) U64(row, 16, ulong.MaxValue);
                U64(row, d.KeyCount * 8, d.Kind == "bool" ? 0 : ulong.MaxValue);
            }
            Compress(block, d);
        }
        return s.Write().ToArray();
    }
    private static Ew9aConfirmation Confirmation(Ew9aTicket t) => new(t.Token, t.SourceHash, t.TargetHash, t.NamesHash);
    public static void Run()
    {
        var names = new Event9aEditing.Names("0000000000000011\tKnown\r\n0000000000000011\tIgnored\ninvalid\tIgnored\n");
        Check(names.Name(0x11) == "Known" && names.Hash("Known") == 0x11 && names.Hash("FF") == 255 && names.Hash("") == FnvHash.HashEmpty, "Source custom lookup precedence and empty sentinel");
        Reject(() => new Event9aEditing.Names("11\tSame\n22\tSame"));
        for (int revision = 0; revision < 3; revision++)
        {
            var input = Create(revision); var original = input.ToArray(); string hash = Br4Editing.Hash(input);
            var c = Event9aEditing.Read(Open(input), hash, "");
            Check(c.CanEdit && c.Groups.Length == 15 && c.Groups.All(g => g.Rows.Length == g.Count && g.Used == 1), "All fifteen groups and every physical slot, including beyond first hole");
            Check(c.Groups.Where(g => g.Kind == "tuple").All(g => g.Rows[0].Keys[1] == "-7"), "Signed second keys preserve bit patterns");
            var lastPage = Event9aEditing.Page(Open(input), hash, new("", "Flags", "", c.Groups[0].Count - 1));
            Check(lastPage.Total == c.Groups[0].Count && lastPage.Rows.Single().Index == c.Groups[0].Count - 1 && lastPage.Groups.All(g => g.Rows.Length == 0), "Paged transport preserves all physical addresses with metadata for every group");
            var filtered = Event9aEditing.Page(Open(input), hash, new("11\tKnown", "Flags", "kNoWn"));
            Check(filtered.Total == 1 && filtered.Rows.Single().Index == 0, "Source ordinal-ignore-case name filtering");
            var tupleFilter = Event9aEditing.Page(Open(input), hash, new("", "Report", "-7"));
            Check(tupleFilter.Total == 0, "Tuple search uses key A only, not signed key B");
            Reject(() => Event9aEditing.Page(Open(input), hash, new("", "Flags", "", Limit: 201)));
            var changes = Event9aEditing.Definitions.Select(d => new Ew9aRowChange(d.Id, 2,
                d.Kind == "tuple" ? ["  New_" + d.Id + "  ", long.MinValue.ToString()] :
                d.KeyCount == 2 ? ["  New_" + d.Id + "  ", "Second"] :
                d.KeyCount == 3 ? ["  New_" + d.Id + "  ", "Second", "FFFFFFFFFFFFFFFF"] : ["  New_" + d.Id + "  "],
                d.Kind == "bool" ? "False" : "+18446744073709551615")).ToArray();
            var result = Event9aEditing.Prepare(Open(input), new(hash, "", changes), hash, input.Length, out var ignored);
            Check(ignored.Length == 0 && result.SequenceEqual(Oracle(input, true)) && input.SequenceEqual(original), "Every key layout, limits, trimming, bool normalization, source compression, raw whole-file oracle and immutable original");
            var resave = Event9aEditing.Prepare(Open(input), new(hash, "", []), hash, input.Length, out _);
            Check(resave.SequenceEqual(Oracle(input, false)), "Entire window resave includes unedited groups and late physical entries");
            var badValues = Event9aEditing.Prepare(Open(input), new(hash, "", [new("Report", 0, ["0000000000000011", "bad"], "bad")]), hash, input.Length, out ignored);
            Check(ignored.Length == 2 && badValues.SequenceEqual(resave), "Validation restores loaded values before source Save");
            string longNames = "12\t" + new string('n', 32768);
            var partialKeys = Event9aEditing.Prepare(Open(input), new(hash, longNames, [new("Spawner4", 0, ["New_Key", null])]), hash, input.Length, out _);
            var partialExpected = Open(resave); U64(partialExpected.Blocks.GetBlock(0xD1A3FF7B).Data, 0, FnvHash.HashFnv1a_64("New_Key"));
            Check(partialKeys.SequenceEqual(partialExpected.Write().ToArray()), "Partial key changes preserve long preloaded custom names in other cells");
            foreach (var bad in new[] { new Ew9aEdit("bad", "", []), new(hash, "", [new("Missing", 0)]), new(hash, "", [new("Flags", c.Groups[0].Count)]), new(hash, "", [new("Flags", 0), new("Flags", 0)]), new(hash, "", [new("Flags", 0, [])]), new(hash, "", [new("Flags", 0, Value: "bad")]) })
                Reject(() => Event9aEditing.Prepare(Open(input), bad, hash, input.Length, out _));
            var t = Event9aSession.Prepare(Open(input), new(hash, "", changes), hash, input.Length);
            Check(t.Rows.Length > 15 && t.Blocks.Length == 15 && t.ChangedOffsets.Length > 0, "Frozen preview covers whole-window normalization and compaction");
            var confirmation = Confirmation(t); var altered = input.ToArray(); altered[0] ^= 1;
            Reject(() => Event9aSession.Commit(altered, confirmation));
            Reject(() => Event9aSession.Commit(input, confirmation with { NamesHash = "bad" }));
            var committed = Event9aSession.Commit(input, confirmation);
            Check(committed.SequenceEqual(result) && Br4Editing.Hash(committed) == t.TargetHash, "Confirmation commits cached bytes once");
            Reject(() => Event9aSession.Commit(input, confirmation));
            var first = Event9aSession.Prepare(Open(input), new(hash, "", []), hash, input.Length);
            var second = Event9aSession.Prepare(Open(input), new(hash, "", changes), hash, input.Length);
            Reject(() => Event9aSession.Commit(input, Confirmation(first)));
            Event9aSession.Discard(first.Token); Check(Event9aSession.Commit(input, Confirmation(second)).SequenceEqual(result), "Old cancellation preserves current plan");
            var failed = Event9aSession.Prepare(Open(input), new(hash, "", []), hash, input.Length);
            Reject(() => Event9aSession.Prepare(Open(input), new("bad", "", []), hash, input.Length));
            Reject(() => Event9aSession.Commit(input, Confirmation(failed)));
            var failedOpen = Event9aSession.Prepare(Open(input), new(hash, "", []), hash, input.Length);
            Reject(() => SaveService.PreviewEvent9a([1, 2, 3], "{}"));
            Reject(() => Event9aSession.Commit(input, Confirmation(failedOpen)));
            var removed = Open(input); var flags = removed.Blocks.GetBlock(0xED6F46E7).Data;
            U64(flags, 0, FnvHash.HashEmpty); U64(flags, 8, 0);
            var diff = Event9aEditing.Compare(Open(input), removed, hash, "updated", "");
            Check(diff.Rows.Any(r => r.Group == "Flags" && r.Index == 0) && diff.SourceReport.SequenceEqual(new[] { "No differences found." }), "Physical comparison exposes source deletion-loop omission");
            var shortened = Open(input); var blocks = shortened.AllBlocks.Select(b => b.Key == 0xED6F46E7 ? SwshBlockFixtureTests.Typed(b.Key, b.Data[..16].ToArray(), SCTypeCode.Object, SCTypeCode.None) : b.Clone()).ToArray();
            var shorter = Open(SwishCrypto.Encrypt(blocks));
            var mismatch = Event9aEditing.Compare(Open(input), shorter, hash, "shorter", "");
            Check(mismatch.SourceReportError is not null && mismatch.Rows.Any(r => r.Group == "Flags" && r.After is null), "Different physical counts keep full diff even when source loop fails");
            var metadata = Open(input).AllBlocks.Select(b => b.Key == 0xED6F46E7 ? SwshBlockFixtureTests.Typed(b.Key, b.Data.ToArray(), SCTypeCode.Array, SCTypeCode.Byte) : b.Clone()).ToArray();
            var metadataDiff = Event9aEditing.Compare(Open(input), Open(SwishCrypto.Encrypt(metadata)), hash, "metadata", "");
            Check(metadataDiff.Rows.Length == 0 && metadataDiff.Blocks.Single().AfterType == "Array" && metadataDiff.Blocks.Single().AfterSubtype == "Byte", "Block comparison includes metadata-only changes");
            var tailBlocks = Open(input).AllBlocks.Select(b => b.Key == 0xED6F46E7 ? SwshBlockFixtureTests.Typed(b.Key, b.Data.ToArray().Concat(Enumerable.Repeat((byte)0xA7, 8)).ToArray(), SCTypeCode.Object, SCTypeCode.None) : b.Clone()).ToArray();
            var tailBytes = SwishCrypto.Encrypt(tailBlocks); var tail = Open(tailBytes);
            var tailDiff = Event9aEditing.Compare(Open(input), tail, hash, "tail", "");
            Check(tailDiff.Rows.Length == 0 && tailDiff.Blocks.Single().After.Length == tailDiff.Blocks.Single().Before.Length + 16, "Block comparison exposes bytes outside full physical records");
            var tailOutput = Event9aEditing.Prepare(tail, new(Br4Editing.Hash(tailBytes), "", []), Br4Editing.Hash(tailBytes), tailBytes.Length, out _);
            Check(Open(tailOutput).Blocks.GetBlock(0xED6F46E7).Data[^8..].ToArray().All(v => v == 0xA7), "Source resave preserves incomplete trailing bytes");
            Check(input.SequenceEqual(original), "All preview, rejected and comparison operations preserve original");
            Console.WriteLine($"PASS Event9a revision {revision}: all fifteen groups/full physical slots, key layouts, signed/unsigned boundaries, name precedence, source validation/normalization/compression, raw complete-file oracle, frozen sessions and source/full comparison; typed synthetic only");
        }
    }
}
