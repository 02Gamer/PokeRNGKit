// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
using PokeRNGKit.SaveEditor;

internal static class WondercardEditingTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { bool rejected = false; try { action(); } catch (Exception e) when (e is ArgumentException or FormatException) { rejected = true; } Check(rejected, "Invalid Wondercard request accepted"); }
    private static DataMysteryGift Item(SaveFile save, int item, int id) => save switch
    {
        SAV4 => new PGT { IsItem = true, ItemID = item },
        SAV5 => new PGF { IsItem = true, ItemID = item, CardID = id },
        SAV6 => new WC6 { IsItem = true, ItemID = item, CardID = id, Date = new DateOnly(2020, 1, 1) },
        SAV7 => new WC7 { IsItem = true, ItemID = item, CardID = id },
        SAV7b => new WR7 { IsItem = true, ItemID = item, CardID = id },
        _ => throw new Exception("Unsupported fixture"),
    };
    private static byte[] SourceSave(byte[] bytes, Action<SaveFile, IMysteryGiftStorage, List<DataMysteryGift>, List<int>> mutate)
    {
        var save = SaveUtil.GetSaveFile(bytes.ToArray())!; var cards = ((IMysteryGiftStorageProvider)save).MysteryGiftStorage; var flags = (IMysteryGiftFlags)cards;
        var gifts = Enumerable.Range(0, cards.GiftCountMax).Select(cards.GetMysteryGift).ToList(); if (save is SAV4HGSS hg) gifts.Add(hg.LockCapsuleSlot);
        var received = Enumerable.Range(1, flags.MysteryGiftReceivedFlagMax - 1).Where(flags.GetMysteryGiftReceivedFlag).ToList();
        mutate(save, cards, gifts, received);
        flags.ClearReceivedFlags(); foreach (int id in received.Distinct()) flags.SetMysteryGiftReceivedFlag(id, true);
        if (cards is MysteryBlock4 four) { four.IsDeliveryManActive = gifts.Any(g => !g.IsEmpty); MysteryBlock4.UpdateSlotPGT(gifts.ToArray(), save is SAV4HGSS); if (save is SAV4HGSS hgss) hgss.LockCapsuleSlot = (PCD)gifts[^1]; }
        for (int i = 0; i < cards.GiftCountMax; i++) cards.SetMysteryGift(i, gifts[i]); if (cards is MysteryBlock5 five) five.EndAccess();
        return save.Write().ToArray();
    }
    internal static void Run()
    {
        foreach (string name in new[] { "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "GP" })
        {
            var original = File.ReadAllBytes($".tmp/pkhex-fixtures/{name}.sav"); var before = original.ToArray();
            var source = SaveUtil.GetSaveFile(original.ToArray())!; var raw = source.Data.ToArray();
            var catalog = new WondercardEditing(source).Read(Br4Editing.Hash(original));
            var publicCatalog = JsonSerializer.Deserialize(SaveService.ReadWondercard(original), SaveJsonContext.Default.WondercardCatalog)!;
            Check(publicCatalog.Album.Length == catalog.Album.Length && publicCatalog.SourceHash == catalog.SourceHash, "Public complete source-generated album JSON");
            Check(publicCatalog.CanEdit && catalog.CanEdit, "Valid serialized source stays editable after decrypting the cloned album");
            var storage = ((IMysteryGiftStorageProvider)source).MysteryGiftStorage;
            Check(catalog.Album.Length == storage.GiftCountMax + (source is SAV4HGSS ? 1 : 0), "Complete source album including Lock Capsule");
            Check(source.Data.SequenceEqual(raw) && original.SequenceEqual(before), "Reading leaves encrypted source immutable");
            var actual = WondercardEditing.Prepare(original, [new("received", Index: 123, Value: true), new("save")]);
            var oracle = SaveUtil.GetSaveFile(original.ToArray())!; var cards = ((IMysteryGiftStorageProvider)oracle).MysteryGiftStorage; var flags = (IMysteryGiftFlags)cards;
            var gifts = Enumerable.Range(0, cards.GiftCountMax).Select(cards.GetMysteryGift).ToList(); if (oracle is SAV4HGSS hg) gifts.Add(hg.LockCapsuleSlot);
            var received = Enumerable.Range(1, flags.MysteryGiftReceivedFlagMax - 1).Where(flags.GetMysteryGiftReceivedFlag).ToList(); received.Add(123);
            flags.ClearReceivedFlags(); foreach (int id in received) flags.SetMysteryGiftReceivedFlag(id, true);
            if (cards is MysteryBlock4 four) { four.IsDeliveryManActive = gifts.Any(g => !g.IsEmpty); MysteryBlock4.UpdateSlotPGT(gifts.ToArray(), oracle is SAV4HGSS); if (oracle is SAV4HGSS fourHg) fourHg.LockCapsuleSlot = (PCD)gifts[^1]; }
            for (int i = 0; i < cards.GiftCountMax; i++) cards.SetMysteryGift(i, gifts[i]); if (cards is MysteryBlock5 five) five.EndAccess();
            Check(actual.Output.SequenceEqual(oracle.Write().ToArray()), "Received/save ordering independent complete-file source oracle");
            Check(original.SequenceEqual(before), "Preparing keeps original bytes");
            // The shared SAV5 blank fixture contains arbitrary decrypted album bytes, not empty cards.
            // Retain the raw-fixture test above; create a deliberate source-cleared album for action scenarios.
            original = SourceSave(original, (_, _, list, ids) => { foreach (var gift in list) gift.Clear(); ids.Clear(); });
            before = original.ToArray(); source = SaveUtil.GetSaveFile(original.ToArray())!;
            catalog = new WondercardEditing(source).Read(Br4Editing.Hash(original));
            var gift1 = Item(source, 1, 123); var gift2 = Item(source, 2, 124);
            var a1 = new WondercardAction("set", Index: 5, Data: Convert.ToBase64String(gift1.Write()), FileName: "gift." + gift1.Type.ToLowerInvariant());
            var a2 = new WondercardAction("set", Index: 5, Data: Convert.ToBase64String(gift2.Write()), FileName: "gift." + gift2.Type.ToLowerInvariant());
            var populated = WondercardEditing.Prepare(original, [a1, a2]);
            var expected = SourceSave(original, (_, _, list, ids) => { list[0] = gift1.Clone(); list[1] = gift2.Clone(); if (gift1.CardID >= 0) ids.Add(gift1.CardID); if (gift2.CardID >= 0) ids.Add(gift2.CardID); });
            Check(populated.Output.SequenceEqual(expected), "Source first-empty relocation/set full-file oracle " + name + " before-empty=" + string.Join(',', catalog.Album.Where(e => e.Empty).Select(e => e.Index)) + " differences=" + string.Join(',', Enumerable.Range(0, expected.Length).Where(i => expected[i] != populated.Output[i]).Take(20)));
            var swapped = WondercardEditing.Prepare(populated.Output, [new("swap", Index: 0, Source: 1)]);
            Check(swapped.Output.SequenceEqual(SourceSave(populated.Output, (_, _, list, _) => (list[0], list[1]) = (list[1], list[0]))), "Occupied swap source parity");
            var deleted = WondercardEditing.Prepare(populated.Output, [new("delete", Index: 0)]);
            Check(deleted.Output.SequenceEqual(SourceSave(populated.Output, (_, _, list, _) => { list[0].Clear(); (list[0], list[1]) = (list[1], list[0]); })), "Delete/shuffle source full-file parity");
            if (source is not SAV7b)
            {
                var used = WondercardEditing.Prepare(populated.Output, [new("usedAll", Value: true)]);
                Check(used.Output.SequenceEqual(SourceSave(populated.Output, (_, _, list, _) => { foreach (var gift in list) gift.GiftUsed = true; })), "All-used source semantics including PGT no-op");
                var qr = QRMessageUtil.GetMessage(gift1);
                Check(WondercardEditing.Prepare(original, [new("qrSet", Index: 5, Data: qr)]).Output.SequenceEqual(WondercardEditing.Prepare(original, [a1]).Output), "QR payload local parsing/regular set source parity");
            }
            else Reject(() => WondercardEditing.Prepare(original, [new("usedAll", Value: true)]));
            Reject(() => WondercardEditing.Prepare(original, [new("delete", Index: -1)]));
            Reject(() => WondercardEditing.Prepare(original, [a1 with { Data = "bad-base64" }]));
            var request = new WondercardRequest(Br4Editing.Hash(original), [a1, a2]);
            var ticket = WondercardSession.Prepare(original, request); var confirm = new WondercardConfirmation(ticket.Token, ticket.SourceHash, ticket.TargetHash, false);
            if (ticket.Issues.Length > 0) Reject(() => WondercardSession.Commit(original, confirm));
            var committed = WondercardSession.Commit(original, confirm with { AcceptIssues = true });
            Check(committed.SequenceEqual(populated.Output) && Br4Editing.Hash(committed) == ticket.TargetHash, "Frozen exact output and source issue acknowledgment");
            Reject(() => WondercardSession.Commit(original, confirm with { AcceptIssues = true }));
            var old = WondercardSession.Prepare(original, request); var fresh = WondercardSession.Prepare(original, request); WondercardSession.Discard(old.Token);
            Reject(() => WondercardSession.Commit(original, new(old.Token, old.SourceHash, old.TargetHash, true)));
            var stale = original.ToArray(); stale[0] ^= 1; Reject(() => WondercardSession.Commit(stale, new(fresh.Token, fresh.SourceHash, fresh.TargetHash, true)));
            WondercardSession.Commit(original, new(fresh.Token, fresh.SourceHash, fresh.TargetHash, true));
            var failing = WondercardSession.Prepare(original, request); Reject(() => WondercardSession.Prepare(original, request with { Actions = [new("Missing")] }));
            Reject(() => WondercardSession.Commit(original, new(failing.Token, failing.SourceHash, failing.TargetHash, true)));
            Check(original.SequenceEqual(before), "All action/session failures preserve original");
            var publicTicket = JsonSerializer.Deserialize(SaveService.PreviewWondercard(original, JsonSerializer.Serialize(request, SaveJsonContext.Default.WondercardRequest)), SaveJsonContext.Default.WondercardTicket)!;
            var publicOutput = SaveService.CommitWondercard(original, JsonSerializer.Serialize(new WondercardConfirmation(publicTicket.Token, publicTicket.SourceHash, publicTicket.TargetHash, true), SaveJsonContext.Default.WondercardConfirmation));
            Check(publicOutput.SequenceEqual(populated.Output), "Public frozen JSON exact output");
            var failedJson = WondercardSession.Prepare(original, request);
            bool missing = false; try { SaveService.PreviewWondercard(original, "{}"); } catch (JsonException) { missing = true; }
            Check(missing, "Required public request fields");
            Reject(() => WondercardSession.Commit(original, new(failedJson.Token, failedJson.SourceHash, failedJson.TargetHash, true)));
            Console.WriteLine($"PASS initial Wondercard {name}: full source album, immutable crypto reads, received/save ordering/full-file oracle; full actions/API/UI/QR pending");
        }
        SpecialCases();
    }
    private static void SpecialCases()
    {
        byte[] Fixture(string name) => SourceSave(File.ReadAllBytes($".tmp/pkhex-fixtures/{name}.sav"), (_, _, gifts, flags) => { foreach (var g in gifts) g.Clear(); flags.Clear(); });
        WondercardAction Set(DataMysteryGift gift, int slot, string kind = "set") => new(kind, Index: slot, Data: Convert.ToBase64String(gift.Write()), FileName: "gift." + gift.Type.ToLowerInvariant());
        var hg = Fixture("HG"); var capsule = new PCD { IsItem = true, ItemID = 533, CardID = 123 };
        var actual = WondercardEditing.Prepare(hg, [Set(capsule, 0)]);
        Check(actual.Output.SequenceEqual(SourceSave(hg, (_, _, gifts, flags) => { gifts[11] = capsule.Clone(); flags.Add(123); })), "HGSS Lock Capsule redirect and complete source save");
        Reject(() => WondercardEditing.Prepare(Fixture("D"), [Set(capsule, 0)]));
        Reject(() => WondercardEditing.Prepare(actual.Output, [new("swap", Index: 8, Source: 11)]));
        var card = new PCD { IsItem = true, ItemID = 1, CardID = 124 };
        var converted = WondercardEditing.Prepare(hg, [Set(card, 2)]);
        Check(converted.Output.SequenceEqual(SourceSave(hg, (_, _, gifts, _) => gifts[2] = card.Gift.Clone())), "PCD to PGT preserves source destination behavior/card ID loss");
        var dropped = WondercardEditing.Prepare(hg, [Set(card, 2, "drop")]);
        Check(dropped.Output.SequenceEqual(converted.Output), "External PCD drop to PGT source parity");
        var eon = new WC6 { IsItem = true, ItemID = 726, CardID = 2048, Date = new DateOnly(2020, 1, 1) };
        var ao = Fixture("OR"); var ticket = WondercardEditing.Prepare(ao, [Set(eon, 20)]);
        Check(ticket.Output.SequenceEqual(SourceSave(ao, (_, _, gifts, _) => gifts[0] = eon.Clone())), "Eon Ticket source save full-file linkage");
        var sango = ((SAV6AO)SaveUtil.GetSaveFile(ticket.Output.ToArray())!).Blocks.Sango;
        Check(sango.EonTicketReceivedMagic == WC6.EonTicketConst && sango.EonTicketSendMagic == WC6.EonTicketConst, "Eon receive/send magic");
        Reject(() => WondercardEditing.Prepare(Fixture("X"), [Set(eon, 0)]));
        Reject(() => new WondercardEditing(SaveUtil.GetSaveFile(ticket.Output.ToArray())!).QR(0));
        var preview = new WondercardEditing(SaveUtil.GetSaveFile(ao.ToArray())!).InspectImport(Convert.ToBase64String(eon.Write()), "gift.wc6");
        Check(preview.Description.Any(line => line.Zh.Contains("无限船票") && line.En.Contains("Eon Ticket")), "Three-language gift detail resources");
        var gift = new WC7 { IsItem = true, ItemID = 1, CardID = 12 }; var sn = Fixture("SN");
        var populated = WondercardEditing.Prepare(sn, [Set(gift, 0)]).Output;
        var editor = new WondercardEditing(SaveUtil.GetSaveFile(populated.ToArray())!);
        Check(editor.QR(0) == QRMessageUtil.GetMessage(gift), "Exact Core QR payload export");
        var importJson = JsonSerializer.Serialize(new WondercardImport(Convert.ToBase64String(gift.Write()), "card.wc7"), SaveJsonContext.Default.WondercardImport);
        var imported = JsonSerializer.Deserialize(SaveService.InspectWondercardImport(sn, importJson), SaveJsonContext.Default.WondercardEntry)!;
        Check(imported.Type == "WC7" && imported.Data == Convert.ToBase64String(gift.Write()), "Public import preview keeps exact card payload");
        var qrJson = JsonSerializer.Serialize(new WondercardPosition(-1, imported.Data, imported.FileName), SaveJsonContext.Default.WondercardPosition);
        Check(SaveService.ExportWondercardQR(sn, qrJson) == QRMessageUtil.GetMessage(gift), "Public QR exports a viewed import without writing a save slot");
        var entry = editor.Read(Br4Editing.Hash(populated)).Album[0];
        Check(entry.IsItem && !entry.IsEntity && entry.ItemId == 1 && entry.Quantity == gift.Quantity && entry.Error is null, "Structured gift metadata and raw item ID");
        Check(entry.Description.All(line => !line.Zh.StartsWith("Item:", StringComparison.Ordinal) && !line.Ja.StartsWith("Item:", StringComparison.Ordinal)), "Generated item labels localized");
        Reject(() => new WondercardEditing(SaveUtil.GetSaveFile(sn.ToArray())!).QR(0));
        Check(WondercardEditing.Prepare(populated, [new("swap", Index: 1, Source: 0)]).Output.SequenceEqual(populated), "Source forward move to next empty returns without changing cards");
        var full = SourceSave(sn, (_, _, gifts, _) => { for (int i = 1; i < gifts.Count; i++) gifts[i] = gift.Clone(); });
        Reject(() => WondercardEditing.Prepare(full, [new("swap", Index: 0, Source: 47)]));
        Console.WriteLine("PASS Wondercard special: Lock Capsule/PCD-PGT/external drop/Eon linkage, immutable import preview, three-language names, QR restrictions and source abnormal move atomic rejection; UI and image codecs pending.");
    }
}
