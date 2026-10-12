// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;

internal static class MoveShopSessionTests
{
    private static PA8 Entity() {
        var p = new PA8 { Species = 25, Language = 2, Version = GameVersion.PLA, OriginalTrainerName = "TEST", Nickname = "TEST", PID = 12345, EncryptionConstant = 54321, MetLevel = 1, Move1 = 85, Move2 = 98 };
        p.CurrentLevel = 25; p.PurchasedRecord.Fill(0xA5); p.MasteredRecord.Fill(0xC3); p.ResetPartyStats(); p.Stat_HPCurrent = Math.Max(1, p.Stat_HPMax / 2); p.Status_Condition = 8; p.RefreshChecksum(); return p;
    }
    internal static void Run()
    {
        foreach (bool party in new[] { false, true }) foreach (bool encrypted in new[] { false, true }) {
            var p = Entity(); byte[] input = StandalonePokemon.Serialize(p, party, encrypted); byte[] original = input.ToArray();
            var target = new MoveShopTarget("file", FileName: "entity.pa8", InputEncrypted: encrypted, UseFileFormat: true);
            var catalog = MoveShopSession.Read(input, target); var rows = catalog.Rows.Select(r => new MoveShopRowEdit(r.Index, false, true)).ToArray();
            var publicRead = JsonSerializer.Deserialize(SaveService.ReadMoveShop(input, JsonSerializer.Serialize(target, SaveJsonContext.Default.MoveShopTarget)), SaveJsonContext.Default.MoveShopCatalog)!;
            Check(publicRead.SourceHash == catalog.SourceHash && publicRead.Rows.Length == 61, "Public file JSON catalog");
            var request = new MoveShopRequest(catalog.SourceHash, target, new("save", rows));
            var ticket = MoveShopSession.Prepare(input, request); var expected = (PA8)p.Clone();
            foreach (var row in rows) { expected.SetPurchasedRecordFlag(row.Index, row.Purchased); expected.SetMasteredRecordFlag(row.Index, row.Mastered); } expected.RefreshChecksum();
            Check(MoveShopSession.Commit(input, Confirmation(ticket)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected, party, false)), "Standalone full serialized oracle");
            var publicTicket = JsonSerializer.Deserialize(SaveService.PreviewMoveShop(input, JsonSerializer.Serialize(request, SaveJsonContext.Default.MoveShopRequest)), SaveJsonContext.Default.MoveShopTicket)!;
            Check(SaveService.CommitMoveShop(input, JsonSerializer.Serialize(Confirmation(publicTicket), SaveJsonContext.Default.MoveShopConfirmation)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(expected, party, false)), "Public JSON frozen exact output");
            var abandoned = MoveShopSession.Prepare(input, request); Reject(() => SaveService.PreviewMoveShop(input, "{}")); Reject(() => MoveShopSession.Commit(input, Confirmation(abandoned)));
            Reject(() => JsonSerializer.Deserialize("{}", SaveJsonContext.Default.MoveShopConfirmation));
            Reject(() => JsonSerializer.Deserialize("{}", SaveJsonContext.Default.MoveShopEdit));
            foreach (string action in new[] { "save", "current", "all", "clearCurrent", "none", "encounterReset" }) {
                var next = request with { Edit = new(action, action == "encounterReset" ? [] : rows) };
                var frozen = MoveShopSession.Prepare(input, next);
                Check(MoveShopSession.Commit(input, Confirmation(frozen)).AsSpan().SequenceEqual(StandalonePokemon.Serialize(Oracle(p, action, rows), party, false)), "Every file action/full serialized oracle");
            }
            Lifecycle(input, () => MoveShopSession.Prepare(input, request)); Check(input.AsSpan().SequenceEqual(original), "Standalone original immutable");
            Console.WriteLine($"PASS MoveShop file party={party}/encrypted={encrypted}: exact file width/Core serialization, frozen hash and complete output, target binding, replacement/stale/cancel/failure/one-time and original");
        }
        foreach (int revision in new[] { 0, 1 }) foreach (int box in new[] { -1, 0 }) {
            var seed = new SAV8LA(LegendsPokedexTests.Fixture(revision)); var p = Entity();
            seed.SetBoxSlotAtIndex(p, 0, 0, EntityImportSettings.None); seed.SetPartySlotAtIndex(p, 0, EntityImportSettings.None);
            byte[] input = seed.Write().ToArray(); byte[] original = input.ToArray(); var source = new SAV8LA(input.ToArray());
            var target = new MoveShopTarget("save", Box: box, Slot: 0); var before = PokemonEditing.Read(source, box, 0);
            var catalog = PokemonMoveShop.Read(before, Br4Editing.Hash(input)); var rows = catalog.Rows.Select(r => new MoveShopRowEdit(r.Index, true, false)).ToArray();
            var request = new MoveShopRequest(catalog.SourceHash, target, new("none", rows)); var ticket = MoveShopSession.Prepare(source, input, request);
            var expected = (PA8)before.Clone(); foreach (var row in rows) { expected.SetPurchasedRecordFlag(row.Index, true); expected.SetMasteredRecordFlag(row.Index, false); } expected.ClearMoveShopFlags(); expected.RefreshChecksum();
            var oracle = source.Clone(); if (box == -1) oracle.SetPartySlotAtIndex(expected, 0, EntityImportSettings.None); else oracle.SetBoxSlotAtIndex(expected, 0, 0, EntityImportSettings.None);
            Check(MoveShopSession.Commit(input, Confirmation(ticket)).AsSpan().SequenceEqual(oracle.Write().Span), "Save full-file source oracle");
            foreach (string action in new[] { "save", "current", "all", "clearCurrent", "none", "encounterReset" }) {
                var next = request with { Edit = new(action, action == "encounterReset" ? [] : rows) };
                var frozen = MoveShopSession.Prepare(source, input, next); var expectedEntity = Oracle((PA8)before, action, rows); var expectedSave = source.Clone();
                if (box == -1) expectedSave.SetPartySlotAtIndex(expectedEntity, 0, EntityImportSettings.None); else expectedSave.SetBoxSlotAtIndex(expectedEntity, 0, 0, EntityImportSettings.None);
                Check(MoveShopSession.Commit(input, Confirmation(frozen)).AsSpan().SequenceEqual(expectedSave.Write().Span), "Every save action/full file oracle");
            }
            Lifecycle(input, () => MoveShopSession.Prepare(source, input, request)); Check(source.Write().Span.SequenceEqual(original) && input.AsSpan().SequenceEqual(original), "Save original immutable");
            Console.WriteLine($"PASS MoveShop typed LA/revision{revision}/box{box}: full save oracle, party health/stats/storage and original preserved, frozen target lifecycle; public recognition/real save not accepted");
        }
    }
    private static PA8 Oracle(PA8 source, string action, MoveShopRowEdit[] rows) {
        var expected = (PA8)source.Clone();
        if (action != "encounterReset") foreach (var row in rows) { expected.SetPurchasedRecordFlag(row.Index, row.Purchased); expected.SetMasteredRecordFlag(row.Index, row.Mastered); }
        switch (action) {
            case "current": expected.SetMoveShopFlags(expected); break;
            case "all": expected.SetPurchasedFlagsAll(expected); expected.SetMoveShopFlagsAll(expected); break;
            case "clearCurrent": expected.ClearMoveShopFlags(); expected.SetMoveShopFlags(expected); break;
            case "none": expected.ClearMoveShopFlags(); break;
            case "encounterReset": var encounter = new LegalityAnalysis(expected).EncounterMatch; expected.ClearMoveShopFlags(); if (encounter is IMasteryInitialMoveShop8 initial) initial.SetInitialMastery(expected, encounter); expected.SetMoveShopFlags(expected); break;
        }
        expected.RefreshChecksum(); return expected;
    }
    private static MoveShopConfirmation Confirmation(MoveShopTicket t) => new(t.Token, t.SourceHash, t.TargetHash, t.Target);
    private static void Lifecycle(byte[] input, Func<MoveShopTicket> prepare) {
        var old = prepare(); var fresh = prepare(); MoveShopSession.Discard(old.Token); Reject(() => MoveShopSession.Commit(input, Confirmation(old)));
        Reject(() => MoveShopSession.Commit(input, Confirmation(fresh) with { Target = fresh.Target with { Slot = 1 } }));
        var stale = input.ToArray(); stale[0] ^= 1; Reject(() => MoveShopSession.Commit(stale, Confirmation(fresh)));
        MoveShopSession.Commit(input, Confirmation(fresh)); Reject(() => MoveShopSession.Commit(input, Confirmation(fresh)));
        var failed = prepare(); Reject(() => MoveShopSession.Prepare(input, new("stale", failed.Target, new("save", [])))); Reject(() => MoveShopSession.Commit(input, Confirmation(failed)));
        var cancelled = prepare(); MoveShopSession.Discard(cancelled.Token); Reject(() => MoveShopSession.Commit(input, Confirmation(cancelled)));
    }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } catch (JsonException) { return; } throw new Exception("Invalid Move Shop session accepted"); }
}
