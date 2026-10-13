// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonSearchApiTests
{
    internal static void Run()
    {
        foreach (string fixture in new[] { "E", "D", "Pt", "HG", "B", "B2", "X", "OR", "SN", "US", "BD", "GP", "GE" })
        {
            byte[] input = File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"), original = input.ToArray();
            var save = SaveUtil.GetSaveFile(input.ToArray())!;
            var query = new PokemonSearchQuery(Species: 25);
            string queryJson = JsonSerializer.Serialize(query, SaveJsonContext.Default.PokemonSearchQuery);
            var results = JsonSerializer.Deserialize(SaveService.SearchPokemon(input, queryJson), SaveJsonContext.Default.PokemonSearchResults)!;
            Check(results.Matches.SequenceEqual(PokemonSearch.Read(save, query).Matches), "Public search positions/order");
            var clearedVersion = query with { Version = 0 };
            var cleared = JsonSerializer.Deserialize(SaveService.SearchPokemon(input, JsonSerializer.Serialize(clearedVersion, SaveJsonContext.Default.PokemonSearchQuery)), SaveJsonContext.Default.PokemonSearchResults)!;
            Check(cleared.Matches.SequenceEqual(results.Matches), "Cleared origin candidate GetIndex zero is not a saved-version filter");
            foreach (bool reverse in new[] { false, true })
            {
                var request = new PokemonSearchSeekRequest(query, save.BoxCount - 1, -1, reverse);
                var result = JsonSerializer.Deserialize(SaveService.SeekPokemon(input, JsonSerializer.Serialize(request, SaveJsonContext.Default.PokemonSearchSeekRequest)), SaveJsonContext.Default.PokemonSearchSeekResult)!;
                Check(result.Position == PokemonSearch.Seek(save, query, request.Box, request.Slot, reverse), "Public seek query/result");
            }
            var target = new PokemonSearchTarget(0, 0);
            var catalog = JsonSerializer.Deserialize(SaveService.ReadPokemonSearchCatalog(input, JsonSerializer.Serialize(target, SaveJsonContext.Default.PokemonSearchTarget)), SaveJsonContext.Default.PokemonSearchCatalog)!;
            Check(JsonSerializer.Serialize(catalog, SaveJsonContext.Default.PokemonSearchCatalog) == JsonSerializer.Serialize(PokemonSearchCatalogReader.Read(save, save.GetBoxSlotAtIndex(0, 0)), SaveJsonContext.Default.PokemonSearchCatalog), "Public current entity complete catalog");
            Reject(() => SaveService.ReadPokemonSearchCatalog(input, "{\"box\":0}"));
            Reject(() => SaveService.ReadPokemonSearchCatalog(input, "{\"box\":999,\"slot\":0}"));
            Reject(() => SaveService.SearchPokemon(input, "{\"nickname\":null}"));
            Reject(() => SaveService.SearchPokemon(input, "{\"species\":65536}"));
            Reject(() => SaveService.SeekPokemon(input, "{}"));
            Reject(() => SaveService.SeekPokemon(input, "{\"query\":null,\"box\":0,\"slot\":-1,\"reverse\":false}"));
            Check(input.SequenceEqual(original), "All read/rejected APIs preserve complete caller buffer");
            Console.WriteLine($"PASS public Pokemon search {fixture}: catalog/all fields, matches, source seek, malformed requests and original buffer");
        }
        Reject(() => SaveService.SearchPokemon([1, 2, 3], "{}"));
        Reject(() => SaveService.SearchPokemon([1], new string('x', 256 * 1024 + 1)));
        Reject(() => SaveService.ReadPokemonSearchCatalog([1], new string('x', 4097)));
    }
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); } catch (ArgumentException) { return; } catch (JsonException) { return; } throw new Exception("Invalid public search request accepted"); }
}
