// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record BoxBatchChoice(string Id, int Group);
internal static class BoxBatch
{
    public static BoxBatchChoice[] Choices(SaveFile save) => BoxManipUtil.ManipCategories.SelectMany((items, group) =>
        items.Where(m => m.Usable(save)).Select(m => new BoxBatchChoice(m.Type.ToString(), group))).ToArray();

    public static void Apply(SaveFile save, BoxEdit edit)
    {
        if (edit.Batch is null || edit.Name is not null || edit.Wallpaper is not null || edit.Flags is not null || edit.Unlocked is not null || edit.SwapWith is not null ||
            edit.Language is not ("zh" or "en" or "ja") || (uint)edit.Box >= save.BoxCount) throw new ArgumentException("Invalid box batch values.");
        var choice = Choices(save).SingleOrDefault(c => c.Id == edit.Batch) ?? throw new ArgumentException("Invalid box batch values.");
        if (choice.Group == 3 && edit.Reverse) throw new ArgumentException("Invalid box batch values.");
        int start = edit.All ? 0 : edit.Box, stop = edit.All ? save.BoxCount - 1 : edit.Box;
        if (save.IsAnySlotLockedInBox(start, stop)) throw new ArgumentException("Storage slot is locked.");
        // Select the usable overload; GetManip() alone returns the first duplicate enum entry.
        IBoxManip manip = BoxManipUtil.ManipCategories.SelectMany(c => c).First(m => m.Type.ToString() == edit.Batch && m.Usable(save));
        if (manip.Type == BoxManipType.SortName)
            manip = new BoxManipSort(BoxManipType.SortName, list => list.OrderBySpeciesName(GameInfo.GetStrings(edit.Language == "zh" ? "zh-Hans" : edit.Language).Species));
        var scratch = save.Clone();
        try { manip.Execute(scratch, new(start, stop, edit.Reverse)); }
        catch (Exception error) when (error is ArgumentException or InvalidOperationException or IndexOutOfRangeException)
        { throw new ArgumentException("Box batch cannot process the selected Pokemon.", error); }
        // Core SortBoxes rewrites every box, including boxes outside the selected range.
        // Commit only changed eligible slots from the scratch result, preserving untouched raw data.
        for (int box = start; box <= stop; box++)
        for (int slot = 0; slot < save.BoxSlotCount; slot++)
        {
            if (save.IsBoxSlotOverwriteProtected(box, slot)) continue;
            var before = save.GetBoxSlotAtIndex(box, slot); var after = scratch.GetBoxSlotAtIndex(box, slot);
            if (!before.Data.SequenceEqual(after.Data)) save.SetBoxSlotAtIndex(after, box, slot, EntityImportSettings.None);
        }
    }
}
