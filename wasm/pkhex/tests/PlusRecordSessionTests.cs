// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;

internal static class PlusRecordSessionTests
{
    private static readonly string[] Actions = ["save", "legalCurrent", "legalCurrentTM", "legalSeedTM", "clearAfterSave", "none", "parentCurrent"];
    private static PKM Entity(PKM p) {
        p.Species = 25; p.Language = 2; p.OriginalTrainerName = "TEST"; p.Nickname = "TEST"; p.CurrentLevel = 25; p.Move1 = 85; p.Move2 = 14;
        p.Version = GameVersion.ZA;
        var za = (PA9)p; za.PlusFlags0.Fill(0xA5); za.PlusFlags1.Fill(0xC3); za.RecordFlagsBase.Fill(0x5A); za.RecordFlagsDLC.Fill(0x3C);
        p.ResetPartyStats(); p.Stat_HPCurrent = Math.Max(1, p.Stat_HPMax / 2); p.Status_Condition = 8; p.RefreshChecksum(); return p;
    }
    internal static void Run() {
        foreach (PKM p in new PKM[] { Entity(new PA9()) })
        foreach (bool party in new[] { false, true }) foreach (bool encrypted in new[] { false, true }) {
            byte[] input = StandalonePokemon.Serialize(p, party, encrypted); byte[] original = input.ToArray();
            var target = new PlusRecordTarget("file", FileName: $"entity.{p.GetType().Name.ToLowerInvariant()}", InputEncrypted: encrypted, UseFileFormat: true);
            var catalog = PlusRecordSession.Read(input, target); var rows = Rows(catalog);
            var publicCatalog = JsonSerializer.Deserialize(SaveService.ReadPlusRecords(input, JsonSerializer.Serialize(target, SaveJsonContext.Default.PlusRecordTarget)), SaveJsonContext.Default.PlusRecordCatalog)!;
            Check(publicCatalog.Raw == catalog.Raw && publicCatalog.Rows.Length == 340 && publicCatalog.SourceHash == catalog.SourceHash, "Public JSON catalog");
            foreach (string action in Actions) {
                var request = new PlusRecordRequest(catalog.SourceHash, target, new(action, NeedsRows(action) ? rows : []));
                var ticket = PlusRecordSession.Prepare(input, request);
                Check(PlusRecordSession.Commit(input, Confirmation(ticket)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(Oracle(p, action, rows), party, false)), "Every standalone action/full exact file oracle");
                Check(ticket.ChangedFlags.All(i => i < Convert.FromHexString(catalog.Raw).Length * 8), "Complete raw flag difference bounds");
                if (action != "save") Check(ticket.ChangedFlags.Any(i => i >= 340), "Cleared reserved tail remains in preview evidence");
            }
            var manual = new PlusRecordRequest(catalog.SourceHash, target, new("save", rows));
            var publicTicket = JsonSerializer.Deserialize(SaveService.PreviewPlusRecords(input, JsonSerializer.Serialize(manual, SaveJsonContext.Default.PlusRecordRequest)), SaveJsonContext.Default.PlusRecordTicket)!;
            Check(SaveService.CommitPlusRecords(input, JsonSerializer.Serialize(Confirmation(publicTicket), SaveJsonContext.Default.PlusRecordConfirmation)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(Oracle(p, "save", rows), party, false)), "Public JSON full output");
            var abandoned = PlusRecordSession.Prepare(input, manual); Reject(() => SaveService.PreviewPlusRecords(input, "{}")); Reject(() => PlusRecordSession.Commit(input, Confirmation(abandoned)));
            Reject(() => JsonSerializer.Deserialize("{}", SaveJsonContext.Default.PlusRecordConfirmation)); Reject(() => JsonSerializer.Deserialize("{}", SaveJsonContext.Default.PlusRecordEdit));
            Lifecycle(input, () => PlusRecordSession.Prepare(input, manual));
            Check(input.AsSpan().SequenceEqual(original), "Standalone original preserved");
            Console.WriteLine($"PASS PlusRecord file {p.GetType().Name}/party={party}/encrypted={encrypted}: seven actions/full file oracle, complete raw changes, target-bound frozen lifecycle and immutable original");
        }
        foreach (SaveFile seed in new SaveFile[] { new SAV9ZA(ZaBlockFixtureTests.Create(2)) }) {
            var p = Entity(seed.BlankPKM); seed.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None); seed.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            byte[] input = seed.Write().ToArray(); byte[] original = input.ToArray();
            foreach (int box in new[] { -1, 0 }) {
                var target = new PlusRecordTarget("save", Box: box, Slot: 0); var before = PokemonEditing.Read(seed, box, 0);
                var catalog = PokemonPlusRecord.Read(before, Br4Editing.Hash(input)); var rows = Rows(catalog);
                foreach (string action in Actions) {
                    var request = new PlusRecordRequest(catalog.SourceHash, target, new(action, NeedsRows(action) ? rows : []));
                    var ticket = PlusRecordSession.Prepare(seed, input, request); var expected = Oracle(before, action, rows); var oracle = seed.Clone();
                    if (box == -1) oracle.SetPartySlotAtIndex(expected, 0, EntityImportSettings.None); else oracle.SetBoxSlotAtIndex(expected, 0, 0, EntityImportSettings.None);
                    Check(PlusRecordSession.Commit(input, Confirmation(ticket)).AsSpan().SequenceEqual(oracle.Write().Span), "Every save action/full file Core oracle");
                }
                var manual = new PlusRecordRequest(catalog.SourceHash, target, new("save", rows));
                Lifecycle(input, () => PlusRecordSession.Prepare(seed, input, manual));
                Check(input.AsSpan().SequenceEqual(original) && seed.Write().Span.SequenceEqual(original), "Save original and seed preserved");
                Console.WriteLine($"PASS PlusRecord typed {seed.GetType().Name}/box={box}: seven actions/full save oracle, party state/storage, frozen target lifecycle and original; public recognition/real save not accepted");
            }
        }
    }
    private static PlusRecordRowEdit[] Rows(PlusRecordCatalog catalog) => catalog.Rows.Select(r => new PlusRecordRowEdit(r.Index, r.Index % 3 == 0)).Reverse().ToArray();
    private static bool NeedsRows(string action) => action is not ("none" or "parentCurrent");
    private static PKM Oracle(PKM source, string action, PlusRecordRowEdit[] rows) {
        var expected = (PA9)source.Clone(); var permit = (IPermitPlus)expected.PersonalInfo;
        if (NeedsRows(action)) foreach (var row in rows) expected.SetMovePlusFlag(row.Index, row.Flag);
        switch (action) {
            case "none": ((IPlusRecord)expected).ClearPlusFlags(permit.PlusCountTotal); break;
            case "clearAfterSave": expected.SetPlusFlags(permit, PlusRecordApplicatorOption.None); break;
            case "legalSeedTM": expected.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalSeedTM); break;
            case "legalCurrentTM": expected.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalCurrentTM); break;
            case "legalCurrent": case "parentCurrent": expected.SetPlusFlags(permit, PlusRecordApplicatorOption.LegalCurrent); break;
        }
        expected.RefreshChecksum(); return expected;
    }
    private static PlusRecordConfirmation Confirmation(PlusRecordTicket t) => new(t.Token, t.SourceHash, t.TargetHash, t.Target);
    private static void Lifecycle(byte[] input, Func<PlusRecordTicket> prepare) {
        var old = prepare(); var fresh = prepare(); PlusRecordSession.Discard(old.Token); Reject(() => PlusRecordSession.Commit(input, Confirmation(old)));
        Reject(() => PlusRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { Slot = 1 } }));
        Reject(() => PlusRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { Box = fresh.Target.Box + 1 } }));
        Reject(() => PlusRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { FileName = "other.pk8" } }));
        Reject(() => PlusRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { InputEncrypted = !fresh.Target.InputEncrypted } }));
        Reject(() => PlusRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { UseFileFormat = !fresh.Target.UseFileFormat } }));
        Reject(() => PlusRecordSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { Kind = fresh.Target.Kind == "file" ? "save" : "file" } }));
        var stale = input.ToArray(); stale[0] ^= 1; Reject(() => PlusRecordSession.Commit(stale, Confirmation(fresh)));
        PlusRecordSession.Commit(input, Confirmation(fresh)); Reject(() => PlusRecordSession.Commit(input, Confirmation(fresh)));
        var failure = prepare(); Reject(() => PlusRecordSession.Prepare(input, new("stale", failure.Target, new("save", [])))); Reject(() => PlusRecordSession.Commit(input, Confirmation(failure)));
        var cancelled = prepare(); PlusRecordSession.Discard(cancelled.Token); Reject(() => PlusRecordSession.Commit(input, Confirmation(cancelled)));
    }
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } catch (JsonException) { return; } throw new Exception("Invalid plus record session accepted"); }
}
