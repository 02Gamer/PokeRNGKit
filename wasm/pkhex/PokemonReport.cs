// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Reflection;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;

namespace PokeRNGKit.SaveEditor;

public sealed record PokemonReportColumn(string Name, string Type, bool Visible, bool Sortable);
public sealed record PokemonReportRow(string Sprite, string Source, int Box, int Slot, string[] Cells);
public sealed record PokemonReportData(PokemonReportColumn[] Columns, PokemonReportRow[] Rows);
public sealed record PokemonReportCatalog(string[] Extra, string[] Columns);
public sealed record PokemonReportQuery(string Language = "zh-Hans", string[]? Extra = null,
    string[]? Hidden = null, string? Sort = null, bool Descending = false, int? SortIndex = null);

// Source: ReportGrid, EntitySummaryImage, PropertyComparer and SlotInfoLoader.
// Reports own every entity clone; even the upstream Stat_Level refresh stays local.
internal static class PokemonReport
{
    private sealed class Summary(PKM entity, GameStrings strings, string position) : EntitySummary(entity, strings)
    {
        public override string Position => position;
    }
    private sealed record Entry(SlotCache Slot, Summary Summary, object?[] Values);
    private static readonly PropertyInfo[] Properties = typeof(EntitySummary).GetProperties(BindingFlags.Public | BindingFlags.Instance);
    internal static PokemonReportCatalog Catalog() => new(EntityBatchEditor.Instance.Properties[0],
        new[] { "Sprite" }.Concat(Properties.Select(p => p.Name)).ToArray());

    internal static PokemonReportData Read(SaveFile source, PokemonReportQuery query)
    {
        Validate(query);
        var save = source.Clone();
        var slots = new List<SlotCache>();
        SlotInfoLoader.AddFromSaveFile(save, slots);
        return Read(slots, query);
    }

    internal static PokemonReportData Read(IEnumerable<SlotCache> slots, PokemonReportQuery query)
    {
        Validate(query);
        var strings = GameInfo.GetStrings(query.Language);
        var entries = new List<Entry>();
        foreach (var original in slots)
        {
            var slot = new SlotCache(original.Source, original.Entity.Clone(), original.SAV);
            var entity = slot.Entity;
            if (entity.Species - 1u >= entity.MaxSpeciesID) continue;
            entity.Stat_Level = entity.CurrentLevel;
            var summary = new Summary(entity, strings, slot.Identify());
            var values = Properties.Select(property => property.Name switch
            {
                // EntitySummary's locations use global GameInfo.Strings; use its exact
                // GameStrings rule explicitly so a report cannot change other tools.
                nameof(EntitySummary.MetLoc) => Location(entity, strings, false),
                nameof(EntitySummary.EggLoc) => Location(entity, strings, true),
                _ => property.GetValue(summary),
            }).ToArray();
            entries.Add(new(slot, summary, values));
        }
        var columns = new List<PokemonReportColumn> { new("Sprite", "Image", !(query.Hidden ?? []).Contains("Sprite", StringComparer.Ordinal), false) };
        columns.AddRange(Properties.Select(p => new PokemonReportColumn(p.Name, p.PropertyType.Name,
            !(query.Hidden ?? []).Contains(p.Name, StringComparer.Ordinal), true)));
        var provider = new BatchPropertyProvider<EntityBatchEditor, PKM>(EntityBatchEditor.Instance);
        var extraValues = new List<string?[]>();
        foreach (string property in query.Extra ?? [])
        {
            if (property.Length == 0) continue;
            var values = entries.Select(e => ExtraValue(provider, e.Summary.Entity, property)).ToArray();
            if (values.All(v => v is null)) continue;
            // Upstream extra columns are created after HideSpecifiedColumns.
            columns.Add(new(property, "String", true, true));
            extraValues.Add(values);
        }
        var ordered = Order(query, entries.Select(e => e.Values).ToArray(), columns, extraValues);
        var rows = ordered.Select(index =>
        {
            var entry = entries[index];
            var entity = entry.Summary.Entity;
            var cells = entry.Values.Select(v => Convert.ToString(v, CultureInfo.CurrentCulture) ?? "")
                .Concat(extraValues.Select(v => v[index] ?? "")).ToArray();
            var sourceKind = entry.Slot.Source;
            int box = sourceKind is SlotInfoBox boxInfo ? boxInfo.Box : -1;
            int slot = sourceKind switch { SlotInfoBox b => b.Slot, SlotInfoParty p => p.Slot, SlotInfoMisc m => m.Slot, _ => -1 };
            return new PokemonReportRow("b" + SpriteName.GetResourceStringSprite(entity.Species, entity.Form, entity.Gender,
                entity is IFormArgument f ? f.FormArgument : 0, entity.Context, entity.IsShiny),
                sourceKind is SlotInfoBox ? "box" : sourceKind is SlotInfoParty ? "party" : "extra", box, slot, cells);
        }).ToArray();
        return new(columns.ToArray(), rows);
    }

