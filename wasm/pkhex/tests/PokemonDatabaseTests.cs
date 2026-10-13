// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Core.Searching;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabaseTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"})
        {
            var bytes=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav");
            var save=SaveUtil.GetSaveFile(bytes.ToArray())!;
            var original=save.Data.ToArray();
            var slots=new List<SlotCache>();SlotInfoLoader.AddFromSaveFile(save.Clone(),slots);
            var first=slots.FirstOrDefault(s=>s.IsDataValid());
            if(first is null)
            {
                var entity=save.BlankPKM;entity.Species=25;entity.CurrentLevel=5;entity.Valid=true;
                Check(entity.Valid,"Independent valid entity for fixture without valid occupants");
                first=new SlotCache(new SlotInfoBox(0,0,save),entity,save.Clone());
            }
            var file=new SlotCache(new SlotInfoFileSingle("chosen/pokemon."+first.Entity.Extension),first.Entity.Clone());
            var external=new[]{file,first};var before=external.Select(s=>s.Entity.Data.ToArray()).ToArray();
            foreach(DatabaseSortMode sort in Enum.GetValues<DatabaseSortMode>())
            {
                var db=new PokemonDatabase(save,external,new(Sort:sort));
                Check(db.GridRows==9,"Source default row count");
                Check(db.Rows.Count(r=>r.Source=="file")==1 && db.Rows.Count(r=>r.Source=="backup")==1,"Explicit source ownership");
                Check(db.Rows.Select(r=>r.Id).SequenceEqual(Enumerable.Range(0,db.Rows.Count)),"Stable physical result ids");
                if(sort==DatabaseSortMode.SlotIdentity)Check(db.Rows.Select(r=>r.Identity).SequenceEqual(db.Rows.Select(r=>r.Identity).Order(StringComparer.Ordinal)),"Source initial identity order");
                foreach(var clones in Enum.GetValues<CloneDetectionMethod>()) foreach(var legal in new bool?[]{null,false,true})
                    foreach(int sources in Enumerable.Range(0,8))
                    {
                        var query=new PokemonDatabaseQuery(new(),(sources&1)!=0,(sources&2)!=0,(sources&4)!=0,legal,clones);
                        var expected=db.Rows.Where(r=>r.Source=="current"?query.Current:r.Source=="file"?query.Files:query.Backups).ToArray();
                        var settings=PokemonSearch.Settings(query.Filters,save);settings.SearchLegal=legal;settings.SearchClones=clones;
                        var filtered=settings.Search(expected.Select(r=>r.Entry)).ToArray();
                        Check(db.Search(query).Select(r=>r.Entry).SequenceEqual(filtered),"Source provenance/legal/clone pipeline");
                    }
            }
            Check(save.Data.SequenceEqual(original),"Complete current save preserved");
            for(int i=0;i<external.Length;i++)Check(external[i].Entity.Data.SequenceEqual(before[i]),"Selected source entities preserved");
            Check(new PokemonDatabase(save,[],new(GridRows:0)).GridRows==5 && new PokemonDatabase(save,[],new(GridRows:99)).GridRows==20,"Source rows clamp 5..20");
            Console.WriteLine($"PASS database {fixture}: three sources, initial sorts, all legal/clone/source combinations, row bounds and original save/entity bytes");
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
}
