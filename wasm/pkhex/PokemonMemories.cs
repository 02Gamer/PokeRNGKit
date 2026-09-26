// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record MemoryQuery(int Box, int Slot, int Handler, int? Memory = null);
public sealed record MemoryEdit(int Handler, int Memory, int Variable, int Intensity, int Feeling);
public sealed record MemoryCatalog(MemoryEdit Current, bool CanEdit, string Nickname, string Trainer,
    OriginChoice[] Memories, OriginChoice[] Variables, OriginChoice[] Intensities, OriginChoice[] Feelings, string ArgumentType, CareField[] Care, bool IsEgg);

internal static class PokemonMemories
{
    private static readonly Lazy<MemoryStrings[]> Strings = new(() => new[] { "zh-Hans", "en", "ja" }.Select(l => new MemoryStrings(GameInfo.GetStrings(l))).ToArray());
    private static OriginChoice[] Choices(Func<MemoryStrings, IEnumerable<ComboItem>> select)
    {
        var lists = Strings.Value.Select(s => select(s).ToDictionary(c => c.Value, c => c.Text)).ToArray();
        return lists[0].Keys.Select(id => new OriginChoice(id, new(lists[0][id], lists[1][id], lists[2][id]))).ToArray();
    }
    private static OriginChoice[] Texts(Func<MemoryStrings, string[]> select) => Choices(s => select(s).Select((text, i) => new ComboItem(text, i)));
    private static void ValidateHandler(PKM p, int handler)
    {
        if (p is not ITrainerMemories || handler is not (0 or 1))
            throw new ArgumentException("Pokemon memories are unavailable for this format or trainer.");
    }
    public static MemoryCatalog Read(PKM p, int handler, int? memory = null)
    {
        ValidateHandler(p, handler);
        var value = MemoryVariableSet.Read((ITrainerMemories)p, handler);
        var id = memory ?? value.MemoryID;
        var memories = Choices(s => s.Memory);
        if (memory is not null && !memories.Any(c => c.Id == id))
            throw new ArgumentException("Pokemon memory is not in the supported catalog.");
        var generation = handler == 0 ? (p.Generation == 0 ? p.Format : p.Generation) : p.Format;
        var argumentType = Memories.GetMemoryArgType((byte)id, generation);
        var variables = Choices(s => s.GetArgumentStrings(argumentType, generation));
        var editable = p.IsEgg || (handler == 0 ? p.Generation >= 6 : p.Generation < 6 || p.HandlingTrainerName.Length != 0);
        var intensities = Texts(s => s.GetMemoryQualities().ToArray());
        // Desktop replaces intensity zero with the localized "None" species entry.
        intensities[0] = Choices(s => s.Species.Where(c => c.Value == 0))[0];
        return new(new(handler, id, value.Variable, value.Intensity, value.Feeling), editable,
            p.Nickname, handler == 0 ? p.OriginalTrainerName : p.HandlingTrainerName,
            memories, variables, intensities,
            Texts(s => s.GetMemoryFeelings(handler == 0 ? p.Generation : p.Format).ToArray()), argumentType.ToString(), PokemonCare.Read(p), p.IsEgg);
    }
    public static void Apply(PKM p, MemoryEdit edit)
    {
        var catalog = Read(p, edit.Handler, edit.Memory);
        if (!catalog.CanEdit) throw new ArgumentException("Pokemon memory editing is unavailable for this trainer history.");
        var variable = catalog.Variables.Length > 1 ? edit.Variable : 0;
        var intensity = edit.Memory == 0 ? 0 : edit.Intensity;
        var feeling = edit.Memory == 0 ? 0 : edit.Feeling;
        if (!catalog.Variables.Any(c => c.Id == variable) || !catalog.Intensities.Any(c => c.Id == intensity) || !catalog.Feelings.Any(c => c.Id == feeling) ||
            edit.Variable < 0 || edit.Variable > ushort.MaxValue || edit.Intensity < 0 || edit.Intensity > byte.MaxValue || edit.Feeling < 0 || edit.Feeling > byte.MaxValue)
            throw new ArgumentException("Pokemon memory parameters are outside the supported catalog.");
        var memories = (ITrainerMemories)p;
        if (edit.Handler == 0)
        {
            memories.OriginalTrainerMemory = (byte)edit.Memory;
            memories.OriginalTrainerMemoryVariable = (ushort)variable;
            memories.OriginalTrainerMemoryIntensity = (byte)intensity;
            memories.OriginalTrainerMemoryFeeling = (byte)feeling;
        }
        else
        {
            memories.HandlingTrainerMemory = (byte)edit.Memory;
            memories.HandlingTrainerMemoryVariable = (ushort)variable;
            memories.HandlingTrainerMemoryIntensity = (byte)intensity;
            memories.HandlingTrainerMemoryFeeling = (byte)feeling;
        }
        var actual = MemoryVariableSet.Read(memories, edit.Handler);
        if (actual.MemoryID != edit.Memory || actual.Variable != variable || actual.Intensity != intensity || actual.Feeling != feeling)
            throw new ArgumentException("Pokemon memory cannot be represented.");
    }
}
