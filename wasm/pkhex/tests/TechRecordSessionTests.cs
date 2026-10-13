// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;

internal static class TechRecordSessionTests
{
    private static readonly string[] Actions = ["save", "legalAll", "forceAll", "legalCurrent", "clearAfterSave", "none", "parentCurrent"];
    private static PKM Entity(PKM p) {
        p.Species = 25; p.Language = 2; p.OriginalTrainerName = "TEST"; p.Nickname = "TEST"; p.CurrentLevel = 25; p.Move1 = 85; p.Move2 = 14;
        p.Version = p is PK8 ? GameVersion.SW : p is PB8 ? GameVersion.BD : p is PA8 ? GameVersion.PLA : p is PK9 ? GameVersion.SL : GameVersion.ZA;
        switch (p) {
            case G8PKM g: g.RecordFlags.Fill(0xA5); break;
            case PA8 a: a.MoveRecordFlags.Fill(0xA5); a.PurchasedRecord.Fill(0x5A); a.MasteredRecord.Fill(0x3C); break;
            case PK9 n: n.RecordFlagsBase.Fill(0xA5); n.RecordFlagsDLC.Fill(0xC3); break;
            case PA9 n: n.RecordFlagsBase.Fill(0xA5); n.RecordFlagsDLC.Fill(0xC3); break;
        }
        p.ResetPartyStats(); p.Stat_HPCurrent = Math.Max(1, p.Stat_HPMax / 2); p.Status_Condition = 8; p.RefreshChecksum(); return p;
    }
    internal static void Run() {
        foreach (PKM p in new PKM[] { Entity(new PK8()), Entity(new PB8()), Entity(new PA8()), Entity(new PK9()), Entity(new PA9()) })
        foreach (bool party in new[] { false, true }) foreach (bool encrypted in new[] { false, true }) {
            byte[] input = StandalonePokemon.Serialize(p, party, encrypted); byte[] original = input.ToArray();
            var target = new TechRecordTarget("file", FileName: $"entity.{p.GetType().Name.ToLowerInvariant()}", InputEncrypted: encrypted, UseFileFormat: true);
            var catalog = TechRecordSession.Read(input, target); var rows = Rows(catalog);
            var publicCatalog = JsonSerializer.Deserialize(SaveService.ReadTechRecords(input, JsonSerializer.Serialize(target, SaveJsonContext.Default.TechRecordTarget)), SaveJsonContext.Default.TechRecordCatalog)!;
            Check(publicCatalog.Raw == catalog.Raw && publicCatalog.Rows.Length == catalog.Rows.Length && publicCatalog.SourceHash == catalog.SourceHash, "Public file JSON catalog");
            foreach (string action in Actions) {
                var request = new TechRecordRequest(catalog.SourceHash, target, new(action, NeedsRows(action) ? rows : []));
                var ticket = TechRecordSession.Prepare(input, request);
                Check(TechRecordSession.Commit(input, Confirmation(ticket)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(Oracle(p, action, rows), party, false)), "Every standalone action/full exact file oracle");
                Check(ticket.ChangedFlags.All(i => i < Convert.FromHexString(catalog.Raw).Length * 8), "Complete raw flag difference bounds");
                if (p is PA9 && action == "forceAll") Check(ticket.ChangedFlags.Any(i => i >= 160), "ZA non-visible source ForceAll changes remain in preview evidence");
            }
            var manual = new TechRecordRequest(catalog.SourceHash, target, new("save", rows));
            var publicTicket = JsonSerializer.Deserialize(SaveService.PreviewTechRecords(input, JsonSerializer.Serialize(manual, SaveJsonContext.Default.TechRecordRequest)), SaveJsonContext.Default.TechRecordTicket)!;
            Check(SaveService.CommitTechRecords(input, JsonSerializer.Serialize(Confirmation(publicTicket), SaveJsonContext.Default.TechRecordConfirmation)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(Oracle(p, "save", rows), party, false)), "Public JSON confirmation/full file oracle");
            var abandoned = TechRecordSession.Prepare(input, manual); Reject(() => SaveService.PreviewTechRecords(input, "{}")); Reject(() => TechRecordSession.Commit(input, Confirmation(abandoned)));
            Reject(() => JsonSerializer.Deserialize("{}", SaveJsonContext.Default.TechRecordConfirmation)); Reject(() => JsonSerializer.Deserialize("{}", SaveJsonContext.Default.TechRecordEdit));
            Lifecycle(input, () => TechRecordSession.Prepare(input, manual));
            Check(input.AsSpan().SequenceEqual(original), "Standalone original preserved");
            Console.WriteLine($"PASS TechRecord file {p.GetType().Name}/party={party}/encrypted={encrypted}: seven actions/full file oracle, complete raw changes, target-bound frozen lifecycle and immutable original");
        }
        foreach (SaveFile seed in new SaveFile[] { new SAV8SWSH(SwshBlockFixtureTests.Create(GameVersion.SW, 2)), new SAV8BS(File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav")), new SAV8LA(LegendsPokedexTests.Fixture(1)), new SAV9SV(SvBlockFixtureTests.Create(GameVersion.SL, 2)), new SAV9ZA(ZaBlockFixtureTests.Create(2)) }) {
            var p = Entity(seed.BlankPKM); seed.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None); seed.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            byte[] input = seed.Write().ToArray(); byte[] original = input.ToArray();
            foreach (int box in new[] { -1, 0 }) {
                var target = new TechRecordTarget("save", Box: box, Slot: 0); var before = PokemonEditing.Read(seed, box, 0);
                var catalog = PokemonTechRecord.Read(before, Br4Editing.Hash(input)); var rows = Rows(catalog);
                foreach (string action in Actions) {
                    var request = new TechRecordRequest(catalog.SourceHash, target, new(action, NeedsRows(action) ? rows : []));
                    var ticket = TechRecordSession.Prepare(seed, input, request); var expected = Oracle(before, action, rows); var oracle = seed.Clone();
                    if (box == -1) oracle.SetPartySlotAtIndex(expected, 0, EntityImportSettings.None); else oracle.SetBoxSlotAtIndex(expected, 0, 0, EntityImportSettings.None);
                    Check(TechRecordSession.Commit(input, Confirmation(ticket)).AsSpan().SequenceEqual(oracle.Write().Span), "Every save action/full file Core oracle");
                }
                var manual = new TechRecordRequest(catalog.SourceHash, target, new("save", rows));
                Lifecycle(input, () => TechRecordSession.Prepare(seed, input, manual));
                Check(input.AsSpan().SequenceEqual(original) && seed.Write().Span.SequenceEqual(original), "Save original and seed preserved");
                Console.WriteLine($"PASS TechRecord typed {seed.GetType().Name}/box={box}: seven actions/full save oracle, party state/storage, frozen target lifecycle and original; public recognition/real save not accepted");
            }
        }
    }
    private static TechRecordRowEdit[] Rows(TechRecordCatalog catalog) => catalog.Rows.Select(r => new TechRecordRowEdit(r.Index, r.Index % 3 == 0)).Reverse().ToArray();
    private static bool NeedsRows(string action) => action is not ("none" or "parentCurrent");
    private static PKM Oracle(PKM source, string action, TechRecordRowEdit[] rows) {
        var expected = source.Clone(); var record = (ITechRecord)expected;
        if (NeedsRows(action)) foreach (var row in rows) record.SetMoveRecordFlag(row.Index, row.Flag);
        switch (action) {
            case "none": record.ClearRecordFlags(); break;
            case "clearAfterSave": record.SetRecordFlags(expected, TechnicalRecordApplicatorOption.None); break;
            case "forceAll": record.SetRecordFlags(expected, TechnicalRecordApplicatorOption.ForceAll); break;
            case "legalAll": record.SetRecordFlags(expected, TechnicalRecordApplicatorOption.LegalAll); break;
            case "legalCurrent": case "parentCurrent": record.SetRecordFlags(expected, TechnicalRecordApplicatorOption.LegalCurrent); break;
        }
        expected.RefreshChecksum(); return expected;
    }
    private static TechRecordConfirmation Confirmation(TechRecordTicket t) => new(t.Token, t.SourceHash, t.TargetHash, t.Target);
    private static void Lifecycle(byte[] input, Func<TechRecordTicket> prepare) {
        var old = prepare(); var fresh = prepare(); TechRecordSession.Discard(old.Token); Reject(() => TechRecordSession.Commit(input, Confirmation(old)));
        Reject(() => TechRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { Slot = 1 } }));
        Reject(() => TechRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { Box = fresh.Target.Box + 1 } }));
        Reject(() => TechRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { FileName = "other.pk8" } }));
        Reject(() => TechRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { InputEncrypted = !fresh.Target.InputEncrypted } }));
        Reject(() => TechRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { UseFileFormat = !fresh.Target.UseFileFormat } }));
        Reject(() => TechRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { Kind = fresh.Target.Kind == "file" ? "save" : "file" } }));
        var stale = input.ToArray(); stale[0] ^= 1; Reject(() => TechRecordSession.Commit(stale, Confirmation(fresh)));
        TechRecordSession.Commit(input, Confirmation(fresh)); Reject(() => TechRecordSession.Commit(input, Confirmation(fresh)));
        var failure = prepare(); Reject(() => TechRecordSession.Prepare(input, new("stale", failure.Target, new("save", [])))); Reject(() => TechRecordSession.Commit(input, Confirmation(failure)));
        var cancelled = prepare(); TechRecordSession.Discard(cancelled.Token); Reject(() => TechRecordSession.Commit(input, Confirmation(cancelled)));
    }
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } catch (JsonException) { return; } throw new Exception("Invalid technical record session accepted"); }
}
