// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonTechRecordTests
{
    internal static void Run() {
        foreach (PKM seed in new PKM[] { new PK8(), new PB8(), new PA8(), new PK9(), new PA9() })
        foreach (ushort species in new ushort[] { 25, 133, 129, 487 }) {
            var entity = seed.Clone(); entity.Species = species; entity.Language = 2; entity.OriginalTrainerName = "TEST"; entity.Nickname = "TEST";
            entity.Version = entity is PK8 ? GameVersion.SW : entity is PB8 ? GameVersion.BD : entity is PA8 ? GameVersion.PLA : entity is PK9 ? GameVersion.SL : GameVersion.ZA;
            entity.CurrentLevel = 25; entity.Move1 = 85; entity.Move2 = 14; entity.Move3 = 29; Fill(entity); entity.ResetPartyStats(); entity.RefreshChecksum(); byte[] original = entity.Data.ToArray();
            var catalog = PokemonTechRecord.Read(entity, "source"); var record = (ITechRecord)entity;
            int count = record.Permit.RecordPermitIndexes.Length;
            Check(catalog.Rows.Length == count && catalog.Rows.Select(r => r.Index).SequenceEqual(Enumerable.Range(0, count)), "Full candidate catalog/physical indexes");
            var la = new LegalityAnalysis(entity); var evos = la.Info.EvoChainsAllGens.Get(entity.Context); var ids = record.Permit.RecordPermitIndexes;
            for (int i = 0; i < count; i++) {
                var row = catalog.Rows[i];
                Check(row.Number == i + (entity is PA9 ? 1 : 0) && row.Move == ids[i] && row.Flag == RawFlag(entity, i), "Display separated from independent physical flag");
                Check(row.Permission == (record.Permit.IsRecordPermitted(i) ? "current" : record.IsRecordPermitted(evos, i) ? "evolution" : "suspect"), "Source current/evolution/suspect hints");
                Check(row.CurrentMove == (row.Move == 85 || row.Move == 14 || row.Move == 29), "Source current-move highlighting");
                Check(new[] { row.Name.Zh, row.Name.En, row.Name.Ja, row.TypeName.Zh, row.TypeName.En, row.TypeName.Ja }.All(s => !string.IsNullOrEmpty(s)), "Three-language move/type names");
            }
            var rows = catalog.Rows.Select(r => new TechRecordRowEdit(r.Index, r.Index % 3 == 0)).Reverse().ToArray();
            foreach (string action in new[] { "save", "legalAll", "forceAll", "legalCurrent", "clearAfterSave", "none", "parentCurrent" }) {
                bool save = action is not ("none" or "parentCurrent"); var expected = entity.Clone();
                if (save) foreach (var row in rows) SetRaw(expected, row.Index, row.Flag);
                var expectedRecord = (ITechRecord)expected;
                switch (action) {
                    case "none": expectedRecord.ClearRecordFlags(); break;
                    case "clearAfterSave": expectedRecord.SetRecordFlags(expected, TechnicalRecordApplicatorOption.None); break;
                    case "forceAll": expectedRecord.SetRecordFlags(expected, TechnicalRecordApplicatorOption.ForceAll); break;
                    case "legalAll": expectedRecord.SetRecordFlags(expected, TechnicalRecordApplicatorOption.LegalAll); break;
                    case "legalCurrent": case "parentCurrent": expectedRecord.SetRecordFlags(expected, TechnicalRecordApplicatorOption.LegalCurrent); break;
                }
                expected.RefreshChecksum(); var output = PokemonTechRecord.Prepare(entity, new(action, save ? rows : []));
                Check(output.Data.SequenceEqual(expected.Data), "Every source command/independent physical manual write/full entity Core oracle");
                Check(output.ChecksumValid && entity.Data.SequenceEqual(original), "Checksum and immutable original");
                if (entity is PA8 pa) Check(((PA8)output).MoveRecordFlags[8..].SequenceEqual(pa.MoveRecordFlags[8..]) && ((PA8)output).PurchasedRecord.SequenceEqual(pa.PurchasedRecord) && ((PA8)output).MasteredRecord.SequenceEqual(pa.MasteredRecord), "LA upper TR bits and both shop buffers preserved");
            }
            foreach (int index in Enumerable.Range(0, count)) {
                var single = catalog.Rows.Select(r => new TechRecordRowEdit(r.Index, r.Flag)).ToArray(); single[index] = single[index] with { Flag = !single[index].Flag };
                var expected = entity.Clone(); SetRaw(expected, index, single[index].Flag); expected.RefreshChecksum();
                Check(PokemonTechRecord.Prepare(entity, new("save", single)).Data.SequenceEqual(expected.Data), "Every visible bit, including last candidate and SV DLC boundary");
            }
            Reject(() => PokemonTechRecord.Prepare(entity, new("save", rows[..^1])));
            Reject(() => PokemonTechRecord.Prepare(entity, new("save", rows.Select(r => r with { Index = 0 }).ToArray())));
            Reject(() => PokemonTechRecord.Prepare(entity, new("none", rows)));
            Reject(() => PokemonTechRecord.Prepare(entity, new("parentCurrent", rows)));
            Reject(() => PokemonTechRecord.Prepare(entity, new("unknown", rows)));
            Check(entity.Data.SequenceEqual(original), "Rejected operations preserve all original data");
            Console.WriteLine($"PASS TechRecord {entity.GetType().Name}/{species}: {count} rows, seven actions/full entity oracle, every physical bit, source hints/three languages, reserved/shop protection and rejection");
        }
    }
    private static int Offset(PKM p, int i) => p is G8PKM ? 0x127 + (i >> 3) : p is PA8 ? 0x13F + (i >> 3) : i < 200 ? 0x12F + (i >> 3) : 0x4B + ((i - 200) >> 3);
    private static bool RawFlag(PKM p, int i) => (p.Data[Offset(p, i)] & (1 << (i & 7))) != 0;
    private static void SetRaw(PKM p, int i, bool value) { int offset = Offset(p, i); int mask = 1 << (i & 7); p.Data[offset] = (byte)(value ? p.Data[offset] | mask : p.Data[offset] & ~mask); }
    private static void Fill(PKM p) {
        switch (p) {
            case G8PKM g: g.RecordFlags.Fill(0xA5); break;
            case PA8 a: a.MoveRecordFlags.Fill(0xA5); a.PurchasedRecord.Fill(0x5A); a.MasteredRecord.Fill(0x3C); break;
            case PK9 n: n.RecordFlagsBase.Fill(0xA5); n.RecordFlagsDLC.Fill(0xC3); break;
            case PA9 n: n.RecordFlagsBase.Fill(0xA5); n.RecordFlagsDLC.Fill(0xC3); break;
        }
    }
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } throw new Exception("Invalid technical record request accepted"); }
}
