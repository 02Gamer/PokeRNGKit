// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class SevenStar9EditingTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { bool failed = false; try { action(); } catch (ArgumentException) { failed = true; } Check(failed, "Invalid SevenStar9 request accepted"); }
    private static SAV9SV Open(byte[] data) => new(data.ToArray());
    private static SCBlock Block(SAV9SV s, uint key) => s.Blocks.GetBlock(key);
    private static void W(Span<byte> data, int offset, uint value) => BinaryPrimitives.WriteUInt32LittleEndian(data[offset..], value);
    private static byte[] Create(GameVersion version, int revision, bool newer, int? defeatedRows = null)
    {
        var source = Open(SvBlockFixtureTests.Create(version, revision));
        var capture = new byte[Block(source, SevenStar9Editing.CaptureKey).Data.Length + 3];
        capture.AsSpan().Fill(0xA7);
        int count = capture.Length / 8;
        for (int i = 0; i < count; i++)
        {
            W(capture, i * 8, 0x80000000u + (uint)i);
            capture[i * 8 + 4] = 2; capture[i * 8 + 5] = 2;
        }
        var defeated = new byte[4 + (defeatedRows ?? count) * 8 + 3];
        defeated.AsSpan().Fill(0xB9);
        for (int i = 0; i < (defeatedRows ?? count); i++)
        { W(defeated, 4 + i * 8, 0x90000000u + (uint)i); defeated[4 + i * 8 + 4] = 2; }
        var blocks = source.AllBlocks.Where(b => newer || b.Key != SevenStar9Editing.DefeatedKey).Select(b =>
            b.Key == SevenStar9Editing.CaptureKey ? SwshBlockFixtureTests.Typed(b.Key, capture, SCTypeCode.Object) :
            b.Key == SevenStar9Editing.DefeatedKey ? SwshBlockFixtureTests.Typed(b.Key, defeated, SCTypeCode.Object) : b.Clone()).ToArray();
        return SwishCrypto.Encrypt(blocks);
    }
    public static void Run()
    {
        Check(SaveService.ApiVersion == 156, "SevenStar9 product protocol");
        foreach (var version in new[] { GameVersion.SL, GameVersion.VL })
        for (int revision = 0; revision <= 2; revision++)
        foreach (bool newer in new[] { false, true })
        {
            var input = Create(version, revision, newer); var original = input.ToArray(); var save = Open(input); string hash = Br4Editing.Hash(input);
            var page = SevenStar9Editing.Read(save, hash, new());
            Check(page.CanEdit && page.Count == 3000 && page.Total == 3000 && page.Entries.Length == 50 && page.HasDefeatedBlock == newer, "All source physical rows with bounded page and real defeated availability");
            Check(!page.Entries[0].Captured && page.Entries[0].Defeated == false && page.Entries[0].DefeatedIdentifier == (newer ? 0x90000000u : null), "Bool exactly equals one and independent loaded identifiers");
            var last = SevenStar9Editing.Read(save, hash, new(2990, 50));
            Check(last.Entries.Length == 10 && last.Entries[^1].Index == 2999, "Last physical record is accessible");
            var filtered = SevenStar9Editing.Read(save, hash, new(0, 50, (0x80000000u + 2999).ToString()));
            Check(filtered.Total == 1 && filtered.Entries[0].Index == 2999, "Identifier search scans all physical rows");
            var json = JsonSerializer.Serialize(page, SaveJsonContext.Default.R7Page);
            Check(JsonSerializer.Deserialize(json, SaveJsonContext.Default.R7Page)!.Entries[0] == page.Entries[0], "Generated paged JSON schema");
            Check(SevenStar9Editing.Prepare(save, new(hash, []), hash, input.Length).SequenceEqual(input), "No-op preserves noncanonical flags, identifiers and all tails");
            foreach (string culture in new[] { "zh-CN", "en-US", "ja-JP" })
            foreach (int index in new[] { 0, 2999 })
            {
                var edit = new R7Edit(hash, [new(index, [new("Identifier", "0xFFFFFFFF"), new("Captured", "True"), new("Defeated", "True")])], culture, new(2990, 50));
                var expected = Open(input); var c = Block(expected, SevenStar9Editing.CaptureKey).Data;
                W(c, index * 8, uint.MaxValue); c[index * 8 + 4] = 1;
                if (newer) { var d = Block(expected, SevenStar9Editing.DefeatedKey).Data; W(d, 4 + index * 8, uint.MaxValue); d[4 + index * 8 + 4] = 1; }
                else c[index * 8 + 5] = 1;
                var output = SevenStar9Editing.Prepare(save, edit, hash, input.Length);
                Check(output.SequenceEqual(expected.Write().ToArray()), "Independent full-file three-property oracle, both layouts, culture and boundary rows");
                var result = SevenStar9Editing.Entry(Open(output), index);
                Check(result.Identifier == uint.MaxValue && result.Captured && result.Defeated == true, "Core property readback");
            }
            foreach (string value in new[] { "", "-1", "4294967296", "invalid" })
                Reject(() => SevenStar9Editing.Prepare(save, new(hash, [new(0, [new("Identifier", value)])]), hash, input.Length));
            foreach (var (text, number) in new[] { ("0", 0u), ("4294967295", uint.MaxValue) })
            {
                var expectedNumber = Open(input); W(Block(expectedNumber, SevenStar9Editing.CaptureKey).Data, 0, number);
                if (newer) W(Block(expectedNumber, SevenStar9Editing.DefeatedKey).Data, 4, number);
                var numberOutput = SevenStar9Editing.Prepare(save, new(hash, [new(0, [new("Identifier", text)])]), hash, input.Length);
                Check(numberOutput.SequenceEqual(expectedNumber.Write().ToArray()), "Decimal UInt32 endpoints and identifier-only dual write preserve all flags");
            }
            Reject(() => SevenStar9Editing.Prepare(save, new(hash, [], "invalid"), hash, input.Length));
            Reject(() => SevenStar9Editing.Prepare(save, new(hash, [new(0, [new("Seed", "1")])]), hash, input.Length));
            Reject(() => SevenStar9Editing.Prepare(save, new(hash, [new(3000, [new("Captured", "True")])]), hash, input.Length));
            Reject(() => SevenStar9Editing.Prepare(save, new(hash, [new(0, [new("Identifier", new string('1', 32768))])]), hash, input.Length));
            Reject(() => SevenStar9Editing.Prepare(save, new(hash, [new(0, [new("Captured", "True"), new("Captured", "False")])]), hash, input.Length));
            Reject(() => SevenStar9Editing.Read(save, hash, new(-1)));
            Reject(() => SevenStar9Editing.Read(save, hash, new(0, 201)));
            var ordered = new R7Edit(hash, [new(0, [new("Captured", "True")]), new(0, [new("Captured", "False")])]);
            var expectedOrdered = Open(input); Block(expectedOrdered, SevenStar9Editing.CaptureKey).Data[4] = 0;
            var ticket = SevenStar9Session.Prepare(save, ordered, input); var confirmation = new R7Confirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            var ticketJson = JsonSerializer.Serialize(ticket, SaveJsonContext.Default.R7Ticket);
            var decoded = JsonSerializer.Deserialize(ticketJson, SaveJsonContext.Default.R7Ticket)!;
            Check(decoded.Entries.Length == 1 && decoded.Blocks.Length == 1 && decoded.Result.SourceHash == decoded.TargetHash && decoded.ChangedOffsets.Length > 0, "Ordered edits and frozen complete JSON differences");
            Check(SevenStar9Session.Commit(input, confirmation).SequenceEqual(expectedOrdered.Write().ToArray()), "Commit uses frozen output exactly once");
            Reject(() => SevenStar9Session.Commit(input, confirmation));
            ticket = SevenStar9Session.Prepare(save, ordered, input); confirmation = new(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            Reject(() => SevenStar9Session.Prepare(save, new(hash, [new(0, [new("Captured", "True")]), new(0, [new("Identifier", "invalid")])]), input));
            Reject(() => SevenStar9Session.Commit(input, confirmation));
            ticket = SevenStar9Session.Prepare(save, ordered, input); confirmation = new(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            SevenStar9Session.Discard(ticket.Token); Reject(() => SevenStar9Session.Commit(input, confirmation));
            ticket = SevenStar9Session.Prepare(save, ordered, input); confirmation = new(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            Reject(() => SaveService.PreviewSevenStar9([], JsonSerializer.Serialize(ordered, SaveJsonContext.Default.R7Edit))); Reject(() => SevenStar9Session.Commit(input, confirmation));
            ticket = SevenStar9Session.Prepare(save, ordered, input); var replaced = new R7Confirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            ticket = SevenStar9Session.Prepare(save, new(hash, []), input); confirmation = new(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            Reject(() => SevenStar9Session.Commit(input, replaced)); var stale = input.ToArray(); stale[^1] ^= 1;
            Reject(() => SevenStar9Session.Commit(stale, confirmation)); Check(SevenStar9Session.Commit(input, confirmation).SequenceEqual(input), "Stale/replaced confirmation cannot consume current frozen output");
            Check(input.SequenceEqual(original) && save.Write().Span.SequenceEqual(original), "Original and parsed source preserved through all operations");
            Console.WriteLine($"PASS SevenStar9 {version}/revision {revision}/newer={newer}: 3000 physical rows/paging/search, both layouts/all fields/cultures, independent full-file oracle, noncanonical flags/tails/header, ordered frozen output and atomic rejection");
        }
        var partialInput = Create(GameVersion.SL, 0, true, 1); var partial = Open(partialInput); string partialHash = Br4Editing.Hash(partialInput);
        var partialPage = SevenStar9Editing.Read(partial, partialHash, new());
        Check(partialPage.CanEdit && partialPage.Entries[0].CanEdit && !partialPage.Entries[1].CanEdit && partialPage.Entries[1].Defeated is null, "Incomplete paired rows remain readable and explicitly uneditable");
        Reject(() => SevenStar9Editing.Prepare(partial, new(partialHash, [new(1, [new("Captured", "True")])]), partialHash, partialInput.Length));
        var emptyInput = Create(GameVersion.SL, 0, true, 0); var empty = Open(emptyInput);
        Check(!SevenStar9Editing.Read(empty, Br4Editing.Hash(emptyInput), new()).CanEdit, "Present but empty defeat block does not fall back or invent paired rows");
    }
}
