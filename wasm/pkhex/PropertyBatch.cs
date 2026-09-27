// SPDX-License-Identifier: GPL-3.0-or-later
using System.Security.Cryptography;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

internal sealed record PropertyBatchRequest(string Text, string Scope, int Box, string Language);
internal sealed record PropertyBatchOutcome(int Group, int Box, int Slot, string Result, bool Error);
internal sealed record PropertyBatchSummary(int Groups, int Filters, int Instructions, int ChangedSlots,
    int[] IgnoredLines, bool EmptyValues, PropertyBatchOutcome[] Outcomes);

internal sealed record PropertyBatchCommands(StringInstructionSet[] Sets, int[] IgnoredLines, bool EmptyValues)
{
    public static PropertyBatchCommands Parse(string text, string language)
    {
        if (language is not ("zh" or "en" or "ja") || string.IsNullOrWhiteSpace(text) || StringInstructionSet.HasEmptyLine(text))
            throw new ArgumentException("Invalid property batch instructions.");
        var sets = StringInstructionSet.GetBatchSets(text.AsSpan());
        if (sets.Length == 0 || sets.Any(s => s.Filters.Any(f => string.IsNullOrWhiteSpace(f.PropertyValue))))
            throw new ArgumentException("Invalid property batch filters.");
        var ignored = new List<int>(); int lineNumber = 0;
        foreach (var line in text.AsSpan().EnumerateLines())
        {
            lineNumber++;
            if (line.StartsWith(";")) continue;
            if (!StringInstruction.TryParseFilter(line, out _) && !StringInstruction.TryParseInstruction(line, out _)) ignored.Add(lineNumber);
        }
        return new(sets, ignored.ToArray(), sets.Any(s => s.Instructions.Any(i => string.IsNullOrWhiteSpace(i.PropertyValue))));
    }
}

// The Worker will retain the plan until confirmation; committing never reruns random instructions.
internal sealed class PropertyBatchPlan(byte[] sourceHash, byte[] output, PropertyBatchSummary summary)
{
    public PropertyBatchSummary Summary { get; } = summary;
    public byte[] Commit(byte[] source, bool allowErrors = false, bool allowEmpty = false, bool allowIgnored = false)
    {
        if (!CryptographicOperations.FixedTimeEquals(sourceHash, SHA256.HashData(source)))
            throw new ArgumentException("Property batch preview is stale.");
        if ((!allowErrors && Summary.Outcomes.Any(o => o.Error)) || (!allowEmpty && Summary.EmptyValues) ||
            (!allowIgnored && Summary.IgnoredLines.Length != 0)) throw new ArgumentException("Property batch confirmation is required.");
        return output.ToArray();
    }
}

internal static class PropertyBatch
{
    public static PropertyBatchPlan Preview(byte[] input, PropertyBatchRequest request)
    {
        var save = SaveUtil.GetSaveFile(input.ToArray()) ?? throw new ArgumentException("Property batch save is unsupported.");
        if (!SaveService.CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Property batch save is unsupported.");
        if (request.Language is not ("zh" or "en" or "ja") || request.Scope is not ("boxes" or "box" or "party") ||
            (request.Scope == "box" && (uint)request.Box >= save.BoxCount) ||
            (request.Scope == "party" && (!save.HasParty || (uint)save.PartyCount > 6)))
            throw new ArgumentException("Invalid property batch scope.");
        var commands = PropertyBatchCommands.Parse(request.Text, request.Language);
        var sets = commands.Sets;
        var slots = new List<SlotCache>();
        if (request.Scope == "party") SlotInfoLoader.AddPartyData(save, slots);
        else SlotInfoLoader.AddBoxData(save, slots);
        if (request.Scope == "box") slots.RemoveAll(s => s.Source is not SlotInfoBox b || b.Box != request.Box);
        var original = slots.Select(s => s.Entity.Data.ToArray()).ToArray();
        var outcomes = new List<PropertyBatchOutcome>();
        var modified = new HashSet<int>();
        var priorStrings = GameInfo.Strings;
        try
        {
            // Synchronous inside one Worker: no awaited operation may run while this language is set.
            GameInfo.Strings = GameInfo.GetStrings(request.Language == "zh" ? "zh-Hans" : request.Language);
            for (int group = 0; group < sets.Length; group++)
            {
                var set = sets[group];
                EntityBatchEditor.ScreenStrings(set.Filters); EntityBatchEditor.ScreenStrings(set.Instructions);
                bool IsMeta(StringInstruction f) => BatchFilters.FilterMeta.Any(m => m.IsMatch(f.PropertyName));
                var meta = set.Filters.Where(IsMeta).ToArray(); var filters = set.Filters.Where(f => !IsMeta(f)).ToArray();
                for (int index = 0; index < slots.Count; index++)
                {
                    var entry = slots[index]; var p = entry.Entity; int box = entry.Source is SlotInfoBox b ? b.Box : -1;
                    if (p.Species == 0) continue;
                    string result; bool error = false;
                    if (box >= 0 && save.IsBoxSlotOverwriteProtected(box, entry.Source.Slot)) result = "protected";
                    else if (p.Species > save.MaxSpeciesID || !p.Valid) result = "invalid";
                    else if (!EntityBatchEditor.IsFilterMatchMeta(meta, entry)) result = "filtered";
                    else
                    {
                        var outcome = EntityBatchEditor.Instance.TryModify(p, filters, set.Instructions);
                        error = outcome.HasFlag(ModifyResult.Error); outcome &= ~ModifyResult.Error;
                        result = outcome == ModifyResult.Modified ? "modified" : outcome == ModifyResult.Filtered ? "filtered" : "skipped";
                        if (outcome == ModifyResult.Modified) { p.RefreshChecksum(); modified.Add(index); }
                    }
                    outcomes.Add(new(group, box, entry.Source.Slot, result, error));
                }
            }
        }
        finally { GameInfo.Strings = priorStrings; }
        var changed = modified.Where(i => !slots[i].Entity.Data.SequenceEqual(original[i])).ToArray();
        if (request.Scope == "party" && changed.Length != 0)
        {
            var party = slots.Select(s => s.Entity).Where(p => p.Species != 0).ToArray();
            if (changed.Any(i => slots[i].Entity.IsEgg) && party.All(p => p.IsEgg))
                throw new ArgumentException("Property batch party must contain a non-egg Pokemon when adding an egg.");
            for (int i = 0; i < 6; i++) save.SetPartySlotAtIndex(i < party.Length ? party[i] : save.BlankPKM, i, EntityImportSettings.None);
        }
        else foreach (int i in changed) slots[i].Source.WriteTo(save, slots[i].Entity, EntityImportSettings.None);
        var expected = Snapshot(save);
        var output = changed.Length == 0 ? input.ToArray() : save.Write().ToArray();
        var reopened = SaveUtil.GetSaveFile(output.ToArray());
        if (reopened is null || reopened.GetType() != save.GetType() || !SaveChecksums.Valid(reopened) || Snapshot(reopened) != expected)
            throw new InvalidOperationException("Property batch export verification failed.");
        return new(SHA256.HashData(input), output, new(sets.Length, sets.Sum(s => s.Filters.Count), sets.Sum(s => s.Instructions.Count),
            changed.Length, commands.IgnoredLines, commands.EmptyValues, outcomes.ToArray()));
    }
    private static string Snapshot(SaveFile save) => BoxEditing.Snapshot(save) + "|" + save.PartyCount + "|" +
        string.Join('|', Enumerable.Range(0, save.HasParty ? 6 : 0).Select(i => Convert.ToHexString(save.GetPartySlotAtIndex(i).Data)));
}
