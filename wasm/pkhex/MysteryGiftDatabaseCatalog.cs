// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal sealed record MysteryGiftDatabaseCatalog(OriginChoice[] Species,OriginChoice[] Items,OriginChoice[] Moves,
    PokemonSearchFormat[] Formats,string[] Prefixes);
internal static class MysteryGiftDatabaseCatalogReader
{
    internal static MysteryGiftDatabaseCatalog Read(SaveFile save,MysteryGiftDatabase database,PKM editor)
    {
        var languages=new[]{"zh-Hans","en","ja"};
        var sources=languages.Select(language=>new FilteredGameDataSource(save,new GameDataSource(GameInfo.GetStrings(language)))).ToArray();
        OriginChoice[] Map(Func<FilteredGameDataSource,IReadOnlyList<ComboItem>> selector,Func<ComboItem,bool>? include=null)
        {
            var lists=sources.Select(selector).ToArray();
            var lookup=lists.Select(list=>list.GroupBy(item=>item.Value).ToDictionary(group=>group.Key,group=>group.Select(item=>item.Text).ToArray())).ToArray();
            var occurrence=new Dictionary<int,int>();
            return lists[1].Where(item=>include?.Invoke(item)??true).Select(item=>{
                int index=occurrence.GetValueOrDefault(item.Value);occurrence[item.Value]=index+1;
                return new OriginChoice(item.Value,new(lookup[0][item.Value][index],lookup[1][item.Value][index],lookup[2][item.Value][index]));
            }).ToArray();
        }
        var species=database.Species.ToHashSet();
        return new(Map(source=>source.Species,item=>species.Contains((ushort)item.Value)),Map(source=>source.Items),
            Map(source=>source.Moves.Skip(1).ToArray()),PokemonSearchCatalogReader.Formats(editor),
            StringInstruction.Prefixes[1..].ToArray().Select(prefix=>prefix.ToString()).ToArray());
    }
}
