// SPDX-License-Identifier: GPL-3.0-or-later
using System.Security.Cryptography;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal static class BoxBinary
{
    public static byte[] Export(byte[] input, int box, bool all)
    {
        var save = Open(input, box, all, false);
        return all ? save.GetPCBinary() : save.GetBoxBinary(box);
    }

    public static BoxImportPlan Preview(byte[] input, byte[] binary, int box, bool all, EntityImportSettings settings)
    {
        var save = Open(input, box, all, true);
        int count = all ? save.SlotCount : save.BoxSlotCount;
        if (binary is null || binary.Length != checked(count * save.SIZE_BOXSLOT) ||
            (uint)settings.UpdateToSaveFile > 2 || (uint)settings.UpdatePokeDex > 2 || (uint)settings.UpdateRecord > 2)
            throw new ArgumentException("Box binary size or settings are invalid.");
        int start = all ? 0 : box * save.BoxSlotCount;
        // Exact layout replacement must never silently shift around protected slots.
        for (int i = start; i < start + count; i++)
            if (save.IsBoxSlotOverwriteProtected(i)) throw new ArgumentException("Box binary target contains protected slots.");
        int deleted = 0, overwritten = 0;
        var outcomes = new List<BoxImportOutcome>();
        for (int i = 0; i < count; i++)
        {
            int index = start + i, targetBox = index / save.BoxSlotCount, slot = index % save.BoxSlotCount;
            // Same slot width and party-tail handling as SaveFile.SetConcatenatedBinary.
            var data = binary.AsSpan(i * save.SIZE_BOXSLOT, Math.Min(save.SIZE_BOXSLOT, save.SIZE_PARTY)).ToArray();
            var entity = save.GetDecryptedPKM(data);
            if (!entity.Valid || !entity.ChecksumValid)
                throw new ArgumentException("Box binary contains invalid entity data.");
            if (save.NextOpenBoxSlot(index - 1) != index)
            {
                overwritten++;
                outcomes.Add(new(i, targetBox, slot, "overwritten"));
                if (entity.Species == 0) { deleted++; outcomes.Add(new(i, targetBox, slot, "deleted")); }
            }
            save.SetBoxSlotAtIndex(entity, index, settings);
            outcomes.Add(new(i, targetBox, slot, "written"));
        }
        var expected = Snapshot(save);
        var output = save.Write().ToArray();
        var check = SaveUtil.GetSaveFile(output.ToArray());
        if (check is null || check.GetType() != save.GetType() || !SaveChecksums.Valid(check) || Snapshot(check) != expected)
            throw new InvalidOperationException("Box binary export verification failed.");
        return new(SHA256.HashData(input), output, new(deleted, count, overwritten, outcomes.ToArray()));
    }

    private static SaveFile Open(byte[] input, int box, bool all, bool edit)
    {
        if (input.Length is 0 or > SaveService.MaximumSize) throw new ArgumentException("Box binary save size is invalid.");
        var save = SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Box binary save is unsupported.");
        if (!save.State.Exportable || !SaveChecksums.Valid(save) || !save.HasBox ||
            save.SlotCount is <= 0 or > 10000 || (!all && (uint)box >= save.BoxCount) || (edit && !SaveService.CanEdit(save)))
            throw new ArgumentException("Box binary options or save are invalid.");
        return save;
    }

    private static string Snapshot(SaveFile save) => BoxEditing.Snapshot(save) + "|" +
        string.Join('|', Enumerable.Range(0, save.SlotCount).Select(i => Convert.ToHexString(save.GetBoxSlotAtIndex(i).Data))) + "|" +
        save.PartyCount + "|" + string.Join('|', Enumerable.Range(0, 6).Select(i => Convert.ToHexString(save.GetPartySlotAtIndex(i).Data)));
}
