// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Searching;
using PokeRNGKit.SaveEditor;

internal static class PokemonSearchTests
{
    internal static void Run()
    {
        PKM[] entities = [new PK1(), new PK2(), new SK2(), new PK3(), new CK3(), new XK3(), new PK4(), new BK4(), new RK4(),
            new PK5(), new PK6(), new PK7(), new PB7(), new PK8(), new PB8(), new PA8(), new PK9(), new PA9()];
        PokemonSearchQuery[] queries = [new(), new(Species: 25), new(Species: 1), new(Nickname: " pi "),
            new(Ability: 0), new(Nature: 0), new(Item: 0), new(Version: 0), new(Version: (int)GameVersion.E),
            new(Generation: 1), new(Generation: 3), new(HiddenPowerType: 0), new(Shiny: false), new(Shiny: true),
            new(Egg: false), new(Egg: true), new(Egg: true, Esv: "9999"), new(Egg: true, Esv: ""),
            new(LevelComparison: 1, Level: "001"), new(LevelComparison: 2, Level: "255"),
            new(LevelComparison: 3, Level: "000"), new(LevelComparison: 1, Level: "999"), new(LevelComparison: 1, Level: ""),
            new(Moves: [1, 1, 0, 0]), new(Instructions: "=Species=25"), new(Instructions: "!Species=25"),
            new(Instructions: ".Species=1\n=Species=25"), new(Instructions: "=Box=999")];
        foreach (var entity in entities)
        {
            entity.Species = 25; entity.Nickname = "Pika"; entity.CurrentLevel = 50; entity.Move1 = 1; entity.RefreshChecksum();
            byte[] original = entity.Data.ToArray();
            var formats = PokemonSearchCatalogReader.Formats(entity);
            foreach (var format in formats) foreach (var field in format.Fields)
            {
                if (!EntityBatchEditor.Instance.TryGetHasProperty(entity, field.Name, out var property))
                { Check(!field.Present && !field.HasValue && field.Value == "", "Missing current entity property has no value"); continue; }
                bool span = property.PropertyType.IsGenericType && property.PropertyType.GetGenericTypeDefinition().IsByRefLike;
                string? display = span ? property.PropertyType.ToString() : property.GetValue(entity)?.ToString();
                Check(field.Value == (display ?? "null") && field.HasValue == (!span && display is not null), "Source property display, Span and null semantics");
            }
            Check(entity.Data.SequenceEqual(original), "Property builder preserves complete current entity");
            foreach (var query in queries.Concat(Enumerable.Range(0, 7).Select(v => new PokemonSearchQuery(IvType: v))).Concat(Enumerable.Range(0, 5).Select(v => new PokemonSearchQuery(EvType: v))))
            {
                var expected = Oracle(query).CreateSearchPredicate()(entity);
                var actual = PokemonSearch.Settings(query).CreateSearchPredicate()(entity);
                Check(expected == actual, "Source control settings predicate parity");
                Check(entity.Data.SequenceEqual(original), "Search preserves full entity");
            }
            Console.WriteLine($"PASS Pokemon search {entity.GetType().Name}: all source filter families, empty/invalid level, move deduplication, instructions and complete entity preservation");
        }
        foreach (SaveFile contextSave in new SaveFile[] { new SAV3E(), new SAV6XY(), new SAV7b(), new SAV8BS(), new SAV8LA(), new SAV9ZA() })
        {
            var settings = PokemonSearch.Settings(new(), contextSave);
            var comparison = contextSave.Generation >= 8 ? SearchComparison.Equals : SearchComparison.LessThanEquals;
            Check(settings.Context == contextSave.Context && settings.SearchContext == comparison, "Nested hidden format preserves source initialization");
            foreach (var entity in entities)
                Check(settings.CreateSearchPredicate()(entity) == SearchUtil.SatisfiesFilterContext(entity, contextSave.Context, comparison), "Source hidden context predicate across every entity layout");
        }
        foreach (string fixture in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD", "GP", "GE" })
        {
            byte[] bytes = File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav");
            var save = SaveUtil.GetSaveFile(bytes.ToArray())!; byte[] original = save.Data.ToArray();
            var catalog = PokemonSearchCatalogReader.Read(save, save.BlankPKM);
            var source = new GameDataSource(GameInfo.GetStrings("en"));
            var filtered = new FilteredGameDataSource(save, source);
            Check(catalog.Species.Select(c => c.Id).SequenceEqual(source.SpeciesDataSource.Where(c => c.Value != 0).Select(c => c.Value)), "Unfiltered source species candidates");
            Check(catalog.Abilities.Select(c => c.Id).SequenceEqual(source.AbilityDataSource.Select(c => c.Value)), "Unfiltered source ability candidates");
            Check(catalog.Items.Select(c => c.Id).SequenceEqual(filtered.Items.Select(c => c.Value)), "Save-filtered source held items");
            Check(catalog.Moves.Select(c => c.Id).SequenceEqual(filtered.Moves.Skip(1).Select(c => c.Value)), "Source move list removal of first entry");
            for (int language = 0; language < 3; language++)
            {
                string code = new[] { "zh-Hans", "en", "ja" }[language];
                var localSource = new GameDataSource(GameInfo.GetStrings(code));
                var localFiltered = new FilteredGameDataSource(save, localSource);
                foreach (var pair in new[] { (catalog.Species, localSource.SpeciesDataSource.Where(c => c.Value != 0).ToArray()), (catalog.Abilities, localSource.AbilityDataSource.ToArray()), (catalog.Items, localFiltered.Items.ToArray()), (catalog.Moves, localFiltered.Moves.Skip(1).ToArray()) })
                {
                    var groups = pair.Item2.GroupBy(c => c.Value).ToDictionary(g => g.Key, g => g.Select(c => c.Text).ToArray()); var occurrences = new Dictionary<int, int>();
                    foreach (var choice in pair.Item1) { int index = occurrences.GetValueOrDefault(choice.Id); occurrences[choice.Id] = index + 1; string name = language == 0 ? choice.Name.Zh : language == 1 ? choice.Name.En : choice.Name.Ja; Check(name == groups[choice.Id][index], "Every candidate exact language/duplicate occurrence"); }
                }
            }
            Check(catalog.Games.Select(c => c.Id).SequenceEqual(source.VersionDataSource.Take(source.VersionDataSource.Count - 1).Select(c => c.Value)), "Source version list removes final empty only");
            var editor = EntityBatchEditor.Instance;
            Check(catalog.Formats.Length == editor.Properties.Length && catalog.Prefixes.SequenceEqual(StringInstruction.Prefixes[1..].ToArray().Select(c => c.ToString())), "Builder every format and source readonly prefix visibility");
            for (int format = 0; format < catalog.Formats.Length; format++)
            {
                Check(catalog.Formats[format].Fields.Select(f => f.Name).SequenceEqual(editor.Properties[format]), "Complete builder property list/order");
                foreach (var field in catalog.Formats[format].Fields)
                {
                    Check(field.Type == (editor.TryGetPropertyType(field.Name, out var type, format) ? type : "Unknown"), "Source type per chosen format");
                    Check(field.Present == editor.TryGetHasProperty(save.BlankPKM, field.Name, out _), "Source current-entity property applicability");
                }
            }
            foreach (var query in new[] { new PokemonSearchQuery(), new(Species: 25), new(Shiny: false), new(Instructions: "=Species=25") })
            {
                var predicate = Oracle(query, save).CreateSearchPredicate();
                var expected = new List<PokemonSearchPosition>();
                for (int box = 0; box < save.BoxCount; box++) for (int slot = 0; slot < save.BoxSlotCount; slot++)
                { var p = save.GetBoxSlotAtIndex(box, slot); if (p.Species != 0 && predicate(p)) expected.Add(new(box, slot)); }
                Check(PokemonSearch.Read(save, query).Matches.SequenceEqual(expected), "Every physical box match, party excluded");
                foreach (int box in new[] { 0, save.BoxCount - 1 }) foreach (int slot in new[] { -1, 0, save.BoxSlotCount - 1 }) foreach (bool reverse in new[] { false, true })
                {
                    bool found = SearchUtil.TrySeekNext(save, predicate, out var position, box, slot, reverse);
                    var actual = PokemonSearch.Seek(save, query, box, slot, reverse);
                    Check(actual == (found ? new PokemonSearchPosition(position.Box, position.Slot) : null), "Source seek direction/start/wrap");
                }
                Check(save.Data.SequenceEqual(original), "Full save remains unchanged");
            }
            Console.WriteLine($"PASS Pokemon search {fixture}: physical matching and bidirectional source seek with original save preservation");
        }
        Reject(new(Level: "1234")); Reject(new(Generation: 10)); Reject(new(IvType: 7)); Reject(new(EvType: 5)); Reject(new(Moves: [0, 0, 0, 0, 0])); Reject(new(Version: 258));
    }
    private static SearchSettings Oracle(PokemonSearchQuery q, SaveFile? save = null)
    {
        var settings = new SearchSettings { Context = save?.Context ?? EntityContext.None, SearchContext = save is null ? SearchComparison.None : save.Generation >= 8 ? SearchComparison.Equals : SearchComparison.LessThanEquals,
            Species = q.Species, Ability = q.Ability, Nature = (Nature)q.Nature, Item = q.Item, Nickname = q.Nickname.Trim(), Version = (GameVersion)q.Version,
            Generation = (byte)q.Generation, HiddenPowerType = q.HiddenPowerType, SearchLevel = (SearchComparison)q.LevelComparison, Level = byte.TryParse(q.Level, out var level) ? level : null,
            IVType = q.IvType, EVType = q.EvType, BatchInstructions = q.Instructions };
        settings.SearchShiny = q.Shiny; settings.SearchEgg = q.Egg;
        if (q.Egg is not null && int.TryParse(q.Esv, out var esv)) settings.ESV = esv;
        foreach (ushort move in q.Moves ?? []) settings.AddMove(move);
        return settings;
    }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(PokemonSearchQuery query) { try { PokemonSearch.Settings(query); } catch (ArgumentException) { return; } throw new Exception("Invalid search controls accepted"); }
}
