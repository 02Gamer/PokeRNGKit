// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using BoxEdit = PokeRNGKit.SaveEditor.BoxEdit;

internal static class CurrentBoxTests
{
    public static void Run()
    {
        Check(SaveService.ApiVersion == 154, "Current-box product protocol");
        var examples = new List<(string Name, byte[] Data)>();
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
            examples.Add((version, File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav")));
        foreach (var language in new[] { LanguageID.English, LanguageID.Japanese })
        {
            var gen1 = new SAV1(language, GameVersion.RB) { OT = "TEST" };
            var gen2 = new SAV2(language, GameVersion.GS) { OT = "TEST" };
            foreach (var save in new SaveFile[] { gen1, gen2 })
            {
                var p = save.BlankPKM; p.Species = 25; p.Nickname = "PIKA"; p.OriginalTrainerName = "A"; p.CurrentLevel = 5;
                save.SetBoxSlotAtIndex(p, 0, 0); save.PartyData = [p];
                examples.Add(($"{save.GetType().Name}/{language}", save.Write().ToArray()));
            }
        }
        foreach (var (version, input) in examples)
        {
            var original = input.ToArray();
            var before = SaveUtil.GetSaveFile(input.ToArray())!;
            var options = BoxEditing.Options(before);
            Check(options.CanSetCurrentBox && options.CurrentBox == before.CurrentBox, $"{version}: current box catalog");
            foreach (var box in new[] { 0, before.BoxCount - 1 })
            {
                var expected = SaveUtil.GetSaveFile(input.ToArray())!;
                expected.CurrentBox = box;
                var expectedOutput = expected.Write().ToArray();
                var output = Apply(input, new(box, null, null, CurrentBox: box));
                Check(output.SequenceEqual(expectedOutput), $"{version}: independent complete-file current box oracle");
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Check(after.CurrentBox == box && SaveChecksums.Valid(after), $"{version}: current box persisted after reopen");
                Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output), $"{version}: export exact verified current-box working copy");
                Check(input.SequenceEqual(original), $"{version}: current box changed original");
            }
            foreach (var edit in new BoxEdit[] {
                new(0, null, null, CurrentBox: -1),
                new(0, null, null, CurrentBox: before.BoxCount),
                new(0, null, null, CurrentBox: 1),
                new(1, "MIXED", null, CurrentBox: 1),
                new(1, null, 0, CurrentBox: 1),
                new(1, null, null, Flags: [], CurrentBox: 1),
                new(1, null, null, SwapWith: 0, CurrentBox: 1),
                new(1, null, null, Batch: "invalid", CurrentBox: 1),
                new(1, null, null, All: true, CurrentBox: 1),
                new(1, null, null, Reverse: true, CurrentBox: 1),
                new(1, null, null, Language: "en", CurrentBox: 1),
            })
            {
                try { Apply(input, edit); }
                catch (ArgumentException) { Check(input.SequenceEqual(original), "Rejected current box changed original"); continue; }
                throw new Exception($"{version}: invalid/mixed current box accepted: {edit}");
            }
            Console.WriteLine($"PASS CurrentBox {version}: actual catalog, endpoint selections, reopened metadata, complete independent file oracle, original and atomic mixed/bound rejection");
        }
        foreach (var version in new[] { "GP", "GE" })
        {
            var input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var original = input.ToArray();
            var save = SaveUtil.GetSaveFile(input.ToArray())!;
            Check(!BoxEditing.Options(save).CanSetCurrentBox, $"{version}: nonserialized base current box is not writable metadata");
            try { Apply(input, new(0, null, null, CurrentBox: 0)); }
            catch (ArgumentException) { Check(input.SequenceEqual(original), "Rejected unsupported current box changed original"); continue; }
            throw new Exception($"{version}: unsupported current box accepted");
        }
        // Typed engineering fixtures intentionally bypass SaveUtil recognition.
        // Their synthetic block metadata must never expand production detection.
        for (int revision = 0; revision < 3; revision++)
        {
            foreach (var version in new[] { GameVersion.SW, GameVersion.SH })
                Typed($"{version}/{revision}", WithFlags(new SAV8SWSH(SwshBlockFixtureTests.Create(version, revision)).AllBlocks, SaveBlockAccessor8SWSH.KSecretBoxUnlocked), bytes => new SAV8SWSH(bytes));
            foreach (var version in new[] { GameVersion.SL, GameVersion.VL })
                Typed($"{version}/{revision}", SvBlockFixtureTests.Create(version, revision), bytes => new SAV9SV(bytes));
            Typed($"ZA/{revision}", ZaBlockFixtureTests.Create(revision), bytes => new SAV9ZA(bytes));
        }
        for (int revision = 0; revision < 2; revision++)
            Typed($"LA/{revision}", WithFlags(new SAV8LA(LegendsPokedexTests.Fixture(revision)).AllBlocks, SaveBlockAccessor8LA.KUnlockedSecretBox01, SaveBlockAccessor8LA.KUnlockedSecretBox02, SaveBlockAccessor8LA.KUnlockedSecretBox03), bytes => new SAV8LA(bytes));
        foreach (var japanese in new[] { false, true })
        {
            // The blank constructor has no serialized block directory. This is
            // a Core mapping probe, never a recognized/exportable save fixture.
            var boxSave = new SAV3RSBox(japanese);
            foreach (int box in Enumerable.Range(0, boxSave.BoxCount))
            {
                var edit = new BoxEdit(box, null, null, CurrentBox: box);
                BoxEditing.Apply(boxSave, edit);
                Check(boxSave.CurrentBox == box / 2 * 2, "RS Box adjacent display indexes share one stored index");
                BoxEditing.Verify(boxSave, edit);
            }
            Console.WriteLine($"PASS CurrentBox RS Box/{japanese}: all 50 display indexes match Core paired storage mapping; not export/reopen acceptance");
        }
    }

