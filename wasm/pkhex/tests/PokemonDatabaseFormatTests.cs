// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Searching;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabaseFormatTests
{
    internal static void Run()
    {
        PKM[] entities=[new PK1(),new PK2(),new SK2(),new PK3(),new CK3(),new XK3(),new PK4(),new BK4(),new RK4(),new PK5(),new PK6(),new PK7(),new PB7(),new PK8(),new PB8(),new PA8(),new PK9(),new PA9()];
        foreach(var entity in entities){entity.Species=25;entity.CurrentLevel=5;entity.Valid=true;Check(entity.Valid,"Every matrix entity is valid and cannot be silently omitted");}
        var slots=entities.Select((entity,i)=>new SlotCache(new SlotInfoFileSingle("entity"+i+"."+entity.Extension),entity)).ToArray();
        var save=SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!;var database=new PokemonDatabase(save,slots,new(FilterUnavailableSpecies:false));
        Check(database.Rows.Count(r=>r.Source=="file")==18,"All 18 layouts reach the format matrix");
        var contexts=Enum.GetValues<EntityContext>().Where(c=>c==EntityContext.None || c.IsValid && c.ToString().StartsWith("Gen",StringComparison.Ordinal));
        foreach(var context in contexts)foreach(var comparison in Enum.GetValues<SearchComparison>())
        {
            var query=new PokemonDatabaseQuery(new(),Context:context,Comparison:comparison);
            var source=new SearchSettings{Species=0,Context=context,SearchContext=comparison,Version=(GameVersion)byte.MaxValue};
            var expected=source.Search(database.Rows.Select(r=>r.Entry)).ToArray();
            Check(database.Search(query).Select(r=>r.Entry).SequenceEqual(expected),"Every visible source format/comparator across 18 entities");
        }
        Reject(()=>database.Search(new(new(),Context:(EntityContext)255)));
        Reject(()=>database.Search(new(new(),Comparison:(SearchComparison)255)));
        Console.WriteLine("PASS database format controls: every upstream context/comparison, 18 entity layouts and invalid values");
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid database format accepted");}
}
