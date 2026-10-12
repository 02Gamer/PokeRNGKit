// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonMoveShopTests
{
    internal static void Run()
    {
        foreach (ushort species in new ushort[] { 25, 133, 201, 487 })
        foreach (byte level in new byte[] { 1, 25, 100 })
        {
            var entity = new PA8 { Species = species, Language = 2, Version = GameVersion.PLA, OriginalTrainerName = "TEST", Nickname = "TEST", PID = 12345, EncryptionConstant = 54321, MetLevel = 1 };
            entity.CurrentLevel = level; entity.Move1 = 85; entity.Move2 = 98; entity.Move3 = 0; entity.Move4 = 0;
            entity.AlphaMove = 85; entity.PurchasedRecord.Fill(0xA5); entity.MasteredRecord.Fill(0xC3); entity.PurchasedRecord[^1] |= 0xE0; entity.MasteredRecord[^1] |= 0xE0;
            entity.ResetPartyStats(); entity.RefreshChecksum(); byte[] original = entity.Data.ToArray();
            var catalog = PokemonMoveShop.Read(entity, "source");
            Check(catalog.Rows.Length == 61 && catalog.Rows.Select(x => x.Index).SequenceEqual(Enumerable.Range(0, 61)), "All source rows/indexes");
            Check(catalog.Rows.All(x => !string.IsNullOrEmpty(x.Name.Zh) && !string.IsNullOrEmpty(x.Name.En) && !string.IsNullOrEmpty(x.Name.Ja)), "Three language move names");
            Check(catalog.Rows.All(x => !string.IsNullOrEmpty(x.TypeName.Zh) && !string.IsNullOrEmpty(x.TypeName.En) && !string.IsNullOrEmpty(x.TypeName.Ja)), "Three language type names");
            var rows = catalog.Rows.Select(x => new MoveShopRowEdit(x.Index, x.Index % 2 == 0, x.Index % 3 == 0)).Reverse().ToArray();
            foreach (var action in new[] { "save", "current", "all", "clearCurrent", "none", "encounterReset" })
            {
                var edit = new MoveShopEdit(action, action == "encounterReset" ? [] : rows);
                var expected = (PA8)entity.Clone();
                if (action != "encounterReset") foreach (var row in rows) { expected.SetPurchasedRecordFlag(row.Index, row.Purchased); expected.SetMasteredRecordFlag(row.Index, row.Mastered); }
                switch (action) {
                    case "current": expected.SetMoveShopFlags(expected); break;
                    case "all": expected.SetPurchasedFlagsAll(expected); expected.SetMoveShopFlagsAll(expected); break;
                    case "clearCurrent": expected.ClearMoveShopFlags(); expected.SetMoveShopFlags(expected); break;
                    case "none": expected.ClearMoveShopFlags(); break;
                    case "encounterReset": var encounter = new LegalityAnalysis(expected).EncounterMatch; expected.ClearMoveShopFlags(); if (encounter is IMasteryInitialMoveShop8 initial) initial.SetInitialMastery(expected, encounter); expected.SetMoveShopFlags(expected); break;
                }
                expected.RefreshChecksum(); var output = PokemonMoveShop.Prepare(entity, edit);
                Check(output.Data.SequenceEqual(expected.Data), "Independent complete entity action oracle");
                Check(entity.Data.SequenceEqual(original), "Original immutable");
                Check((output.Data[0x15C] & 0xE0) == (original[0x15C] & 0xE0) && (output.Data[0x164] & 0xE0) == (original[0x164] & 0xE0), "Both three-bit tails preserved");
            }
            foreach (int index in Enumerable.Range(0, 61)) {
                var one = catalog.Rows.Select(x => new MoveShopRowEdit(x.Index, x.Purchased, x.Mastered)).ToArray(); one[index] = one[index] with { Purchased = !one[index].Purchased, Mastered = !one[index].Mastered };
                var expected = (PA8)entity.Clone(); expected.SetPurchasedRecordFlag(index, one[index].Purchased); expected.SetMasteredRecordFlag(index, one[index].Mastered); expected.RefreshChecksum();
                Check(PokemonMoveShop.Prepare(entity, new("save", one)).Data.SequenceEqual(expected.Data), "Every flag address including unpermitted rows");
            }
            Reject(() => PokemonMoveShop.Prepare(entity, new("save", rows[..60])));
            Reject(() => PokemonMoveShop.Prepare(entity, new("save", rows.Select(x => x with { Index = 0 }).ToArray())));
            Reject(() => PokemonMoveShop.Prepare(entity, new("unknown", rows)));
            Check(entity.Data.SequenceEqual(original), "Rejected requests preserve original");
            Console.WriteLine($"PASS MoveShop PA8/{species}/level{level}: all61 indices/3-language names, manual unpermitted flags, six source actions/full entity oracle, both reserved tails, rejection and immutable original");
        }
    }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid Move Shop edit accepted"); }
}
