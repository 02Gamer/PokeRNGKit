// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

internal static class TechRecordAuditTests
{
    internal static void Run()
    {
        foreach (PKM entity in new PKM[] { new PK8(), new PB8(), new PA8(), new PK9(), new PA9() }) {
            entity.Species = 25; entity.Language = 2; entity.OriginalTrainerName = "TEST"; entity.Nickname = "TEST"; entity.CurrentLevel = 25;
            Fill(entity, 0xA5); entity.RefreshChecksum(); byte[] original = entity.Data.ToArray();
            var record = (ITechRecord)entity;
            int used = entity is PA8 ? 61 : entity is PK9 or PA9 ? 230 : 100;
            int candidates = entity is PA9 ? 160 : used;
            int total = entity is PA8 ? 64 : entity is PK9 or PA9 ? 304 : 112;
            Check(record.Permit.RecordPermitIndexes.Length == candidates && record.Permit.RecordCountUsed == used && record.Permit.RecordCountTotal == total, $"Candidate/used/total record counts: {entity.GetType().Name} actual {record.Permit.RecordPermitIndexes.Length}/{record.Permit.RecordCountUsed}/{record.Permit.RecordCountTotal}");
            if (entity is PB8) Check(Enumerable.Range(0, used).All(i => !record.Permit.IsRecordPermitted(i)), "BDSP source has no permitted records");
            var cleared = entity.Clone(); ((ITechRecord)cleared).ClearRecordFlags(); cleared.RefreshChecksum();
            var forced = entity.Clone(); ((ITechRecord)forced).SetRecordFlags(forced, TechnicalRecordApplicatorOption.ForceAll); forced.RefreshChecksum();
            for (int i = 0; i < total; i++) {
                Check(!((ITechRecord)cleared).GetMoveRecordFlag(i), "Source clearing covers total allocated flags");
                Check(((ITechRecord)forced).GetMoveRecordFlag(i) == (i < used), "ForceAll clears total and sets only used flags");
                Check(RawFlag(forced, i) == (i < used), "Independent physical flag addresses");
            }
            if (entity is PA8 pa) {
                Check(((PA8)cleared).MoveRecordFlags[8..].SequenceEqual(pa.MoveRecordFlags[8..]), "LA clearing preserves upper 48 bits of its separate TR buffer");
                Check(((PA8)forced).MoveRecordFlags[8..].SequenceEqual(pa.MoveRecordFlags[8..]), "LA force preserves upper 48 TR bits");
                Check(((PA8)forced).PurchasedRecord.SequenceEqual(pa.PurchasedRecord) && ((PA8)forced).MasteredRecord.SequenceEqual(pa.MasteredRecord), "LA TR is separate from Move Shop buffers");
            }
            Check(entity.Data.SequenceEqual(original), "Original preserved");
            Console.WriteLine($"PASS TechRecord audit {entity.GetType().Name}: {candidates} candidates/{used} force-used/{total} allocated, independent physical addresses, full clear/force bounds and immutable original");
        }
        var za = new PA9 { Species = 25 }; za.RecordFlagsBase.Clear(); za.RecordFlagsDLC.Clear();
        za.SetMoveRecordFlag(0); za.SetMoveRecordFlag(160); za.RefreshChecksum();
        Check(za.Permit.RecordPermitIndexes[0] == 29, "ZA first candidate is Headbutt, not an empty prefix");
        Check(za.GetMoveRecordFlag(0) && !za.GetMoveRecordFlag(1) && !za.GetMoveRecordFlag(159) && za.GetMoveRecordFlag(160), "First/last source-window index shift is observable");
        var sourceWindow = new PA9 { Species = 25 }; var logical = new PA9 { Species = 25 };
        // WinForms 26.08.26 PopulateRecords displays i+1; Save parses that display directly.
        for (int i = 0; i < 160; i++) { sourceWindow.SetMoveRecordFlag(i + 1, i == 0); logical.SetMoveRecordFlag(i, i == 0); }
        Check(sourceWindow.Data[0x12F] == 2 && logical.Data[0x12F] == 1, "Source-window first checkbox edits bit 1 while Core TM001 is bit 0");
        Check(sourceWindow.GetMoveRecordFlag(1) && !sourceWindow.GetMoveRecordFlag(0), "Source-window discrepancy must not be silently assumed away");
        Console.WriteLine("PASS TechRecord ZA source discrepancy reproduced: display001 Save writes physical bit1, Core candidate29/position0 uses physical bit0; raw first byte02 vs01");
    }
    private static void Fill(PKM p, byte value) {
        switch (p) {
            case G8PKM g: g.RecordFlags.Fill(value); break;
            case PA8 a: a.MoveRecordFlags.Fill(value); a.PurchasedRecord.Fill(0x5A); a.MasteredRecord.Fill(0x3C); break;
            case PK9 n: n.RecordFlagsBase.Fill(value); n.RecordFlagsDLC.Fill(value); break;
            case PA9 n: n.RecordFlagsBase.Fill(value); n.RecordFlagsDLC.Fill(value); break;
        }
    }
    private static bool RawFlag(PKM p, int i) {
        int offset = p is G8PKM ? 0x127 + (i >> 3) : p is PA8 ? 0x13F + (i >> 3) : i < 200 ? 0x12F + (i >> 3) : 0x4B + ((i - 200) >> 3);
        return (p.Data[offset] & (1 << (i & 7))) != 0;
    }
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
}