    // BlankSaveFile supplies sized data blocks but omits these zero-length
    // Boolean blocks. Add their exact accessor keys only in this synthetic probe.
    private static byte[] WithFlags(IReadOnlyList<SCBlock> source, params uint[] keys)
    {
        var blocks = source.Select(block => block.Clone()).ToList();
        foreach (uint key in keys)
            if (!blocks.Any(block => block.Key == key))
                blocks.Add(SwshBlockFixtureTests.Typed(key, [], SCTypeCode.Bool1));
        return SwishCrypto.Encrypt(blocks.OrderBy(block => block.Key).ToArray());
    }

    private static void Typed(string name, byte[] input, Func<byte[], SaveFile> open)
    {
        var original = input.ToArray();
        var save = open(input.ToArray());
        Check(BoxEditing.Options(save).CanSetCurrentBox && SaveChecksums.Valid(save), $"{name}: typed current-box capability");
        foreach (var box in new[] { 0, save.BoxCount - 1 })
        {
            var expected = open(input.ToArray()); expected.CurrentBox = box;
            var actual = open(input.ToArray()); BoxEditing.Apply(actual, new(box, null, null, CurrentBox: box));
            var output = actual.Write().ToArray();
            Check(output.SequenceEqual(expected.Write().ToArray()), $"{name}: typed independent complete-file oracle");
            var reopened = open(output.ToArray());
            BoxEditing.Verify(reopened, new(box, null, null, CurrentBox: box));
            Check(reopened.CurrentBox == box && SaveChecksums.Valid(reopened), $"{name}: typed current-box reload/hash");
            Check(BoxEditing.Snapshot(reopened) == BoxEditing.Snapshot(actual), $"{name}: typed storage preservation");
        }
        Check(input.SequenceEqual(original), $"{name}: typed current box changed original");
        Console.WriteLine($"PASS CurrentBox typed {name}: independent complete output, reload/hash, storage and original; not SaveUtil acceptance");
    }

    private static byte[] Apply(byte[] input, BoxEdit edit) => SaveService.EditBox(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.BoxEdit));
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
}
