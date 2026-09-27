// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

internal static class BoxImportContractTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SaveFile Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray())!;
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
            var full = Open(input);
            int last = full.BoxCount - 1;
            for (int slot = 0; slot < full.BoxSlotCount - 1; slot++) full.SetBoxSlotAtIndex(sentinel, last, slot, EntityImportSettings.None);
            full.SetBoxSlotAtIndex(full.BlankPKM, last, full.BoxSlotCount - 1, EntityImportSettings.None);
            Check(full.LoadBoxes(incoming, out _, last, false, false, EntityImportSettings.None) == 1 &&
                full.GetBoxSlotAtIndex(last, full.BoxSlotCount - 1).PID == 200,
                "Capacity stops after the last free slot without wrapping to earlier boxes");
            if (Open(input) is SAV7 protectedSave)
            {
                protectedSave.BoxLayout.TeamSlots[0] = protectedSave.BoxSlotCount;
                protectedSave.BoxLayout.SetIsTeamLocked(0, false);
                int reported = protectedSave.ImportPKMs([Incoming(210)], true, 1, EntityImportSettings.None);
                Check(protectedSave.GetBoxSlotAtIndex(1, 0).PID == 100 && protectedSave.GetBoxSlotAtIndex(1, 1).PID == 210,
                    "Protected slots skipped even when overwrite is requested");
                Check(reported == 2, "Core overwrite count includes skipped protected slots; Web must count actual writes");
            }
            Check(input.SequenceEqual(original), "Reference source bytes remain untouched");
            Console.WriteLine($"PASS {version}: import order, overwrite semantics, clear range, empty-input deletion, compatibility, capacity and protected-slot count contract");
        }
    }
}
