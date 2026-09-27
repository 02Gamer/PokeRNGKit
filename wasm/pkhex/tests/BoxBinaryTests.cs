// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class BoxBinaryTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SaveFile Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray())!;
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Expected box binary rejection");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var save = Open(input);
            var sentinel = save.GetBoxSlotAtIndex(0, 0).Clone(); sentinel.PID = 200;
            save.SetBoxSlotAtIndex(sentinel, 1, 1, EntityImportSettings.None);
            input = save.Write().ToArray(); var original = input.ToArray();
            var box = BoxBinary.Export(input, 0, false);
            var pc = BoxBinary.Export(input, 0, true);
            Check(box.SequenceEqual(Open(input).GetBoxBinary(0)) && pc.SequenceEqual(Open(input).GetPCBinary()), "Binary export equals Core bytes and retains party tails");
            foreach (var settings in new[] { default(EntityImportSettings), EntityImportSettings.None })
            foreach (bool all in new[] { false, true })
            {
                var data = all ? pc : box; var originalData = data.ToArray();
                var plan = BoxBinary.Preview(input, data, 1, all, settings);
                var reference = Open(input);
                var prior = SaveFile.SetUpdateSettings;
                try
                {
                    if (settings == EntityImportSettings.None)
                        SaveFile.SetUpdatePKM = SaveFile.SetUpdateDex = SaveFile.SetUpdateRecords = EntityImportOption.Disable;
                    Check(all ? reference.SetPCBinary(data) : reference.SetBoxBinary(data, 1), "Core accepts reference binary");
                }
                finally
                {
                    SaveFile.SetUpdatePKM = prior.UpdateToSaveFile; SaveFile.SetUpdateDex = prior.UpdatePokeDex; SaveFile.SetUpdateRecords = prior.UpdateRecord;
                }
                var output = plan.Commit(input, true, true, true);
                Check(output.SequenceEqual(plan.Commit(input, true, true, true)), "Random generation is frozen in preview");
                if (save.Generation == 6 && settings != EntityImportSettings.None)
                {
                    var actual = Open(output);
                    for (int i = 0; i < save.SlotCount; i++)
                    {
                        var expectedPokemon = (PK6)reference.GetBoxSlotAtIndex(i);
                        var actualPokemon = (PK6)actual.GetBoxSlotAtIndex(i);
                        if (expectedPokemon.HandlingTrainerMemoryFeeling == actualPokemon.HandlingTrainerMemoryFeeling) continue;
                        int sourceIndex = i - (all ? 0 : save.BoxSlotCount);
                        Check(sourceIndex >= 0 && sourceIndex < (all ? save.SlotCount : save.BoxSlotCount), "Random differences stay within the replaced region");
                        var sourcePokemon = (PK6)save.GetDecryptedPKM(data.AsSpan(sourceIndex * save.SIZE_BOXSLOT, Math.Min(save.SIZE_BOXSLOT, save.SIZE_PARTY)).ToArray());
                        Check(sourcePokemon.HandlingTrainerMemory == 0, "Only initially missing trade memory is generated");
                        Check(expectedPokemon.HandlingTrainerMemory == 4 && actualPokemon.HandlingTrainerMemory == 4 &&
                            MemoryContext6.CanHaveFeeling6(4, expectedPokemon.HandlingTrainerMemoryFeeling, expectedPokemon.HandlingTrainerMemoryVariable) &&
                            MemoryContext6.CanHaveFeeling6(4, actualPokemon.HandlingTrainerMemoryFeeling, actualPokemon.HandlingTrainerMemoryVariable),
                            "Only valid Core-generated trade feelings may differ between independent runs");
                        expectedPokemon.HandlingTrainerMemoryFeeling = actualPokemon.HandlingTrainerMemoryFeeling;
                        reference.SetBoxSlotAtIndex(expectedPokemon, i, EntityImportSettings.None);
                    }
                }
                Check(output.SequenceEqual(reference.Write().ToArray()), "Replacement equals Core bytes, with independently generated valid Gen6 feelings aligned");
                Check(plan.Summary.Written == (all ? save.SlotCount : save.BoxSlotCount), "Every source position is retained, including empty slots");
                Reject(() => plan.Commit(input, true, false, true));
                if (!all)
                {
                    Check(plan.Summary.Deleted == 1 && Open(plan.Commit(input, true, true, true)).GetBoxSlotAtIndex(1, 1).Species == 0,
                        "Empty source slot deletes the same target position without packing");
                    Reject(() => plan.Commit(input, false, true, true));
                }
                Check(data.SequenceEqual(originalData), "Binary input remains unchanged");
            }
            Reject(() => BoxBinary.Preview(input, box[..^1], 1, false, default));
            Reject(() => BoxBinary.Preview(input, box, save.BoxCount, false, default));
            Reject(() => BoxBinary.Export(input, -1, false));
            if (version == "E")
            {
                var invalid = box.ToArray(); invalid[0x1C] ^= 1; // PK3 checksum header, outside encrypted payload.
                Reject(() => BoxBinary.Preview(input, invalid, 1, false, EntityImportSettings.None));
            }
            if (Open(input) is SAV7 locked)
            {
                locked.BoxLayout.TeamSlots[0] = locked.BoxSlotCount + 1;
                locked.BoxLayout.SetIsTeamLocked(0, false);
                var protectedInput = locked.Write().ToArray();
                Reject(() => BoxBinary.Preview(protectedInput, box, 1, false, default));
                Reject(() => BoxBinary.Preview(protectedInput, pc, 0, true, default));
            }
            Check(input.SequenceEqual(original), "Original save remains unchanged");
            Console.WriteLine($"PASS {version}: box/PC export and import parity (validated Gen6 random feelings aligned), None/default settings, frozen commits, empty-position deletion, party tails, protection and bounds");
        }
    }
}
