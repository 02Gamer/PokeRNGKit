// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

internal static class SuperTrainingAuditTests
{
    private static readonly int[] Bits = [3,4,7,2,5,6,9,10,13,8,11,12,15,16,19,14,17,18,20,21,22,23,24,25,26,27,28,29,30,31];
    internal static void Run()
    {
        foreach (PKM entity in new PKM[] { new PK6 { Species = 25 }, new PK7 { Species = 25 } }) {
            var regimen = (ISuperTrainRegimen)entity; entity.Data[0x2C] = 3; entity.Data[0x3A] = 0xC0; entity.Data[0x3B] = 0xA5; entity.Data[0x72] = 0xFC; entity.RefreshChecksum();
            byte[] original = entity.Data.ToArray();
            Check(SuperTrainRegimenExtensions.CountRegimen == 30 && SuperTrainRegimenExtensions.CountRegimenDistribution == 6 && Bits.Distinct().Count() == 30, "Source counts and independent map");
            for (int i = 0; i < 30; i++) {
                var copy = entity.Clone(); var r = (ISuperTrainRegimen)copy; r.SetRegimenState(i, true); copy.RefreshChecksum();
                for (int j = 0; j < 30; j++) Check(r.GetRegimenState(j) == (i == j) && Raw(copy, Bits[j]) == (i == j), "Every logical/physical regular flag");
                Check((copy.Data[0x2C] & 3) == 3 && copy.Data[0x3A] == 0xC0 && copy.Data[0x3B] == 0xA5 && copy.Data[0x72] == 0xFC, "Regular edits preserve unused and other training data");
                r.SetRegimenState(i, false); copy.RefreshChecksum(); Check(copy.Data.SequenceEqual(original), "Regular complete entity roundtrip");
            }
            for (int i = 0; i < 6; i++) {
                var copy = entity.Clone(); var r = (ISuperTrainRegimen)copy; r.SetRegimenStateDistribution(i, true); copy.RefreshChecksum();
                Check(copy.Data[0x3A] == (0xC0 | (1 << i)) && copy.Data[0x3B] == 0, "Source distribution setter truncates UInt16 high byte");
                for (int j = 0; j < 6; j++) Check(r.GetRegimenStateDistribution(j) == (i == j), "Every distribution index");
                Check(copy.Data.Slice(0x2C, 4).SequenceEqual(original.AsSpan(0x2C, 4)) && copy.Data[0x72] == 0xFC, "Distribution protects regular/state fields");
            }
            foreach (int index in new[] { -1, 30, int.MaxValue }) { Reject(() => regimen.GetRegimenState(index)); Reject(() => regimen.SetRegimenState(index, true)); Reject(() => SuperTrainRegimenExtensions.GetRegimenName(index)); }
            foreach (int index in new[] { -1, 6, int.MaxValue }) { Reject(() => regimen.GetRegimenStateDistribution(index)); Reject(() => regimen.SetRegimenStateDistribution(index, true)); }
            var state = entity.Clone(); var sr = (ISuperTrainRegimen)state; sr.SecretSuperTrainingUnlocked = true; sr.SuperTrainSupremelyTrained = true; Check(state.Data[0x72] == 0xFF, "Two status bits preserve upper six");
            sr.SecretSuperTrainingUnlocked = false; sr.SuperTrainSupremelyTrained = false; Check(state.Data[0x72] == 0xFC, "Status clearing preserves upper six");
            if (entity is PK6) foreach (int value in Enumerable.Range(0,256)) { var copy = (PK6)entity.Clone(); copy.TrainingBag = (byte)value; copy.TrainingBagHits = (byte)value; Check(copy.Data[0x17] == value && copy.Data[0x16] == value, "Every raw bag/hits byte"); }
            Check(entity.Data.SequenceEqual(original), "Immutable original");
            Console.WriteLine($"PASS SuperTraining source audit {entity.GetType().Name}: 30 logical/physical flags, six distribution flags/high-byte truncation reproduced, status and unused bits, bounds, bag bytes and original; window sequences and production integration pending");
        }
    }
    private static bool Raw(PKM p, int bit) => (p.Data[0x2C + (bit >> 3)] & (1 << (bit & 7))) != 0;
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentOutOfRangeException) { return; } throw new Exception("Invalid SuperTraining index accepted"); }
}
