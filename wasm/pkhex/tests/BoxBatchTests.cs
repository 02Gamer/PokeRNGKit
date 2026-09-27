// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using BoxEdit = PokeRNGKit.SaveEditor.BoxEdit;
internal static class BoxBatchTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SaveFile Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray())!;
    private static IBoxManip Manip(SaveFile save, string id) => BoxManipUtil.ManipCategories.SelectMany(c => c).First(m => m.Type.ToString() == id && m.Usable(save));
    public static void Run()
    {
        foreach (string version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var setup = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            for (int slot = 0; slot < 4; slot++)
            {
                var p = setup.BlankPKM; p.Species = (ushort)(slot % 2 == 0 ? 133 : 25); p.Version = setup.Version; p.Language = 2;
                p.PID = (uint)(100 + slot); p.CurrentLevel = (byte)(slot == 2 ? 100 : 10 + slot * 5); p.HeldItem = slot == 0 ? 1 : 0;
                p.Nickname = "TEST"; p.IsNicknamed = true; p.Move1 = 33; p.Move1_PP = 1;
                p.OriginalTrainerName = "TEST"; p.IsEgg = slot == 3; p.RefreshChecksum();
                setup.SetBoxSlotAtIndex(p, 1, slot, EntityImportSettings.None);
            }
            setup.SetBoxSlotAtIndex(setup.GetBoxSlotAtIndex(1, 0), 1, 4, EntityImportSettings.None);
            var input = setup.Write().ToArray(); var original = input.ToArray(); var before = Open(input);
            var choices = BoxBatch.Choices(before);
            Check(choices.Select(c => c.Id).Distinct().Count() == choices.Length, "Unique usable batch overloads");
            foreach (var choice in choices)
            foreach (bool reverse in choice.Group == 3 ? new[] { false } : new[] { false, true })
            {
                var save = Open(input); var expected = Open(input);
                var edit = new BoxEdit(1, null, null, Batch: choice.Id, Reverse: reverse, Language: "en");
                var manip = Manip(expected, choice.Id);
                if (choice.Id == "SortName") manip = new BoxManipSort(BoxManipType.SortName, list => list.OrderBySpeciesName(GameInfo.GetStrings("en").Species));
                try { manip.Execute(expected, new(1, 1, reverse)); }
                catch (ArgumentException)
                {
                    bool rejected = false;
                    try { BoxEditing.Apply(save, edit); } catch (ArgumentException e) when (e.Message == "Box batch cannot process the selected Pokemon.") { rejected = true; }
                    Check(rejected && save.Write().Span.SequenceEqual(input), "Core-rejected malformed data leaves whole batch unchanged");
                    Console.WriteLine($"PASS {version}/{choice.Id}: Core cannot process synthetic input; adapter rejects atomically");
                    continue;
                }
                BoxEditing.Apply(save, edit);
                for (int box = 0; box < save.BoxCount; box++)
                for (int slot = 0; slot < save.BoxSlotCount; slot++)
                {
                    var p = save.GetBoxSlotAtIndex(box, slot);
                    if (box != 1 || before.IsBoxSlotOverwriteProtected(box, slot)) Check(p.Data.SequenceEqual(before.GetBoxSlotAtIndex(box, slot).Data), "Batch preserves outside/protected slots");
                    else if (choice.Id is not ("SortRandom" or "ModifyRandomMoves" or "ModifyResetMoves"))
                    {
                        var reference = expected.GetBoxSlotAtIndex(box, slot);
                        if (choice.Id == "ModifyHatchEggs" && before.GetBoxSlotAtIndex(box, slot).IsEgg && p.Gen6 && p is IMemoryOT memory && reference is IMemoryOT expectedMemory)
                        {
                            Check(MemoryContext6.CanHaveFeeling6(2, memory.OriginalTrainerMemoryFeeling, memory.OriginalTrainerMemoryVariable), "Gen VI hatch memory feeling is valid");
                            expectedMemory.OriginalTrainerMemoryFeeling = memory.OriginalTrainerMemoryFeeling; reference.RefreshChecksum();
                        }
                        Check(p.Data.SequenceEqual(reference.Data), $"{version}/{choice.Id}: Core result in selected range");
                    }
                    else if (choice.Id is "ModifyRandomMoves" or "ModifyResetMoves" && p.Species != 0)
                    {
                        var old = before.GetBoxSlotAtIndex(box, slot);
                        var moves = new ushort[4]; p.GetMoves(moves); old.SetMoves(moves); old.RefreshChecksum();
                        Check(p.Data.SequenceEqual(old.Data), "Move suggestions change only moves and associated PP/checksum fields");
                        var analysis = new LegalityAnalysis(p); var possible = new bool[p.MaxMoveID + 1];
                        if (analysis.Parsed) LearnPossible.Get(p, analysis.EncounterOriginal, analysis.Info.EvoChainsAllGens, possible, MoveSourceType.All);
                        foreach (ushort move in moves) Check(move <= save.MaxMoveID && (move == 0 || possible[move]), "Suggested moves belong to the Core learnable pool");
                    }
                }
                if (choice.Id == "SortRandom")
                {
                    string[] Slots(SaveFile s) => Enumerable.Range(0, s.BoxSlotCount).Select(i => Convert.ToHexString(s.GetBoxSlotAtIndex(1, i).Data)).Order().ToArray();
                    Check(Slots(save).SequenceEqual(Slots(before)), "Random sort preserves complete slot multiset");
                }
                var snapshot = BoxEditing.Snapshot(save); var output = save.Write().ToArray();
                Check(Open(output).ChecksumsValid && BoxEditing.Snapshot(Open(output)) == snapshot, "Batch complete serialized roundtrip");
            }
            foreach (var id in new[] { "DeleteClones", "SortSpecies", "ModifyMaxLevel" })
            {
                var save = Open(input); var expected = Open(input);
                BoxEditing.Apply(save, new(1, null, null, Batch: id, All: true, Language: "en"));
                Manip(expected, id).Execute(expected, new(0, expected.BoxCount - 1));
                var actualBytes = save.Write().ToArray(); var expectedBytes = expected.Write().ToArray();
                // SortBoxes re-encodes unchanged empty slots (e.g. DP all-zero physical slots).
                // The adapter deliberately preserves their original bytes; compare every decoded slot and metadata.
                if (id == "SortSpecies") Check(BoxEditing.Snapshot(save) == BoxEditing.Snapshot(expected), $"{version}/{id}: all-box complete state matches Core");
                else Check(actualBytes.SequenceEqual(expectedBytes), $"{version}/{id}: all-box exact full output");
            }
            foreach (var bad in new BoxEdit[] { new(1, null, null, Batch: "unknown", Language: "en"), new(-1, null, null, Batch: "SortSpecies", Language: "en"),
                new(1, "A", null, Batch: "SortSpecies", Language: "en"), new(1, null, null, Batch: "SortSpecies", Language: "xx"),
                new(1, null, null, Batch: "ModifyMaxLevel", Reverse: true, Language: "en"), new(1, null, null, All: true) })
            {
                var save = Open(input); bool rejected = false; try { BoxEditing.Apply(save, bad); } catch (ArgumentException) { rejected = true; }
                Check(rejected && save.Write().Span.SequenceEqual(input), "Invalid batch rejected atomically");
            }
            if (before is SAV7 s7)
            {
                s7.BoxLayout.TeamSlots[0] = s7.BoxSlotCount; s7.BoxLayout.SetIsTeamLocked(0, false);
                var protectedInput = s7.Write().ToArray(); var save = Open(protectedInput);
                var originalPokemon = save.GetBoxSlotAtIndex(1, 0).Data.ToArray();
                BoxEditing.Apply(save, new(1, null, null, Batch: "DeleteAll", Language: "en"));
                Check(save.GetBoxSlotAtIndex(1, 0).Data.SequenceEqual(originalPokemon) && save.GetBoxSlotAtIndex(1, 1).Species == 0, "Unocked team registration skipped while other slots cleared");
                s7.BoxLayout.SetIsTeamLocked(0, true); bool rejected = false;
                try { BoxEditing.Apply(s7, new(1, null, null, Batch: "SortSpecies", Language: "en")); } catch (ArgumentException) { rejected = true; }
                Check(rejected, "Locked region blocks batch operation");
            }
            if (before is SAV6XY xy)
            {
                int offset = xy.GetBoxSlotOffset(0, 0); xy.Data[offset + 6] ^= 1;
                var raw = xy.Data.Slice(offset, xy.SIZE_BOXSLOT).ToArray();
                BoxEditing.Apply(xy, new(1, null, null, Batch: "SortSpecies", Language: "en"));
                Check(xy.Data.Slice(offset, xy.SIZE_BOXSLOT).SequenceEqual(raw), "Sort preserves corrupt raw slot outside selected range");
            }
            Check(input.SequenceEqual(original), "Batch original preserved");
            Console.WriteLine($"PASS {version}: {choices.Length} usable batch actions, reverse modes, full roundtrip, selected/all-box scope, protected slots, random invariants and rejection");
        }
        // A real upstream legal entity complements malformed synthetic rejection cases.
        var legal = new PK4(File.ReadAllBytes("wasm/pkhex/tests/fixtures/legal-onix.pk4"));
        Check(new LegalityAnalysis(legal).Valid, "Upstream Onix fixture is legal");
        var hg = Open(File.ReadAllBytes(".tmp/pkhex-fixtures/HG.sav")); hg.ClearBoxes();
        hg.SetBoxSlotAtIndex(legal, 1, 0, EntityImportSettings.None);
        var legalInput = hg.Write().ToArray(); var copy = legalInput.ToArray();
        var request = new BoxEdit(1, null, null, Batch: "ModifyResetMoves", Language: "en");
        var legalOutput = SaveService.EditBox(legalInput, System.Text.Json.JsonSerializer.Serialize(request, SaveJsonContext.Default.BoxEdit));
        var result = Open(legalOutput);
        Check(result.ChecksumsValid && new LegalityAnalysis(result.GetBoxSlotAtIndex(1, 0)).Valid && copy.SequenceEqual(legalInput), "Legal HG entity move reset succeeds through full SaveService and preserves original");
        Console.WriteLine("PASS legal HG move reset: upstream legal entity, full service, valid result and original preservation");
    }
}
