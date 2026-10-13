// SPDX-License-Identifier: GPL-3.0-or-later
using System.Reflection;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class PokemonReportTests
{
    private sealed class Oracle(PKM entity, GameStrings strings, string position) : EntitySummary(entity, strings)
    {
        public override string Position => position;
    }
    internal static void Run()
    {
        var provider = new BatchPropertyProvider<EntityBatchEditor, PKM>(EntityBatchEditor.Instance);
        PKM[] formats = [new PK1(),new PK2(),new SK2(),new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new RK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()];
        foreach(var entity in formats) foreach(string property in EntityBatchEditor.Instance.Properties[0])
        {
            string? expected = null;
            if(EntityBatchEditor.Instance.TryGetHasProperty(entity,property,out var info))
                expected = info.PropertyType.IsByRefLike ? info.PropertyType.ToString() : info.GetValue(entity)?.ToString();
            Check(PokemonReport.ExtraValue(provider,entity,property) == expected,"Every extra property/all 18 formats including unboxable Span");
        }
        var properties = typeof(EntitySummary).GetProperties(BindingFlags.Public | BindingFlags.Instance);
        foreach (string fixture in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD", "GP", "GE" })
        {
            var input = File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav");
            var save = SaveUtil.GetSaveFile(input.ToArray()) ?? throw new Exception("Unrecognized report fixture");
            var original = save.Data.ToArray();
            var slots = new List<SlotCache>();
            SlotInfoLoader.AddFromSaveFile(save.Clone(), slots);
            slots = slots.Where(s => s.Entity.Species - 1u < s.Entity.MaxSpeciesID).ToList();
            string originalLanguage = GameInfo.CurrentLanguage;
            var originalStrings = GameInfo.Strings;
            try
            {
                foreach (string language in new[] { "zh-Hans", "en", "ja" })
                {
                    GameInfo.CurrentLanguage = language; GameInfo.Strings = GameInfo.GetStrings(language);
                    var actual = PokemonReport.Read(save, new(language));
                    var summaries = slots.Select(entry => { entry.Entity.Stat_Level = entry.Entity.CurrentLevel; return new Oracle(entry.Entity, GameInfo.Strings, entry.Identify()); }).ToArray();
                    var oracleValues = summaries.Select(s => properties.Select(p => p.GetValue(s)).ToArray()).ToArray();
                    Check(actual.Rows.Length == slots.Count, "Every box/party/extra source row");
                    Check(actual.Columns.Skip(1).Select(c => c.Name).SequenceEqual(properties.Select(p => p.Name)), "Every upstream summary property and order");
                    for (int i = 0; i < slots.Count; i++)
                    {
                        string[] expected = properties.Select(p => p.GetValue(summaries[i])?.ToString() ?? "").ToArray();
                        Check(actual.Rows[i].Cells.SequenceEqual(expected), "All field values match upstream summary including language/location/legality");
                        var source = slots[i].Source;
                        var row = actual.Rows[i];
                        Check(row.Source == (source is SlotInfoBox ? "box" : source is SlotInfoParty ? "party" : "extra"), "Storage category retains source ownership");
                        if (source is SlotInfoBox b) Check(row.Box == b.Box && row.Slot == b.Slot, "Real box position");
                        if (source is SlotInfoParty p) Check(row.Box == -1 && row.Slot == p.Slot, "Real party position");
                        if (source is SlotInfoMisc m) Check(row.Box == -1 && row.Slot == m.Slot, "Extra slot is never a box edit target");
                        var entity = slots[i].Entity;
                        Check(row.Sprite == "b" + PKHeX.Drawing.PokeSprite.SpriteName.GetResourceStringSprite(entity.Species, entity.Form, entity.Gender,
                            entity is IFormArgument f ? f.FormArgument : 0, entity.Context, entity.IsShiny), "Source sprite including form/gender/context");
                    }
                    var extended = PokemonReport.Read(save, new(language, ["Species", "PID", "MissingProperty"], ["Nickname", "Sprite"]));
                    Check(!extended.Columns[0].Visible && !extended.Columns[0].Sortable, "Sprite can hide but cannot sort");
                    Check(!extended.Columns.Single(c => c.Name == "Nickname").Visible, "Source hide before extras");
                    Check(extended.Columns.Count(c => c.Name == "Species") == (slots.Count > 0 ? 2 : 1), "Duplicate extra source property retained");
                    Check(!extended.Columns.Any(c => c.Name == "MissingProperty"), "Missing extras omitted");
                    foreach (var property in properties)
                    {
                        var comparer = (System.Collections.IComparer)typeof(Comparer<>).MakeGenericType(property.PropertyType).GetProperty("Default")!.GetValue(null)!;
                        int column = Array.IndexOf(properties, property);
                        foreach (bool descending in new[] { false, true })
                        {
                            var order = Enumerable.Range(0, slots.Count).ToList();
                            order.Sort((a, b) => (descending ? -1 : 1) * comparer.Compare(property.GetValue(summaries[a]), property.GetValue(summaries[b])));
                            var sorted = PokemonReport.Order(new(language, Sort: property.Name, Descending: descending), oracleValues, actual.Columns.ToList(), []);
                            Check(sorted.SequenceEqual(order), "Source typed ascending/descending sort");
                        }
                    }
                    Check(GameInfo.Strings == GameInfo.GetStrings(language), "Report leaves global language unchanged");
                }
            }
            finally { GameInfo.CurrentLanguage = originalLanguage; GameInfo.Strings = originalStrings; }
            Check(save.Data.SequenceEqual(original), "Complete source save unchanged");
            Console.WriteLine($"PASS ReportGrid {fixture}: all source rows/properties/languages, typed sorting, extra/hidden properties and complete source preservation");
        }
        var csv = PokemonReport.Csv(new([new("Sprite", "Image", true, false), new("Name", "String", false, true)],
            [new("", "box", 0, 0, ["a,\"b\"\nc"])]));
        Check(csv == "\"Name\"\r\n\"a,\"\"b\"\"\nc\"\r\n", "CSV includes hidden columns and safely escapes quotes/newlines");
        bool badSort = false; try { PokemonReport.Read(new SAV3E(), new(Sort: "Sprite")); } catch (ArgumentException) { badSort = true; }
        Check(badSort, "Unsortable image column rejected even with empty report");
        foreach (var query in new[] { new PokemonReportQuery("xx"), new PokemonReportQuery(Extra: [null!]),
            new PokemonReportQuery(Hidden: [new string('a', 129)]), new PokemonReportQuery(Extra: new string[257]),
            new PokemonReportQuery(Sort: new string('a', 129)) })
        { bool rejected = false; try { PokemonReport.Validate(query); } catch (ArgumentException) { rejected = true; } Check(rejected, "Invalid report language/property limits rejected"); }
    }
    private static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
}
