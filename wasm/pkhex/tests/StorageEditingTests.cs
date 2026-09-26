using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class StorageEditingTests
{
    public static void Run()
    {
        foreach (var version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var setup = SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"))!;
            var source = new PokemonPosition(0, 0);
            var empty = new PokemonPosition(0, 1);
            var occupied = new PokemonPosition(setup.BoxCount - 1, setup.BoxSlotCount - 1);
            var other = setup.GetBoxSlotAtIndex(occupied.Box, occupied.Slot);
            other.Species = 133;
            other.PID = 98765;
            other.RefreshChecksum();
            setup.SetBoxSlotAtIndex(other, occupied.Box, occupied.Slot, EntityImportSettings.None);
            var input = setup.Write().ToArray();
            var original = input.ToArray();
            var before = SaveUtil.GetSaveFile(input.ToArray())!;
            foreach (var action in new[] { "move", "swap", "copy", "delete" })
            {
                var target = action == "move" ? empty : occupied;
                var edit = new StorageEdit(action, source, action == "delete" ? null : target);
                var output = SaveService.EditStorage(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.StorageEdit));
                var after = SaveUtil.GetSaveFile(output)!;
                Require(after.ChecksumsValid, $"{version}/{action}: checksum");
                if (action != "delete")
                    Require(StorageEditing.StoredData(after, target).SequenceEqual(StorageEditing.StoredData(before, source)), $"{version}/{action}: target payload");
                if (action == "swap")
                    Require(StorageEditing.StoredData(after, source).SequenceEqual(StorageEditing.StoredData(before, target)), $"{version}/{action}: source payload");
                else if (action == "copy")
                    Require(StorageEditing.StoredData(after, source).SequenceEqual(StorageEditing.StoredData(before, source)), $"{version}/{action}: source preserved");
                else
                    Require(after.GetBoxSlotAtIndex(0, 0).Species == 0, $"{version}/{action}: source cleared");
                for (var box = 0; box < before.BoxCount; box++)
                    for (var slot = 0; slot < before.BoxSlotCount; slot++)
                    {
                        var position = new PokemonPosition(box, slot);
                        if (position == source || (action != "delete" && position == target)) continue;
                        Require(StorageEditing.StoredData(before, position).SequenceEqual(StorageEditing.StoredData(after, position)), $"{version}/{action}: unrelated slot");
                    }
                Require(after.PartyData.Select(p => Convert.ToBase64String(p.Data)).SequenceEqual(before.PartyData.Select(p => Convert.ToBase64String(p.Data))), $"{version}/{action}: party preserved");
                Require(input.SequenceEqual(original), $"{version}/{action}: input preserved");
            }
            foreach (var edit in new[] {
                new StorageEdit("move", source, occupied), new StorageEdit("swap", source, source),
                new StorageEdit("copy", empty, source), new StorageEdit("unknown", source, empty),
                new StorageEdit("copy", source, new(-2, 0)), new StorageEdit("copy", source, new(before.BoxCount, 0)),
                new StorageEdit("copy", source, new(0, before.BoxSlotCount)), new StorageEdit("delete", new(-2, 0), null),
                new StorageEdit("move", source, null) })
            {
                try { SaveService.EditStorage(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.StorageEdit)); }
                catch (ArgumentException) { Require(input.SequenceEqual(original), $"{version}: rejection changed input"); continue; }
                throw new Exception($"{version}: invalid operation accepted: {edit}");
            }
            Console.WriteLine($"PASS {version}: move, swap, copy, delete, payload/other slots/party/input preservation and invalid operations");
        }
        var lockedSave = (SAV7)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/US.sav"))!;
        lockedSave.BoxLayout.ClearBattleTeams();
        lockedSave.BoxLayout.TeamSlots[0] = 0;
        lockedSave.BoxLayout.SetIsTeamLocked(0, true);
        var locked = lockedSave.Write().ToArray();
        var lockedOriginal = locked.ToArray();
        Require(SaveUtil.GetSaveFile(locked.ToArray())!.IsBoxSlotLocked(0, 0), "Lock fixture did not preserve lock");
        var lockedPosition = new PokemonPosition(0, 0);
        var otherPosition = new PokemonPosition(lockedSave.BoxCount - 1, lockedSave.BoxSlotCount - 1);
        foreach (var operation in new[] {
            new StorageEdit("delete", lockedPosition, null), new StorageEdit("move", lockedPosition, new(0, 1)),
            new StorageEdit("swap", lockedPosition, otherPosition), new StorageEdit("copy", otherPosition, lockedPosition) })
        {
            try { SaveService.EditStorage(locked, JsonSerializer.Serialize(operation, SaveJsonContext.Default.StorageEdit)); }
            catch (ArgumentException) { Require(locked.SequenceEqual(lockedOriginal), "Locked rejection changed input"); continue; }
            throw new Exception("Locked slot was changed");
        }
        // A copy reads its locked source, so it remains permitted by SlotInfoBox.
        SaveService.EditStorage(locked, JsonSerializer.Serialize(new StorageEdit("copy", lockedPosition, new(0, 1)), SaveJsonContext.Default.StorageEdit));
        Require(locked.SequenceEqual(lockedOriginal), "Copy from locked source changed input");
        Console.WriteLine("PASS locked slot write rejection and non-mutating copy from locked source");
    }
    private static void Require(bool value, string message)
    {
        if (!value) throw new Exception(message);
    }
}
