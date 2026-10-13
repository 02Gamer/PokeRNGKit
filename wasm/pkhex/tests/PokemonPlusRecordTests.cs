// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonPlusRecordTests
{
    internal static void Run()
    {
        foreach (var identity in new (ushort Species, byte Form)[] { (1, 0), (25, 0), (133, 0), (479, 0), (479, 1), (720, 0), (720, 1) })
        foreach (byte level in new byte[] { 5, 6, 10, 25, 100 }) {
            var entity = new PA9 { Species = identity.Species, Form = identity.Form, Language = 2, OriginalTrainerName = "TEST", Nickname = "TEST", CurrentLevel = level, Move1 = 7, Move2 = 85, Move3 = 14 };
            entity.PlusFlags0.Fill(0xA5); entity.PlusFlags1.Fill(0xC3); entity.RecordFlagsBase.Fill(0x5A); entity.RecordFlagsDLC.Fill(0x3C); entity.RefreshChecksum();
            byte[] original = entity.Data.ToArray(); var permit = (IPermitPlus)entity.PersonalInfo;
            var catalog = PokemonPlusRecord.Read(entity, "HASH");
            Check(catalog.Rows.Length == 340 && catalog.CountUsed == 340 && catalog.CountTotal == 360 && catalog.Raw.Length == 90 && catalog.HasImpossibleFlags, "Full catalog, capacities and raw tail");
            var legality = new LegalityAnalysis(entity); var possible = new bool[entity.MaxMoveID + 1]; LearnPossible.Get(entity, legality.EncounterMatch, legality.Info.EvoChainsAllGens, possible);
            Span<ushort> moves = stackalloc ushort[4]; entity.GetMoves(moves);
            foreach (var row in catalog.Rows) {
                Check(row.Move == permit.PlusMoveIndexes[row.Index] && row.Flag == Physical(entity, row.Index), "Logical IDs and independent physical read");
                Check(row.CurrentMove == moves.Contains((ushort)row.Move) && row.Learnable == possible[row.Move], "Source current/possible advisory hints");
                Check(new[] { row.Name.Zh, row.Name.En, row.Name.Ja, row.TypeName.Zh, row.TypeName.En, row.TypeName.Ja }.All(s => !string.IsNullOrEmpty(s)), "Three-language names and types");
            }
            var rows = catalog.Rows.Select(r => new PlusRecordRowEdit(r.Index, r.Index % 3 == 0)).Reverse().ToArray();
            foreach (string action in new[] { "save", "legalCurrent", "legalCurrentTM", "legalSeedTM", "clearAfterSave", "none", "parentCurrent" }) {
                bool save = action is not ("none" or "parentCurrent"); var expected = (PA9)entity.Clone();
                if (save) foreach (var row in rows) SetPhysical(expected, row.Index, row.Flag);
                switch (action) {
                    case "none": ((IPlusRecord)expected).ClearPlusFlags(360); break;
                    case "clearAfterSave": expected.SetPlusFlags(permit, PlusRecordApplicatorOption.None); break;
                    case "legalCurrent": case "parentCurrent": expected.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalCurrent); break;
                    case "legalCurrentTM": expected.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalCurrentTM); break;
                    case "legalSeedTM": expected.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalSeedTM); break;
                }
                expected.RefreshChecksum(); var result = PokemonPlusRecord.Prepare(entity, new(action, save ? rows : []));
                Check(result.Data.SequenceEqual(expected.Data) && result.ChecksumValid, "Seven source actions/full entity oracle");
                Check(result.RecordFlagsBase.SequenceEqual(entity.RecordFlagsBase) && result.RecordFlagsDLC.SequenceEqual(entity.RecordFlagsDLC), "Independent technical records protected");
                for (int i = 340; i < 360; i++) Check(Physical(result, i) == (action == "save" && Physical(entity, i)), "Manual reserved bits versus all source suggestion clearing");
            }
            foreach (int i in Enumerable.Range(0, 340)) {
                var single = catalog.Rows.Select(r => new PlusRecordRowEdit(r.Index, r.Flag)).ToArray(); single[i] = single[i] with { Flag = !single[i].Flag };
                var expected = (PA9)entity.Clone(); SetPhysical(expected, i, single[i].Flag); expected.RefreshChecksum();
                Check(PokemonPlusRecord.Prepare(entity, new("save", single)).Data.SequenceEqual(expected.Data), "Every visible flag/full entity independent oracle");
            }
            Reject(() => PokemonPlusRecord.Prepare(entity, new("save", rows[..^1])));
            Reject(() => PokemonPlusRecord.Prepare(entity, new("save", rows.Select(r => r with { Index = 0 }).ToArray())));
            Reject(() => PokemonPlusRecord.Prepare(entity, new("save", rows.Select(r => r.Index == 0 ? r with { Index = 340 } : r).ToArray())));
            Reject(() => PokemonPlusRecord.Prepare(entity, new("none", rows)));
            Reject(() => PokemonPlusRecord.Prepare(entity, new("parentCurrent", rows)));
            Reject(() => PokemonPlusRecord.Prepare(entity, new("forceAll", rows)));
            Check(entity.Data.SequenceEqual(original), "Reads, all edits and rejected requests preserve original");
            Console.WriteLine($"PASS PlusRecord PA9/{identity.Species}/{identity.Form}/Lv{level}: 340 rows, seven source actions, every visible physical bit, full entity oracle, tail/TR preservation, hints/three languages and original");
        }
        Reject(() => PokemonPlusRecord.Read(new PK9 { Species = 25 }, "HASH"));
        Reject(() => PokemonPlusRecord.Read(new PA9(), "HASH"));
    }
    private static int Address(int i) => i < 264 ? 0xD6 + (i >> 3) : 0x94 + ((i - 264) >> 3);
    private static bool Physical(PA9 p, int i) => (p.Data[Address(i)] & (1 << (i & 7))) != 0;
    private static void SetPhysical(PA9 p, int i, bool value) { int address = Address(i), mask = 1 << (i & 7); p.Data[address] = (byte)(value ? p.Data[address] | mask : p.Data[address] & ~mask); }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid PlusRecord edit accepted"); }
}
