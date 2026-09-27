// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class BoxImportContractTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SaveFile Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray())!;
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Expected preview confirmation or stale-source rejection");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var source = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var setup = Open(source);
            var sentinel = setup.GetBoxSlotAtIndex(0, 0).Clone(); sentinel.PID = 100; sentinel.RefreshChecksum();
            setup.SetBoxSlotAtIndex(sentinel, 1, 0, EntityImportSettings.None);
            var input = setup.Write().ToArray(); var original = input.ToArray();
            PKM Incoming(uint pid)
            {
                var p = setup.BlankPKM; p.Species = 133; p.Version = Enum.Parse<GameVersion>(version);
                p.PID = pid; p.Language = 2; p.CurrentLevel = 20; p.RefreshChecksum(); return p;
            }
            var incoming = new[] { Incoming(200), Incoming(201) };
            foreach (bool clearFirst in new[] { false, true })
                foreach (bool overwrite in new[] { false, true })
                {
                    var plan = BoxImportPreview.Prepare(input, incoming, 1, clearFirst, overwrite, EntityImportSettings.None);
                    var reference = Open(input);
                    reference.LoadBoxes(incoming, out _, 1, clearFirst, overwrite, EntityImportSettings.None);
                    var actual = plan.Commit(input, true, true, true);
                    Check(actual.SequenceEqual(reference.Write().ToArray()), "Preview bytes match Core import and export");
                    Check(plan.Summary.Written == 2 && plan.Summary.Overwritten == (!clearFirst && overwrite ? 1 : 0), "Actual write and overwrite counts");
                    if (clearFirst) Reject(() => plan.Commit(input, false, true, true));
                    if (!clearFirst && overwrite) Reject(() => plan.Commit(input, true, false, true));
                    var changed = input.ToArray(); changed[0] ^= 1;
                    Reject(() => plan.Commit(changed, true, true, true));
                    actual[0] ^= 1;
                    Check(plan.Commit(input, true, true, true).SequenceEqual(reference.Write().ToArray()), "Commit returns detached frozen bytes");
                }
            var emptyPlan = BoxImportPreview.Prepare(input, [], 1, true, false, EntityImportSettings.None);
            Check(emptyPlan.Summary.Deleted == 2 && emptyPlan.Summary.Written == 0 &&
                emptyPlan.Summary.Outcomes.Count(o => o.Status == "deleted") == 2, "Empty input deletion positions remain explicit");
            Reject(() => emptyPlan.Commit(input, false, true, true));
            var noChange = BoxImportPreview.Prepare(input, [], 1, false, false, EntityImportSettings.None);
            Check(noChange.Commit(input, false, false, false).SequenceEqual(input), "No-op preserves exact original bytes");
            var fill = Open(input);
            Check(fill.LoadBoxes(incoming, out _, 1, false, false, EntityImportSettings.None) == 2, "Open-slot import count");
            Check(fill.GetBoxSlotAtIndex(1, 0).PID == 100 && fill.GetBoxSlotAtIndex(1, 1).PID == 200 &&
                fill.GetBoxSlotAtIndex(1, 2).PID == 201, "Non-overwrite import preserves occupied slots and input order");
            Check(fill.GetBoxSlotAtIndex(0, 0).Data.SequenceEqual(Open(input).GetBoxSlotAtIndex(0, 0).Data), "Boxes before starting box remain unchanged");
            var replace = Open(input);
            Check(replace.LoadBoxes(incoming, out _, 1, false, true, EntityImportSettings.None) == 2 &&
                replace.GetBoxSlotAtIndex(1, 0).PID == 200 && replace.GetBoxSlotAtIndex(1, 1).PID == 201,
                "Overwrite flag truly replaces occupied slots despite inverted XML summary");
            var clear = Open(input);
            Check(clear.LoadBoxes(incoming, out _, 1, true, false, EntityImportSettings.None) == 2 &&
                clear.GetBoxSlotAtIndex(clear.BoxCount - 1, clear.BoxSlotCount - 1).Species == 0,
                "Clear applies from the starting box through the last box");
            var noFiles = Open(input);
            Check(noFiles.LoadBoxes(Array.Empty<PKM>(), out _, 1, true, false, EntityImportSettings.None) == -1 &&
                noFiles.GetBoxSlotAtIndex(1, 0).Species == 0,
                "Core can clear boxes before reporting no import; Web preview must make deletion explicit");
            var incompatible = Incoming(202); incompatible.Move1 = (ushort)(setup.MaxMoveID + 1);
            Check(!Open(input).GetCompatible([incompatible]).Any(), "Move compatibility is separate from file recognition");
            incompatible.RefreshChecksum();
            var skipped = BoxImportPreview.Prepare(input, [incompatible], 1, false, false, EntityImportSettings.None);
            Check(skipped.Summary.Outcomes.Single().Status == "incompatible", "Preview reports compatibility rejection");
            Reject(() => skipped.Commit(input, true, true, false));
            var full = Open(input);
            int last = full.BoxCount - 1;
            for (int slot = 0; slot < full.BoxSlotCount - 1; slot++) full.SetBoxSlotAtIndex(sentinel, last, slot, EntityImportSettings.None);
            full.SetBoxSlotAtIndex(full.BlankPKM, last, full.BoxSlotCount - 1, EntityImportSettings.None);
            var fullInput = full.Write().ToArray();
            var capacity = BoxImportPreview.Prepare(fullInput, incoming, last, false, false, EntityImportSettings.None);
            Check(capacity.Summary.Written == 1 && capacity.Summary.Outcomes.Last().Status == "full", "Preview reports capacity exhaustion");
            Reject(() => capacity.Commit(fullInput, false, false, false));
            Check(full.LoadBoxes(incoming, out _, last, false, false, EntityImportSettings.None) == 1 &&
                full.GetBoxSlotAtIndex(last, full.BoxSlotCount - 1).PID == 200,
                "Capacity stops after the last free slot without wrapping to earlier boxes");
            if (Open(input) is SAV7 protectedSave)
            {
                protectedSave.BoxLayout.TeamSlots[0] = protectedSave.BoxSlotCount;
                protectedSave.BoxLayout.SetIsTeamLocked(0, false);
                var protectedInput = protectedSave.Write().ToArray();
                var protectedPlan = BoxImportPreview.Prepare(protectedInput, [Incoming(210)], 1, false, true, EntityImportSettings.None);
                Check(protectedPlan.Summary.Written == 1 && protectedPlan.Summary.Overwritten == 0 &&
                    protectedPlan.Summary.Outcomes.First().Status == "protected", "Preview counts actual writes and protected positions");
                Check(Open(protectedPlan.Commit(protectedInput, false, false, false)).GetBoxSlotAtIndex(1, 0).PID == 100,
                    "Preview keeps protected entity");
                int reported = protectedSave.ImportPKMs([Incoming(210)], true, 1, EntityImportSettings.None);
                Check(protectedSave.GetBoxSlotAtIndex(1, 0).PID == 100 && protectedSave.GetBoxSlotAtIndex(1, 1).PID == 210,
                    "Protected slots skipped even when overwrite is requested");
                Check(reported == 2, "Core overwrite count includes skipped protected slots; Web must count actual writes");
            }
            Check(input.SequenceEqual(original), "Reference source bytes remain untouched");
            Console.WriteLine($"PASS {version}: Core import contract, preview byte parity, overwrite/deletion confirmation, detached commits, stale-source rejection and source preservation");
        }
    }
}
