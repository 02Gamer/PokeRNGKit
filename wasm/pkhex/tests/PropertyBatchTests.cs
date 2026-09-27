// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PropertyBatchTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SaveFile Open(byte[] bytes) => SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static void Rejected(Action action)
    {
        bool rejected = false; try { action(); } catch (ArgumentException) { rejected = true; }
        Check(rejected, "Unsafe or stale property batch must be rejected");
    }
    public static void Run()
    {
        foreach (string version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var setup = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            for (int i = 0; i < 3; i++)
            {
                var p = setup.BlankPKM; p.Species = (ushort)(25 + i); p.Version = setup.Version;
                p.Language = 2; p.CurrentLevel = 25; p.IV_HP = 5; p.RefreshChecksum();
                setup.SetBoxSlotAtIndex(p, 1, i, EntityImportSettings.None);
                setup.SetPartySlotAtIndex(p.Clone(), i, EntityImportSettings.None);
            }
            byte[] input = setup.Write().ToArray(), original = input.ToArray();
            var priorStrings = GameInfo.Strings;
            var plan = PropertyBatch.Preview(input, new("=Species=25\n.IV_HP=31", "box", 1, "zh"));
            Check(ReferenceEquals(priorStrings, GameInfo.Strings), "Preview restores shared language");
            Check(plan.Summary.ChangedSlots == 1 && plan.Summary.Groups == 1 && plan.Summary.Instructions == 1, "Preview reports exact changed slots");
            var result = plan.Commit(input); var actual = Open(result);
            var expected = Open(input); var target = expected.GetBoxSlotAtIndex(1, 0); target.IV_HP = 31; target.RefreshChecksum();
            expected.SetBoxSlotAtIndex(target, 1, 0, EntityImportSettings.None);
            Check(result.SequenceEqual(expected.Write().ToArray()), "Box property output equals independent full-file edit");
            Check(actual.ChecksumsValid && input.SequenceEqual(original), "Source and save checksum preserved");
            var stale = input.ToArray(); stale[10] ^= 1; Rejected(() => plan.Commit(stale));
            result[0] ^= 1; Check(plan.Commit(input).SequenceEqual(expected.Write().ToArray()), "Returned bytes cannot corrupt retained preview");
            var partial = PropertyBatch.Preview(input, new(".IV_HP=31\n.UnknownProperty=1", "box", 1, "en"));
            Check(partial.Summary.Outcomes.Count(o => o.Error) == 3 && partial.Summary.ChangedSlots == 3, "Partial errors remain explicit alongside successful changes");
            Rejected(() => partial.Commit(input)); Check(Open(partial.Commit(input, allowErrors: true)).GetBoxSlotAtIndex(1, 2).IV_HP == 31, "Partial commit requires confirmation");
            var random = PropertyBatch.Preview(input, new(".IV_HP=$0,31", "box", 1, "en"));
            Check(random.Commit(input).SequenceEqual(random.Commit(input)), "Random preview is never rerun on confirmation");
            var ignored = PropertyBatch.Preview(input, new(".IV_HP=31\nunknown line", "box", 1, "ja"));
            Check(ignored.Summary.IgnoredLines.SequenceEqual(new[] { 2 }), "Unrecognized line numbers are reported");
            Rejected(() => ignored.Commit(input)); ignored.Commit(input, allowIgnored: true);
            var empty = PropertyBatch.Preview(input, new(".Nickname=", "box", 1, "en"));
            Check(empty.Summary.EmptyValues, "Empty assignments require acknowledgement"); Rejected(() => empty.Commit(input));
            empty.Commit(input, allowEmpty: true);
            var party = PropertyBatch.Preview(input, new("=Slot=2\n.Species=0", "party", 0, "en"));
            var partyOutput = Open(party.Commit(input));
            Check(partyOutput.PartyCount == 2 && partyOutput.GetPartySlotAtIndex(0).Species == 25 && partyOutput.GetPartySlotAtIndex(1).Species == 27 && partyOutput.GetPartySlotAtIndex(2).Species == 0, "Party deletion compacts once without losing later members");
            Check(BoxEditing.Snapshot(partyOutput) == BoxEditing.Snapshot(Open(input)), "Party edits preserve all box state");
            var unchanged = PropertyBatch.Preview(input, new("=Species=9999\n.IV_HP=31", "boxes", 0, "en"));
            Check(unchanged.Summary.ChangedSlots == 0 && unchanged.Commit(input).SequenceEqual(input), "No matches preserve original raw file exactly");
            var sequential = PropertyBatch.Preview(input, new("=Box=2\n=Slot=1\n.IV_HP=30\n;\n=Box=2\n=IV_HP=30\n.IV_ATK=29", "boxes", 0, "en"));
            var sequentialResult = Open(sequential.Commit(input));
            Check(sequential.Summary.Groups == 2 && sequential.Summary.ChangedSlots == 1 && sequentialResult.GetBoxSlotAtIndex(1, 0).IV_ATK == 29, "All-box metadata and sequential groups share cached data");
            if (Open(input) is SAV7 s7)
            {
                s7.BoxLayout.TeamSlots[0] = s7.BoxSlotCount;
                foreach (bool locked in new[] { false, true })
                {
                    s7.BoxLayout.SetIsTeamLocked(0, locked); var protectedInput = s7.Write().ToArray();
                    var protectedPlan = PropertyBatch.Preview(protectedInput, new(".IV_HP=31", "box", 1, "en"));
                    var protectedResult = Open(protectedPlan.Commit(protectedInput));
                    Check(protectedPlan.Summary.Outcomes.Any(o => o.Box == 1 && o.Slot == 0 && o.Result == "protected") &&
                        protectedResult.GetBoxSlotAtIndex(1, 0).Data.SequenceEqual(Open(protectedInput).GetBoxSlotAtIndex(1, 0).Data) && protectedResult.GetBoxSlotAtIndex(1, 1).IV_HP == 31,
                        "Registered team slot is skipped in both lock states while other slots change");
                }
            }
            if (Open(input) is SAV6XY xy)
            {
                int offset = xy.GetBoxSlotOffset(1, 0); xy.Data[offset + 6] ^= 1;
                var corruptInput = xy.Write().ToArray(); var corrupted = Open(corruptInput);
                var raw = corrupted.Data.Slice(offset, corrupted.SIZE_BOXSLOT).ToArray();
                var corruptPlan = PropertyBatch.Preview(corruptInput, new(".IV_HP=31", "box", 1, "en"));
                var corruptResult = Open(corruptPlan.Commit(corruptInput));
                Check(corruptPlan.Summary.Outcomes.Any(o => o.Slot == 0 && o.Result == "invalid") && corruptResult.Data.Slice(offset, corruptResult.SIZE_BOXSLOT).SequenceEqual(raw), "Invalid entity is reported and raw bytes stay unchanged");
            }
            Rejected(() => PropertyBatch.Preview(input, new("=Species=\n.IV_HP=31", "box", 1, "en")));
            Rejected(() => PropertyBatch.Preview(input, new(".IV_HP=31", "box", -1, "en")));
            Rejected(() => PropertyBatch.Preview(input, new(".IV_HP=31", "box", 1, "fr")));
            Check(input.SequenceEqual(original), "Every preview preserves original bytes");
            Console.WriteLine($"PASS {version}: property preview exact export, frozen randomness, stale rejection, confirmations, party compaction and original preservation");
        }
    }
}
