using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PartyStorageTests
{
    private static byte[] Apply(byte[] input, string action, PokemonPosition source, PokemonPosition? target = null) =>
        SaveService.EditStorage(input, JsonSerializer.Serialize(new StorageEdit(action, source, target), SaveJsonContext.Default.StorageEdit));
    private static SaveFile Open(byte[] bytes) => SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static void Require(bool value, string message) { if (!value) throw new Exception(message); }

    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var setup = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            for (var i = 0; i < 3; i++)
            {
                var p = setup.GetBoxSlotAtIndex(0, 0);
                p.PID = (uint)(100 + i);
                p.Species = new ushort[] { 25, 133, 1 }[i];
                p.RefreshChecksum();
                setup.SetPartySlotAtIndex(p, i, EntityImportSettings.None);
            }
            var box = new PokemonPosition(setup.BoxCount - 1, setup.BoxSlotCount - 1);
            var boxed = setup.GetBoxSlotAtIndex(box.Box, box.Slot);
            boxed.PID = 400;
            boxed.Species = 4;
            boxed.RefreshChecksum();
            setup.SetBoxSlotAtIndex(boxed, box.Box, box.Slot, EntityImportSettings.None);
            var input = setup.Write().ToArray();
            var original = input.ToArray();
            var before = Open(input);
            var empty = new PokemonPosition(0, 1);
            var cases = new (string Action, PokemonPosition Source, PokemonPosition? Target, uint[] Party, PokemonPosition? ChangedBox, uint BoxPid)[] {
                ("delete", new(-1, 1), null, [100,102], null, 0),
                ("move", new(-1, 1), empty, [100,102], empty, 101),
                ("swap", new(-1, 0), new(-1, 2), [102,101,100], null, 0),
                ("copy", new(-1, 0), new(-1, 1), [100,100,102], null, 0),
                ("move", box, new(-1, 5), [100,101,102,400], box, 0),
                ("swap", box, new(-1, 1), [100,400,102], box, 101),
                ("copy", new(-1, 1), box, [100,101,102], box, 101),
                ("swap", new(-1, 0), box, [400,101,102], box, 100),
                ("move", new(-1, 0), new(-1, 5), [101,102,100], null, 0),
                ("copy", new(-1, 0), new(-1, 5), [100,101,102,100], null, 0),
            };
            foreach (var test in cases)
            {
                var after = Open(Apply(input, test.Action, test.Source, test.Target));
                Require(after.ChecksumsValid && after.PartyCount == test.Party.Length &&
                    after.PartyData.Select(p => p.PID).SequenceEqual(test.Party), $"{version}: {test.Action} party order/count");
                foreach (var member in after.PartyData)
                {
                    var expected = before.PartyData.Concat([before.GetBoxSlotAtIndex(box.Box, box.Slot)]).Single(p => p.PID == member.PID);
                    Require(member.Data[..member.SIZE_STORED].SequenceEqual(expected.Data[..expected.SIZE_STORED]), $"{version}: party stored payload");
                }
                for (var i = after.PartyCount; i < 6; i++) Require(after.GetPartySlotAtIndex(i).Species == 0, $"{version}: stale trailing party");
                for (var b = 0; b < before.BoxCount; b++)
                    for (var slot = 0; slot < before.BoxSlotCount; slot++)
                    {
                        var position = new PokemonPosition(b, slot);
                        if (position == test.ChangedBox)
                        {
                            var actual = after.GetBoxSlotAtIndex(b, slot);
                            Require(test.BoxPid == 0 ? actual.Species == 0 : actual.PID == test.BoxPid, $"{version}: box transfer");
                        }
                        else Require(StorageEditing.StoredData(before, position).SequenceEqual(StorageEditing.StoredData(after, position)), $"{version}: other box changed");
                    }
                Require(input.SequenceEqual(original), $"{version}: original changed");
            }
            var deleted = input;
            for (var i = 0; i < 3; i++) deleted = Apply(deleted, "delete", new(-1, 0));
            Require(Open(deleted).PartyCount == 0, $"{version}: delete final member");
            Reject(input, new("copy", box, new(-1, 6)));
            Reject(input, new("delete", new(-1, 3), null));
            Reject(input, new("copy", box, new(-1, -1)));

            var eggSave = Open(input);
            for (var i = 1; i < 3; i++)
            {
                var egg = eggSave.GetPartySlotAtIndex(i); egg.IsEgg = true; egg.RefreshChecksum();
                eggSave.SetPartySlotAtIndex(egg, i, EntityImportSettings.None);
            }
            var incoming = eggSave.GetBoxSlotAtIndex(box.Box, box.Slot); incoming.IsEgg = true; incoming.RefreshChecksum();
            eggSave.SetBoxSlotAtIndex(incoming, box.Box, box.Slot, EntityImportSettings.None);
            var eggs = eggSave.Write().ToArray();
            Reject(eggs, new("copy", box, new(-1, 0)));
            var reordered = Open(Apply(eggs, "swap", new(-1, 0), new(-1, 1)));
            Require(!reordered.GetPartySlotAtIndex(1).IsEgg && reordered.GetPartySlotAtIndex(0).IsEgg, $"{version}: mixed egg swap");
            Console.WriteLine($"PASS {version}: party order, cross-storage moves/swaps/copies, append, deletion, bounds, egg constraints and original/box preservation");
        }
        var corrupted = Open(File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav"));
        corrupted.Data[corrupted.GetBoxSlotOffset(0, 0) + 6] ^= 1;
        var corruptBytes = corrupted.Write().ToArray();
        Require(Open(corruptBytes).ChecksumsValid && !Open(corruptBytes).GetBoxSlotAtIndex(0, 0).ChecksumValid, "Corrupt entity fixture");
        Require(Open(Apply(corruptBytes, "delete", new(0, 0))).GetBoxSlotAtIndex(0, 0).Species == 0, "Corrupt entity cleanup");
        Console.WriteLine("PASS corrupt PK6 deletion in a checksum-valid save");
    }
    private static void Reject(byte[] input, StorageEdit edit)
    {
        var original = input.ToArray();
        try { Apply(input, edit.Action, edit.Source, edit.Target); }
        catch (ArgumentException) { Require(input.SequenceEqual(original), "Rejected operation changed input"); return; }
        throw new Exception($"Invalid party operation accepted: {edit}");
    }
}
