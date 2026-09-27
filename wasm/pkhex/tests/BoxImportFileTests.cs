// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class BoxImportFileTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Expected import source rejection");
    }
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var input = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var original = input.ToArray();
            var save = SaveUtil.GetSaveFile(input.ToArray())!;
            var pokemon = save.GetBoxSlotAtIndex(0, 0);
            var encrypted = new byte[pokemon.SIZE_STORED]; pokemon.WriteEncryptedDataStored(encrypted);
            var plaintext = new byte[pokemon.SIZE_STORED]; pokemon.WriteDecryptedDataStored(plaintext);
            var box = new byte[save.BoxSlotCount * save.SIZE_BOXSLOT];
            for (int slot = 0; slot < save.BoxSlotCount; slot++) encrypted.CopyTo(box, slot * save.SIZE_BOXSLOT);
            FileBatchInput[] files = [new($"folder/one.{pokemon.Extension}", encrypted),
                new($"folder/two.{pokemon.Extension}", plaintext), new("box.bin", box), new("bad.bin", [1, 2, 3]), new("save.sav", input)];
            var copies = files.Select(f => f.Data.ToArray()).ToArray();
            var decoded = BoxImportFiles.Decode(input, files);
            Check(decoded.Entities.Length == 2 + save.BoxSlotCount, "Single and grouped sources expanded");
            Check(decoded.Files.Select(f => f.Status).SequenceEqual(new[] { "ready", "ready", "ready", "unrecognized", "unsupported" }), "File status reporting");
            Check(decoded.Sources[0] == new BoxImportSource(0, 0) && decoded.Sources[2] == new BoxImportSource(2, 0) &&
                decoded.Sources[^1] == new BoxImportSource(2, save.BoxSlotCount - 1), "Source and group indices retained");
            Check(decoded.Entities.All(p => p.Species == pokemon.Species && p.PID == pokemon.PID), "Decoded identity retained");
            Check(files.Select((f, i) => f.Data.SequenceEqual(copies[i])).All(x => x) && input.SequenceEqual(original), "Input files and context remain unchanged");
            var plan = BoxImportFiles.Prepare(input, files, 1, false, false, EntityImportSettings.None);
            Check(plan.Summary.Written == decoded.Entities.Length && plan.Sources.SequenceEqual(decoded.Sources), "File sources reach import preview");
            Reject(() => plan.Commit(input, false, false, false));
            Check(plan.Commit(input, false, false, true).SequenceEqual(plan.Commit(input, false, false, true)), "Acknowledged file errors produce frozen import output");
            Reject(() => BoxImportFiles.Decode(input, [new("../bad.pk3", encrypted)]));
            Reject(() => BoxImportFiles.Decode(input, [new("ONE.pk3", encrypted), new("one.pk3", encrypted)]));
            Console.WriteLine($"PASS {version}: encrypted/plain files, PC group expansion, file provenance, unsupported save, malformed input and source preservation");
        }
        var diamond = File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav");
        var gift = new PGT { CardType = (ushort)GiftType4.ManaphyEgg };
        var item = new PGT { CardType = (ushort)GiftType4.Item, ItemID = 1 };
        var gifts = BoxImportFiles.Decode(diamond, [new("gift.PGT", gift.Write().ToArray()), new("item.pgt", item.Write().ToArray())]);
        Check(gifts.Entities.Length == 1 && gifts.Entities[0].Species == 490 && gifts.Files[0].Status == "ready" &&
            gifts.Files[1].Status == "unsupported", "Entity gifts converted once; item gifts remain unsupported");
        var giftPlan = BoxImportFiles.Prepare(diamond, [new("gift.pgt", gift.Write().ToArray())], 1, false, false, EntityImportSettings.None);
        Check(giftPlan.Summary.Written == 1 && giftPlan.Commit(diamond, false, false, false).SequenceEqual(
            giftPlan.Commit(diamond, false, false, false)), "Random gift generation is frozen by preview");
        Console.WriteLine("PASS PGT: uppercase gift extension, Manaphy generation and non-entity rejection");
        var rental = new RentalTeam8(new byte[RentalTeam8.SIZE]);
        for (int i = 0; i < 6; i++)
        {
            var p = new PK8 { Species = 25, PID = (uint)(100 + i), Version = GameVersion.SW };
            // RentalTeam8.GetSlot resets HP, which is part of stored checksum data.
            p.ResetPartyStats(); rental.SetSlot(i, p);
        }
        Check(RentalTeam8.IsRentalTeam(rental.Data.ToArray()), "Synthetic rental is valid under upstream detector");
        var team = BoxImportFiles.Decode(diamond, [new("team.bin", rental.Data.ToArray())]);
        Check(team.Entities.Length == 6 && team.Entities.Select(p => p.PID).SequenceEqual(Enumerable.Range(100, 6).Select(i => (uint)i)) &&
            team.Sources.Select(s => s.Entry).SequenceEqual(Enumerable.Range(0, 6)), "Rental team expands in source order independently of target generation");
        Console.WriteLine("PASS RentalTeam8: IPokeGroup expansion preserves all six source identities");
    }
}
