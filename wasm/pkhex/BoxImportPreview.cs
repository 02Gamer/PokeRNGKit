// SPDX-License-Identifier: GPL-3.0-or-later
using System.Security.Cryptography;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record BoxImportOutcome(int Source, int Box, int Slot, string Status);
internal sealed record BoxImportSummary(int Deleted, int Written, int Overwritten, BoxImportOutcome[] Outcomes);
internal sealed class BoxImportPlan(byte[] sourceHash, byte[] output, BoxImportSummary summary)
{
    public BoxImportSummary Summary { get; } = summary;
    private readonly bool needsClear = summary.Deleted != 0;
    private readonly bool needsOverwrite = summary.Overwritten != 0;
    private readonly bool needsErrors = summary.Outcomes.Any(o => o.Status is "invalid" or "incompatible" or "full");
    public byte[] Commit(byte[] source, bool allowClear, bool allowOverwrite, bool allowSkipped)
    {
        if (!SHA256.HashData(source).SequenceEqual(sourceHash)) throw new ArgumentException("Box import preview is stale.");
        if (needsClear && !allowClear || needsOverwrite && !allowOverwrite || needsErrors && !allowSkipped)
            throw new ArgumentException("Box import preview requires confirmation.");
        return output.ToArray();
    }
}

internal static class BoxImportPreview
{
    // Inputs are detached entities. File/group decoding will retain source-to-entity mappings above this layer.
    public static BoxImportPlan Prepare(byte[] input, IReadOnlyList<PKM> entities, int firstBox, bool clear, bool overwrite, EntityImportSettings settings)
    {
        if (input.Length is 0 or > SaveService.MaximumSize || entities.Count > 10000)
            throw new ArgumentException("Box import input exceeds limits.");
        var save = SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Box import save is unsupported.");
        if (!SaveService.CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save) || !save.HasBox ||
            (uint)firstBox >= save.BoxCount || (uint)settings.UpdateToSaveFile > 2 ||
            (uint)settings.UpdatePokeDex > 2 || (uint)settings.UpdateRecord > 2)
            throw new ArgumentException("Box import options or save are invalid.");
        var outcomes = new List<BoxImportOutcome>();
        // NextOpenBoxSlot uses each game's raw presence predicate, including damaged entities.
        bool Occupied(int index) => save.NextOpenBoxSlot(index - 1) != index;
        if (clear)
            for (int i = firstBox * save.BoxSlotCount; i < save.SlotCount; i++)
                if (!save.IsBoxSlotOverwriteProtected(i) && Occupied(i))
                    outcomes.Add(new(-1, i / save.BoxSlotCount, i % save.BoxSlotCount, "deleted"));
        int deleted = clear ? save.ClearBoxes(firstBox) : 0;
        if (deleted != outcomes.Count) throw new InvalidOperationException("Box import deletion accounting failed.");
        int cursor = firstBox * save.BoxSlotCount, written = 0, overwritten = 0;
        for (int source = 0; source < entities.Count; source++)
        {
            var entity = entities[source].Clone();
            if (!entity.Valid || !entity.ChecksumValid) { outcomes.Add(new(source, -1, -1, "invalid")); continue; }
            var compatible = save.GetCompatible([entity]).FirstOrDefault();
            if (compatible is null) { outcomes.Add(new(source, -1, -1, "incompatible")); continue; }
            while (cursor < save.SlotCount)
            {
                if (save.IsBoxSlotOverwriteProtected(cursor))
                {
                    outcomes.Add(new(source, cursor / save.BoxSlotCount, cursor % save.BoxSlotCount, "protected"));
                    cursor++; continue;
                }
                if (!overwrite && Occupied(cursor)) { cursor++; continue; }
                break;
            }
            if (cursor >= save.SlotCount) { outcomes.Add(new(source, -1, -1, "full")); continue; }
            if (Occupied(cursor))
            {
                overwritten++;
                outcomes.Add(new(source, cursor / save.BoxSlotCount, cursor % save.BoxSlotCount, "overwritten"));
            }
            save.SetBoxSlotAtIndex(compatible, cursor, settings);
            outcomes.Add(new(source, cursor / save.BoxSlotCount, cursor % save.BoxSlotCount, "written"));
            cursor++; written++;
        }
        var expected = Snapshot(save);
        var output = deleted == 0 && written == 0 ? input.ToArray() : save.Write().ToArray();
        var check = SaveUtil.GetSaveFile(output.ToArray());
        if (check is null || check.GetType() != save.GetType() || !SaveChecksums.Valid(check) || Snapshot(check) != expected)
            throw new InvalidOperationException("Box import export verification failed.");
        return new(SHA256.HashData(input), output, new(deleted, written, overwritten, outcomes.ToArray()));
    }

    private static string Snapshot(SaveFile save) => BoxEditing.Snapshot(save) + "|" + save.PartyCount + "|" +
        string.Join('|', Enumerable.Range(0, 6).Select(i => Convert.ToHexString(save.GetPartySlotAtIndex(i).Data)));
}
