// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using BoxEdit = PokeRNGKit.SaveEditor.BoxEdit;
internal static class BoxLayoutTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SaveFile Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray())!;
    private static byte[] Apply(byte[] input, BoxEdit edit) => SaveService.EditBox(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.BoxEdit));
    public static void Run()
    {
        foreach (string version in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD" })
        {
            var setup = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            int source = 1, target = setup.BoxCount - 1;
            var p = setup.BlankPKM; p.Species = 133; p.PID = 123456; p.RefreshChecksum();
            setup.SetBoxSlotAtIndex(p, source, 0, EntityImportSettings.None);
            p = setup.BlankPKM; p.Species = 25; p.PID = 654321; p.RefreshChecksum();
            setup.SetBoxSlotAtIndex(p, target, setup.BoxSlotCount - 1, EntityImportSettings.None);
            ((IBoxDetailName)setup).SetBoxName(source, "SOURCE"); ((IBoxDetailName)setup).SetBoxName(target, "TARGET");
            ((IBoxDetailWallpaper)setup).SetBoxWallpaper(source, 1); ((IBoxDetailWallpaper)setup).SetBoxWallpaper(target, 2);
            var input = setup.Write().ToArray(); var original = input.ToArray(); var before = Open(input); var options = BoxEditing.Options(before);
            Check(options.Unlocked == (before.BoxesUnlocked < 0 ? null : before.BoxesUnlocked) && options.Flags.SequenceEqual(before.BoxFlags.Select(b => (int)b)), "Box layout catalog reflects actual state");
            Check(Apply(input, new(0, null, null)).SequenceEqual(input), "Box layout no-op preserves full original");
            foreach (int count in options.Unlocked is null ? new[] { -1 } : new[] { 0, 1, before.BoxCount })
            foreach (int flag in options.Flags.Length == 0 ? new[] { -1 } : new[] { 0, 1, 127, 128, 255 })
            {
                int[]? flags = flag < 0 ? null : Enumerable.Repeat(flag, options.Flags.Length).ToArray();
                var edit = new BoxEdit(0, null, null, count < 0 ? null : count, flags);
                var expected = Open(input);
                if (flags is not null) expected.BoxFlags = Array.ConvertAll(flags, f => (byte)f);
                if (count >= 0) expected.BoxesUnlocked = count;
                var output = Apply(input, edit); var after = Open(output);
                Check(output.SequenceEqual(expected.Write().ToArray()) && after.ChecksumsValid, "Box settings exact full Core output and checksum");
                if (before.Generation == 6 && count >= 0) Check((after.BoxFlags[0] & 0x80) == (count == before.BoxCount ? 0x80 : 0), "Gen VI final box bit follows count after flags");
            }
            var swap = new BoxEdit(source, null, null, SwapWith: target); var moved = Open(Apply(input, swap));
            var reference = Open(input); Check(reference.SwapBox(source, target), "Fixture boxes movable");
            Check(moved.Write().Span.SequenceEqual(reference.Write().Span), "Whole box swap exact Core output");
            for (int b = 0; b < before.BoxCount; b++)
            {
                int old = b == source ? target : b == target ? source : b;
                Check(((IBoxDetailNameRead)moved).GetBoxName(b) == ((IBoxDetailNameRead)before).GetBoxName(old), "Whole box names follow contents");
                Check(((IBoxDetailWallpaper)moved).GetBoxWallpaper(b) == ((IBoxDetailWallpaper)before).GetBoxWallpaper(old), "Whole box wallpapers follow contents");
                for (int slot = 0; slot < before.BoxSlotCount; slot++) Check(StorageEditing.StoredData(moved, new(b, slot)).SequenceEqual(StorageEditing.StoredData(before, new(old, slot))), "Every occupied and empty box slot follows swap");
            }
            Check(Apply(Apply(input, swap), swap).SequenceEqual(input), "Whole box swap is reversible");
            foreach (var bad in new BoxEdit[] { new(0, null, null, -1), new(0, null, null, before.BoxCount + 1), new(0, null, null, Flags: []),
                new(0, null, null, Flags: [256]), new(0, null, null, Flags: [-1]), new(0, null, null, SwapWith: -1), new(0, null, null, SwapWith: before.BoxCount),
                new(0, null, null, SwapWith: 0), new(0, "A", null, SwapWith: 1), new(0, null, null, 1, SwapWith: 1) })
            {
                bool rejected = false; try { Apply(input, bad); } catch (ArgumentException) { rejected = true; }
                Check(rejected && input.SequenceEqual(original), "Invalid box layout rejected without changing original");
            }
            if (before is SAV7 gen7)
            {
                gen7.BoxLayout.TeamSlots[0] = source * gen7.BoxSlotCount;
                gen7.BoxLayout.SetIsTeamLocked(0, true);
                var locked = gen7.Write().ToArray(); bool rejected = false;
                try { Apply(locked, swap); } catch (ArgumentException) { rejected = true; }
                Check(rejected, "Locked battle team prevents whole box swap");
                gen7.BoxLayout.SetIsTeamLocked(0, false);
                var unlockedTeam = gen7.Write().ToArray();
                rejected = false;
                try { Apply(unlockedTeam, swap); } catch (ArgumentException) { rejected = true; }
                Check(rejected, "Registered battle team prevents swap even when unlocked");
                gen7.BoxLayout.ClearBattleTeams();
                var released = gen7.Write().ToArray();
                Check(Apply(Apply(released, swap), swap).SequenceEqual(released), "Removing team registration permits reversible swap");
            }
            Check(input.SequenceEqual(original), "Original retained after all box operations");
            Console.WriteLine($"PASS {version}: box unlock count, flags/final-box coupling, whole-box metadata and every slot, reverse swap, locked teams and invalid edits");
        }
    }
}
