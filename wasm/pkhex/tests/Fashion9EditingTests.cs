// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class Fashion9EditingTests
{
    private static void Check(bool condition, string text) { if (!condition) throw new Exception(text); }
    private static void Reject(Action action)
    {
        bool rejected = false; try { action(); } catch (ArgumentException) { rejected = true; }
        Check(rejected, "Invalid Fashion9 request accepted");
    }
    private static uint Read(ReadOnlySpan<byte> data, int offset) => BinaryPrimitives.ReadUInt32LittleEndian(data[offset..]);
    private static void Write(Span<byte> data, int offset, uint value) => BinaryPrimitives.WriteUInt32LittleEndian(data[offset..], value);
    private static SaveFile Open(bool za, byte[] data) => za ? new SAV9ZA(data.ToArray()) : new SAV9SV(data.ToArray());
    private static byte[] Seed(bool za, GameVersion version, int revision)
    {
        var save = Open(za, za ? ZaBlockFixtureTests.Create(revision) : SvBlockFixtureTests.Create(version, revision));
        foreach (var d in Fashion9Editing.Definitions(save))
        {
            var raw = Fashion9Editing.Blocks(save).Accessor.GetBlock(d.Key).Data;
            Check(raw.Length / 8 > 2, "Full physical fashion block fixture");
            for (int i = 0; i < raw.Length / 8; i++)
            {
                Write(raw, i * 8, i == 1 ? 65535u : (uint)(i + 1));
                Write(raw, i * 8 + 4, i == 1 ? 0xB6B60000 : 0xA5A5000F);
            }
        }
        return save.Write().ToArray();
    }
    internal static void Run()
    {
        Check(SaveService.ApiVersion == 179, "Fashion9 product protocol");
        foreach (var version in new[] { GameVersion.SL, GameVersion.VL, GameVersion.ZA })
        foreach (int revision in new[] { 0, 1, 2 })
        {
            bool za = version == GameVersion.ZA; var input = Seed(za, version, revision); var original = input.ToArray();
            var save = Open(za, input); var hash = Br4Editing.Hash(input); var definitions = Fashion9Editing.Definitions(save);
            var catalog = Fashion9Editing.Read(save, hash);
            Check(catalog.CanEdit && catalog.CanOwn == za && catalog.Groups.Length == (za ? 25 : 8), "Fashion source groups");
            var expected = Open(za, input); var operations = new List<F9Operation>();
            foreach (var d in definitions)
            {
                var block = Fashion9Editing.Blocks(expected).Accessor.GetBlock(d.Key).Data;
                int last = block.Length / 8 - 1;
                F9RowChange end = d.Kind == "za" ? new(last, "4294967295", false, false, false, false, false) : new(last, "4294967295", false);
                operations.Add(new("rows", d.Id, [new(0, "invalid"), end]));
                Write(block, 0, 65535); Write(block, last * 8, uint.MaxValue);
                Write(block, last * 8 + 4, Read(block, last * 8 + 4) & ~(d.Kind == "za" ? 31u : 1u));
            }
            var edit = new F9Edit(hash, operations.ToArray());
            var output = Fashion9Editing.Prepare(save, edit, hash, input.Length, out var reset);
            Check(reset.Length == definitions.Length && output.SequenceEqual(expected.Write().ToArray()), "Independent full-file row/UInt32/None/flags oracle");
            Check(input.SequenceEqual(original) && save.Write().Span.SequenceEqual(original), "Original preserved");
            var first = definitions[0]; int count = catalog.Groups[0].Count;
            var page = Fashion9Editing.Page(save, hash, new(first.Id, "", count - 1, 1));
            Check(page.Limit == 1 && page.Rows.Length == 1 && page.Rows[0].Index == count - 1 && page.Groups.All(g => g.Rows.Length == 0), "Bounded last physical row and metadata catalog");
            var pageJson = JsonSerializer.Serialize(page, SaveJsonContext.Default.F9Page);
            var decodedPage = JsonSerializer.Deserialize(pageJson, SaveJsonContext.Default.F9Page)!;
            Check(decodedPage.Limit == 1 && decodedPage.Rows[0] == page.Rows[0] && decodedPage.Groups.Length == definitions.Length && pageJson.Contains("\"limit\":1"), "Generated page schema/camel-case/nullable flags");
            var editJson = JsonSerializer.Serialize(edit, SaveJsonContext.Default.F9Edit);
            var decodedEdit = JsonSerializer.Deserialize(editJson, SaveJsonContext.Default.F9Edit)!;
            Check(decodedEdit.SourceHash == hash && decodedEdit.Operations.Length == operations.Count && decodedEdit.Operations[0].Changes![1].Value == "4294967295", "Generated ordered request schema");
            Reject(() => Fashion9Editing.Page(save, hash, new(first.Id, "", count + 1)));
            Reject(() => Fashion9Editing.Page(save, hash, new(first.Id, "", 0, 201)));
            Reject(() => Fashion9Editing.Prepare(save, new(hash, [new("rows", first.Id, [new(count, "1")])]), hash, input.Length, out _));
            Reject(() => Fashion9Editing.Prepare(save, new(hash, [new("rows", first.Id, [new(0, new string('1', 32768))])]), hash, input.Length, out _));
            if (!za) Reject(() => Fashion9Editing.Prepare(save, new(hash, [new("rows", first.Id, [new(0, IsOwned: false)])]), hash, input.Length, out _));
            Reject(() => Fashion9Editing.Prepare(save, new(hash, [new("import", first.Id, Data: "00")]), hash, input.Length, out _));
            Reject(() => Fashion9Editing.Prepare(save, new(hash, [new("resave", first.Id, Owned: true)]), hash, input.Length, out _));
            // Import reloads the grid, discarding preceding cell edits for this block.
            var imported = Enumerable.Repeat((byte)0xA8, catalog.Groups[0].Bytes).ToArray();
            var importOps = new List<F9Operation> { new("rows", first.Id, [new(0, "1")]), new("import", first.Id, Data: Convert.ToHexString(imported)), new("rows", first.Id, [new(0, IsNew: true)]) };
            if (za) importOps.Add(new("owned", first.Id, Owned: false, All: false));
            expected = Open(za, input); var target = Fashion9Editing.Blocks(expected).Accessor.GetBlock(first.Key); target.ChangeData(imported);
            Write(target.Data, 4, za ? (Read(target.Data, 4) | 1u) & ~16u : Read(target.Data, 4) | 1u);
            output = Fashion9Editing.Prepare(save, new(hash, importOps.ToArray()), hash, input.Length, out reset);
            Check(reset.Length == 0 && output.SequenceEqual(expected.Write().ToArray()), "Import/reload/patch/own order and all raw bytes");
            if (za)
            {
                expected = Open(za, input);
                foreach (var d in definitions.Where(d => d.Kind == "za"))
                {
                    var bytes = Fashion9Editing.Blocks(expected).Accessor.GetBlock(d.Key).Data;
                    for (int i = 0; i < bytes.Length / 8; i++) if (Read(bytes, i * 8) != 65535) Write(bytes, i * 8 + 4, Read(bytes, i * 8 + 4) | 16u);
                }
                output = Fashion9Editing.Prepare(save, new(hash, [new("owned", first.Id, Owned: true, All: true)]), hash, input.Length, out _);
                Check(output.SequenceEqual(expected.Write().ToArray()), "All tabs own skips None and hair rows");
                var hair = definitions.First(d => d.Kind == "hair");
                output = Fashion9Editing.Prepare(save, new(hash, [new("owned", hair.Id, Owned: false, All: false)]), hash, input.Length, out _);
                Check(output.SequenceEqual(input), "Hair current-tab owned is source no-op");
            }
            else Reject(() => Fashion9Editing.Prepare(save, new(hash, [new("owned", first.Id, Owned: true, All: true)]), hash, input.Length, out _));
            if (revision == 0 && version != GameVersion.VL)
            {
                foreach (var boundary in new (string Text, uint Value, bool Reset)[]
                {
                    ("0", 0, false), ("65535", 65535, false), (" +4294967295 \r\n", uint.MaxValue, false),
                    ("4294967296", 65535, true), ("-1", 65535, true), ("0x10", 65535, true), ("", 65535, true), (" \t ", 65535, true),
                })
                {
                    expected = Open(za, input); Write(Fashion9Editing.Blocks(expected).Accessor.GetBlock(first.Key).Data, 16, boundary.Value);
                    output = Fashion9Editing.Prepare(save, new(hash, [new("rows", first.Id, [new(2, boundary.Text)])]), hash, input.Length, out reset);
                    Check(output.SequenceEqual(expected.Write().ToArray()) && reset.Length == (boundary.Reset ? 1 : 0), "Source Integer whitespace/sign/empty/overflow/hex semantics");
                }
                // Partial records must survive an import, even though they are absent from the row grid.
                var all = Fashion9Editing.Blocks(save).AllBlocks.Select(b => b.Key == first.Key
                    ? SwshBlockFixtureTests.Typed(b.Key, b.Data.ToArray().Concat(new byte[] { 0xA7, 0xB8, 0xC9 }).ToArray(), b.Type, b.SubType) : b).ToArray();
                var tailInput = SwishCrypto.Encrypt(all); var tailSave = Open(za, tailInput); var tailHash = Br4Editing.Hash(tailInput);
                var raw = Fashion9Editing.Blocks(tailSave).Accessor.GetBlock(first.Key).Data.ToArray(); raw[^1] ^= 1;
                var tailEdit = new F9Edit(tailHash, [new("import", first.Id, Data: Convert.ToHexString(raw))]);
                var tailTicket = Fashion9Session.Prepare(tailSave, tailEdit, tailInput);
                Check(tailTicket.Rows.Length == 0 && tailTicket.Blocks.Length == 1 && tailTicket.ChangedOffsets.Length > 0, "Tail-only changes remain visible in block/file preview");
                var tailOutput = Fashion9Session.Commit(tailInput, new(tailTicket.Token, tailTicket.SourceHash, tailTicket.TargetHash));
                expected = Open(za, tailInput); Fashion9Editing.Blocks(expected).Accessor.GetBlock(first.Key).ChangeData(raw);
                Check(tailOutput.SequenceEqual(expected.Write().ToArray()), "Complete tail import oracle");
            }
            var ticket = Fashion9Session.Prepare(save, edit, input);
            Check(ticket.Rows.Length == definitions.Length * 2 && ticket.Blocks.Length == definitions.Length && ticket.Result.Groups.All(g => g.Rows.Length == 0), "Complete frozen rows/blocks and bounded result catalog");
            var ticketJson = JsonSerializer.Serialize(ticket, SaveJsonContext.Default.F9Ticket);
            var decodedTicket = JsonSerializer.Deserialize(ticketJson, SaveJsonContext.Default.F9Ticket)!;
            Check(decodedTicket.Rows.Length == ticket.Rows.Length && decodedTicket.Blocks.Length == ticket.Blocks.Length && decodedTicket.TargetHash == decodedTicket.Result.SourceHash, "Generated complete frozen ticket schema");
            var old = new F9Confirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            ticket = Fashion9Session.Prepare(save, new(hash, []), input); var confirmation = new F9Confirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            Reject(() => Fashion9Session.Commit(input, old));
            var different = input.ToArray(); different[^1] ^= 1; Reject(() => Fashion9Session.Commit(different, confirmation));
            Check(Fashion9Session.Commit(input, confirmation).SequenceEqual(input), "Frozen resave commit");
            Reject(() => Fashion9Session.Commit(input, confirmation));
            ticket = Fashion9Session.Prepare(save, edit, input); confirmation = new(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            Reject(() => Fashion9Session.Prepare(save, new("stale", []), input)); Reject(() => Fashion9Session.Commit(input, confirmation));
            ticket = Fashion9Session.Prepare(save, edit, input); confirmation = new(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            Fashion9Session.Discard(ticket.Token); Reject(() => Fashion9Session.Commit(input, confirmation));
            ticket = Fashion9Session.Prepare(save, edit, input); confirmation = new(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            Reject(() => Fashion9Session.Prepare(save, new(hash, [new("rows", first.Id, [new(0, "1")]), new("import", first.Id, Data: "00")]), input));
            Reject(() => Fashion9Session.Commit(input, confirmation));
            ticket = Fashion9Session.Prepare(save, edit, input); confirmation = new(ticket.Token, ticket.SourceHash, ticket.TargetHash);
            Reject(() => SaveService.PreviewFashion9([], editJson)); Reject(() => Fashion9Session.Commit(input, confirmation));
            Check(input.SequenceEqual(original), "Frozen/session failure original preservation");
            Console.WriteLine($"PASS Fashion9 {version}/revision {revision}: all source groups/physical rows, UInt32/None/input bounds, protected flags, import/owned ordering and no-op tabs, independent complete-file oracle, paged catalogs, frozen sessions and original");
        }
    }
}
