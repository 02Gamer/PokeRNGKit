// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabaseFileTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"})
        {
            byte[] input=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"), original=input.ToArray();
            var save=SaveUtil.GetSaveFile(input.ToArray())!;
            var p=save.BlankPKM;p.Species=25;p.CurrentLevel=5;p.Valid=true;
            var entityBytes=new byte[p.SIZE_PARTY];p.WriteDecryptedDataParty(entityBytes);var entityOriginal=entityBytes.ToArray();
            var files=new[]{new PokemonDatabaseFile("save",$"chosen/{fixture}.sav",input,false),new PokemonDatabaseFile("pkm","chosen/entity."+p.Extension,entityBytes,true),new PokemonDatabaseFile("invalid","chosen/bad.sav",[1,2,3],false)};
            var loaded=PokemonDatabaseFiles.Load(save,files);
            var expected=new List<SlotCache>();SlotInfoLoader.AddFromSaveFile(save,expected);
            Check(loaded.Files[0].Count==expected.Count && loaded.Files[0].Error is null,"All selected save slots loaded");
            Check(loaded.Files[1].Count==1 && loaded.Files[1].Error is null,"Selected decrypted party entity loaded");
            Check(loaded.Files[2].Error=="unrecognized" && loaded.Files[2].Count==0,"Invalid source reports no partial entries");
            Check(input.SequenceEqual(original)&&entityBytes.SequenceEqual(entityOriginal),"Complete input files unchanged");
            Check(loaded.FileIds.Length==loaded.Slots.Length && loaded.FileIds.Take(expected.Count).All(id=>id=="save") && loaded.FileIds.Last()=="pkm","Every selected slot retains explicit file id");
            var db=new PokemonDatabase(save,loaded.Slots,new(FilterUnavailableSpecies:false),loaded.FileIds);
            Check(db.Rows.Where(r=>r.Source=="file").All(r=>r.FileId=="pkm"),"File identity survives clone/filter/sort");
            foreach(var row in db.Rows)
            {
                var before=row.Entry.Entity.Data.ToArray();var output=PokemonDatabaseFiles.Export(row);
                var e=row.Entry.Entity.Clone();e.ForcePartyData();var bytes=new byte[e.SIZE_PARTY];e.WriteDecryptedDataParty(bytes);
                Check(Convert.FromBase64String(output.Data).SequenceEqual(bytes),"Export exact own-format party bytes");
                Check(output.FileName==PathUtil.CleanFileName(e.FileName),"Source filename cleanup");
                if(e.GetType()==save.PKMType)
                {
                    var converted=PokemonDatabaseFiles.Convert(row,save);
                    var oracle=EntityConverter.ConvertToType(e.Clone(),save.PKMType,out _)!;save.AdaptToSaveFile(oracle);oracle.RefreshChecksum();
                    if(e is PK6 or PK7 && e is IMemoryHT {HandlingTrainerMemory:0} && converted is IMemoryHT {HandlingTrainerMemory:4} memory && oracle is IMemoryHT expectedMemory)
                    {
                        // Source adaptation generates a new random trade feeling on each
                        // independent invocation. Validate that byte against its source
                        // range/table, then compare every other byte and rebuilt checksum.
                        int max=e is PK7?10:20;
                        Check(memory.HandlingTrainerMemoryFeeling<max && MemoryContext6.CanHaveFeeling6(4,memory.HandlingTrainerMemoryFeeling,memory.HandlingTrainerMemoryVariable),"Source generated trade feeling range/table");
                        Check(expectedMemory.HandlingTrainerMemory==4 && memory.HandlingTrainerMemoryIntensity==1 && memory.HandlingTrainerMemoryVariable==(e is PK7?0:9),"Exact source trade memory parameters");
                        expectedMemory.HandlingTrainerMemoryFeeling=memory.HandlingTrainerMemoryFeeling;oracle.RefreshChecksum();
                    }
                    if(!converted.Data.SequenceEqual(oracle.Data))
                    {
                        var actualBytes=converted.Data.ToArray();var oracleBytes=oracle.Data.ToArray();
                        string diff=string.Join(",",Enumerable.Range(0,Math.Min(actualBytes.Length,oracleBytes.Length)).Where(i=>actualBytes[i]!=oracleBytes[i]).Select(i=>$"{i:X}:{actualBytes[i]:X2}/{oracleBytes[i]:X2}"));
                        throw new Exception($"Source conversion mismatch {fixture}/{row.Source}/{row.Id}: {diff}; sizes {actualBytes.Length}/{oracleBytes.Length}");
                    }
                }
                Check(row.Entry.Entity.Data.SequenceEqual(before),"Export and conversion preserve database entity");
            }
            Reject(()=>PokemonDatabaseFiles.Load(save,[files[0],files[0]]));
            Reject(()=>PokemonDatabaseFiles.Load(save,[new("empty","file.sav",[],false)]));
            Console.WriteLine($"PASS database files {fixture}: source save/entity recognition, invalid file isolation, exact party export/conversion and original bytes");
        }
    }
    private static void Check(bool v,string message){if(!v)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}throw new Exception("Invalid database file accepted");}
}