    internal static List<int> Order(PokemonReportQuery query, object?[][] values,
        List<PokemonReportColumn> columns, List<string?[]> extraValues)
    {
        var ordered = Enumerable.Range(0, values.Length).ToList();
        if (query.SortIndex is int index && (index <= 0 || index >= columns.Count)) throw new ArgumentException("Invalid report sort column index.");
        int sort = query.SortIndex is int selected ? selected - 1 : query.Sort is null ? -1 : Array.FindIndex(Properties, p => p.Name == query.Sort);
        if (sort >= Properties.Length) sort = -1;
        if (sort >= 0)
        {
            var comparer = SummaryComparer(Properties[sort].PropertyType);
            ordered.Sort((a, b) => (query.Descending ? -1 : 1) * comparer.Compare(values[a][sort], values[b][sort]));
        }
        else if (query.Sort is not null || query.SortIndex is not null)
        {
            int extra = query.SortIndex is int selectedExtra ? selectedExtra - Properties.Length - 1 : columns.FindIndex(Properties.Length + 1, c => c.Name == query.Sort) - Properties.Length - 1;
            if (extra < 0) throw new ArgumentException("Unknown report sort column.");
            ordered.Sort((a, b) => (query.Descending ? -1 : 1) * Comparer<string?>.Default.Compare(extraValues[extra][a], extraValues[extra][b]));
        }
        return ordered;
    }
    // EntitySummary exposes these six scalar types. Explicit roots retain the
    // identical Comparer<T>.Default behavior in the trimmed browser runtime.
    private static System.Collections.IComparer SummaryComparer(Type type) =>
        type == typeof(string) ? Comparer<string>.Default :
        type == typeof(int) ? Comparer<int>.Default :
        type == typeof(uint) ? Comparer<uint>.Default :
        type == typeof(byte) ? Comparer<byte>.Default :
        type == typeof(ushort) ? Comparer<ushort>.Default :
        type == typeof(bool) ? Comparer<bool>.Default :
        throw new InvalidOperationException("Unsupported upstream summary property type.");

    internal static void Validate(PokemonReportQuery query)
    {
        if (query.Language is not ("zh-Hans" or "en" or "ja")) throw new ArgumentException("Invalid report language.");
        foreach (var fields in new[] { query.Extra, query.Hidden })
            if (fields is not null && (fields.Length > 256 || fields.Any(v => v is null || v.Length > 128)))
                throw new ArgumentException("Report property list exceeds the browser limit.");
        if (query.Sort is not null && query.Sort.Length > 128) throw new ArgumentException("Invalid report sort property.");
    }
    private static string Location(PKM entity, GameStrings strings, bool egg) => entity.Format < 2 ? "" :
        strings.GetLocationName(egg, egg ? entity.EggLocation : entity.MetLocation, entity.Format, entity.Generation, entity.Version);
    internal static string? ExtraValue(BatchPropertyProvider<EntityBatchEditor, PKM> provider, PKM entity, string name)
    {
        // Span-returning properties cannot be boxed by PropertyInfo.GetValue.
        // The web report displays their type instead of failing the whole report.
        if (EntityBatchEditor.Instance.TryGetHasProperty(entity, name, out var property) && property.PropertyType.IsByRefLike)
            return property.PropertyType.ToString();
        return provider.TryGetProperty(entity, name, out var value) ? value : null;
    }

    // Export all columns, including hidden ones, as ReportGrid does. Embedded quotes
    // are escaped for a usable CSV; this documented web correction differs upstream.
    internal static string Csv(PokemonReportData report) => string.Join("\r\n",
        new[] { report.Columns.Skip(1).Select(c => c.Name) }.Concat(report.Rows.Select(r => r.Cells))
            .Select(row => string.Join(",", row.Select(v => "\"" + v.Replace("\"", "\"\"") + "\"")))) + "\r\n";
}
