// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;

public sealed record PokemonSearchTarget(int? Box = null, int? Slot = null);
public sealed record PokemonSearchSeekRequest(
    [property: JsonRequired] PokemonSearchQuery Query,
    [property: JsonRequired] int Box,
    [property: JsonRequired] int Slot,
    [property: JsonRequired] bool Reverse);
public sealed record PokemonSearchSeekResult(PokemonSearchPosition? Position);
public static partial class Program
{
    [JSExport] public static string ReadPokemonSearchCatalog(byte[] data, string json) => SaveService.ReadPokemonSearchCatalog(data, json);
    [JSExport] public static string SearchPokemon(byte[] data, string json) => SaveService.SearchPokemon(data, json);
    [JSExport] public static string SeekPokemon(byte[] data, string json) => SaveService.SeekPokemon(data, json);
}
public static partial class SaveService
{
    public static string ReadPokemonSearchCatalog(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Search catalog query is too large.");
        var target = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonSearchTarget) ?? throw new ArgumentException("Missing search catalog target.");
        var save = Open(data);
        if (target.Box.HasValue != target.Slot.HasValue) throw new ArgumentException("Incomplete search catalog target.");
        var entity = target.Box is int box && target.Slot is int slot ? PokemonEditing.Read(save, box, slot) : save.BlankPKM;
        return JsonSerializer.Serialize(PokemonSearchCatalogReader.Read(save, entity), SaveJsonContext.Default.PokemonSearchCatalog);
    }
    public static string SearchPokemon(byte[] data, string json)
    {
        if (json.Length > 256 * 1024) throw new ArgumentException("Search query is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonSearchQuery) ?? throw new ArgumentException("Missing search query.");
        return JsonSerializer.Serialize(PokemonSearch.Read(Open(data), query), SaveJsonContext.Default.PokemonSearchResults);
    }
    public static string SeekPokemon(byte[] data, string json)
    {
        if (json.Length > 256 * 1024) throw new ArgumentException("Search navigation query is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonSearchSeekRequest) ?? throw new ArgumentException("Missing search navigation query.");
        if (request.Query is null) throw new ArgumentException("Missing search filters.");
        return JsonSerializer.Serialize(new PokemonSearchSeekResult(PokemonSearch.Seek(Open(data), request.Query, request.Box, request.Slot, request.Reverse)), SaveJsonContext.Default.PokemonSearchSeekResult);
    }
}
