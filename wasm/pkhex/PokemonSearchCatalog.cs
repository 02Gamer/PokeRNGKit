// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonSearchField(string Name, string Type, bool Present, bool HasValue, string Value);
public sealed record PokemonSearchFormat(int Index, string Name, PokemonSearchField[] Fields);
public sealed record PokemonSearchCatalog(OriginChoice[] Species, OriginChoice[] Abilities, OriginChoice[] Natures,
    OriginChoice[] Items, OriginChoice[] Games, OriginChoice[] HiddenPowerTypes, OriginChoice[] Moves,
    string[] Prefixes, bool[] MutationPrefixes, PokemonSearchFormat[] Formats);

internal static class PokemonSearchCatalogReader
{
    internal static PokemonSearchCatalog Read(SaveFile save, PKM current)
    {
        var sources = new[] { "zh-Hans", "en", "ja" }.Select(l => new GameDataSource(GameInfo.GetStrings(l))).ToArray();
        var filtered = sources.Select(s => new FilteredGameDataSource(save, s)).ToArray();
        OriginChoice[] Map(Func<int, IReadOnlyList<ComboItem>> get, Func<ComboItem, bool>? include = null)
        {
            var lists = Enumerable.Range(0, 3).Select(i => get(i)).ToArray();
            var names = lists.Select(list => list.GroupBy(v => v.Value).ToDictionary(g => g.Key, g => g.Select(v => v.Text).ToArray())).ToArray();
            var occurrences = new Dictionary<int, int>();
            return lists[1].Where(v => include?.Invoke(v) ?? true).Select(v => {
                int occurrence = occurrences.GetValueOrDefault(v.Value);
                occurrences[v.Value] = occurrence + 1;
                return new OriginChoice(v.Value, new(names[0][v.Value][occurrence], names[1][v.Value][occurrence], names[2][v.Value][occurrence]));
            }).ToArray();
        }
        var prefixes = StringInstruction.Prefixes[1..].ToArray();
        return new(Map(i => sources[i].SpeciesDataSource, v => v.Value != 0), Map(i => sources[i].AbilityDataSource),
            Map(i => sources[i].NatureDataSource), Map(i => filtered[i].Items),
            Map(i => sources[i].VersionDataSource.Take(sources[i].VersionDataSource.Count - 1).ToArray()),
            Map(i => Util.GetCBList(sources[i].Strings.HiddenPowerTypes)),
            Map(i => filtered[i].Moves.Skip(1).ToArray()), prefixes.Select(c => c.ToString()).ToArray(),
            prefixes.Select(StringInstruction.IsMutationInstruction).ToArray(), Formats(current));
    }

    internal static PokemonSearchFormat[] Formats(PKM current)
    {
        var editor = EntityBatchEditor.Instance;
        return Enumerable.Range(0, editor.Properties.Length).Select(index => new PokemonSearchFormat(index,
            index == 0 ? "any" : index > editor.Types.Count ? "all" : editor.Types[index - 1].Name.ToLowerInvariant(),
            editor.Properties[index].Select(name => Field(current, index, name)).ToArray())).ToArray();
    }

    private static PokemonSearchField Field(PKM current, int index, string name)
    {
        var editor = EntityBatchEditor.Instance;
        string type = editor.TryGetPropertyType(name, out var result, index) ? result : "Unknown";
        if (!editor.TryGetHasProperty(current, name, out var property)) return new(name, type, false, false, "");
        var propertyType = property.PropertyType;
        if (propertyType.IsGenericType && propertyType.GetGenericTypeDefinition().IsByRefLike)
            return new(name, type, true, false, propertyType.ToString());
        var value = property.GetValue(current)?.ToString();
        return new(name, type, true, value is not null, value ?? "null");
    }
}
