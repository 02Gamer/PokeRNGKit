// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

internal static class PlusRecordAuditTests
{
    internal static void Run()
    {
        var entity = new PA9 { Species = 25, Language = 2, OriginalTrainerName = "TEST", Nickname = "TEST", CurrentLevel = 25 };
        var permit = (IPermitPlus)entity.PersonalInfo;
        Check(permit.PlusMoveIndexes.Length == 340 && permit.PlusCountUsed == 340 && permit.PlusCountTotal == 360, "Candidate/used/total capacities");
        Check(permit.PlusMoveIndexes[0] == 7 && permit.PlusMoveIndexes[^1] == 893, "Source first/last candidates");
        entity.RecordFlagsBase.Fill(0x5A); entity.RecordFlagsDLC.Fill(0xA5);
        entity.PlusFlags0.Clear(); entity.PlusFlags1.Clear(); entity.RefreshChecksum();
        byte[] original = entity.Data.ToArray();
        for (int i = 0; i < 360; i++) {
            var single = (PA9)entity.Clone(); single.SetMovePlusFlag(i); single.RefreshChecksum();
            for (int j = 0; j < 360; j++) Check(single.GetMovePlusFlag(j) == (i == j) && Physical(single, j) == (i == j), "Independent physical index mapping");
            Check(single.GetMovePlusFlagAny() && single.GetMovePlusFlagAnyImpossible() == (i >= 340), "Any/impossible tail boundaries");
            Check(single.RecordFlagsBase.SequenceEqual(entity.RecordFlagsBase) && single.RecordFlagsDLC.SequenceEqual(entity.RecordFlagsDLC), "Technical records remain separate");
            single.SetMovePlusFlag(i, false); single.RefreshChecksum(); Check(single.Data.SequenceEqual(original), "Individual bit roundtrip preserves complete entity");
        }
        foreach (int bad in new[] { -1, 360, int.MaxValue }) {
            Reject(() => entity.GetMovePlusFlag(bad)); Reject(() => entity.SetMovePlusFlag(bad));
        }
        var manual = (PA9)entity.Clone(); manual.PlusFlags0.Fill(0xA5); manual.PlusFlags1.Fill(0xA5);
        for (int i = 0; i < 340; i++) manual.SetMovePlusFlag(i, false);
        for (int i = 340; i < 360; i++) Check(manual.GetMovePlusFlag(i) == ((0xA5 & (1 << (i & 7))) != 0), "Manual source save preserves twenty non-visible flags");
        var clear = (PA9)manual.Clone(); ((IPlusRecord)clear).ClearPlusFlags(permit.PlusCountTotal);
        Check(!clear.GetMovePlusFlagAny() && !clear.GetMovePlusFlagAnyImpossible(), "Source clear covers all 360 bits");
        var force = (PA9)manual.Clone(); force.SetPlusFlags(permit, PlusRecordApplicatorOption.ForceAll);
        for (int i = 0; i < 360; i++) Check(Physical(force, i) == (i < 340), "Core force capacity clears tail; not a window command");
        Check(entity.Data.SequenceEqual(original), "Original entity remains immutable");
        Console.WriteLine("PASS PlusRecord audit PA9: 340 candidates/360 physical bits, all independent addresses and 264 split, twenty tail flags, manual/clear/force capacities, TR isolation, rejected bounds and original");
    }
    private static bool Physical(PA9 p, int i) {
        int address = i < 264 ? 0xD6 + (i >> 3) : 0x94 + ((i - 264) >> 3);
        return (p.Data[address] & (1 << (i & 7))) != 0;
    }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentOutOfRangeException) { return; } throw new Exception("Invalid PlusRecord index accepted"); }
}
