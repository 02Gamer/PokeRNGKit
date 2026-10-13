// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabaseRuntimeTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"})
        {
            var save=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"))!;
            var p=save.BlankPKM;p.Species=25;p.Version=save.Version;p.CurrentLevel=5;p.ForcePartyData();p.Valid=true;
            save.SetBoxSlotAtIndex(p,0,0,EntityImportSettings.None);
            byte[] input=save.Write().ToArray(),original=input.ToArray();
            var bytes=new byte[p.SIZE_PARTY];p.WriteDecryptedDataParty(bytes);var before=bytes.ToArray();
            var descriptors=new[]{new PokemonDatabaseDescriptor("entity","selected/pokemon."+p.Extension,0,bytes.Length,true,123)};
            string sources=JsonSerializer.Serialize(new PokemonDatabaseOpenRequest(descriptors,new(FilterUnavailableSpecies:false)),PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest);
            var opened=JsonSerializer.Deserialize(PokemonDatabaseRuntime.Open(input,bytes,sources),PokemonDatabaseJson.Default.PokemonDatabaseView)!;
            Check(opened.Files.Length==1 && opened.Files[0].Id=="entity" && opened.Rows.Any(r=>r.FileId=="entity"),$"JSON source ownership {fixture}: total={opened.Total}, matches={opened.Matches}, file={string.Join(';',opened.Files.Select(f=>$"{f.Id}/{f.Count}/{f.Error}"))}, rowFormats={string.Join(',',opened.Rows.Select(r=>$"{r.FileId}:{r.Format}"))}");
            Check(opened.SourceHash==Br4Editing.Hash(input) && opened.FilesHash==PokemonDatabaseSession.HashFiles(new[]{new PokemonDatabaseFile("entity",descriptors[0].Name,bytes,true,123)}),"Exact JSON source bindings");
            var file=opened.Rows.First(r=>r.FileId=="entity");
            var exported=PokemonDatabaseRuntime.Export(file.Id);
            Check(PokemonFiles.TryRead(bytes,"."+p.Extension,save,out var sourceEntity),"Source file parser");sourceEntity!.ForcePartyData();
            var expectedFile=new byte[sourceEntity.SIZE_PARTY];sourceEntity.WriteDecryptedDataParty(expectedFile);
            Check(Convert.FromBase64String(exported.Data).SequenceEqual(expectedFile),"Cached export retains source parser own-format representation");
            var all=new PokemonDatabaseReadRequest(new(new(),Context:EntityContext.None),0);
            var allRows=JsonSerializer.Deserialize(PokemonDatabaseRuntime.Read(JsonSerializer.Serialize(all,PokemonDatabaseJson.Default.PokemonDatabaseReadRequest)),PokemonDatabaseJson.Default.PokemonDatabaseView)!;
            Check(allRows.Rows.Any(r=>r.FileId=="entity"),"Explicit Any format keeps cross-format chosen entities");
            var search=new PokemonDatabaseReadRequest(new(new(Species:25)),0);
            var matches=JsonSerializer.Deserialize(PokemonDatabaseRuntime.Read(JsonSerializer.Serialize(search,PokemonDatabaseJson.Default.PokemonDatabaseReadRequest)),PokemonDatabaseJson.Default.PokemonDatabaseView)!;
            Check(matches.Rows.All(r=>r.Pokemon.Species==25) && matches.Matches>=1,"JSON source filtering and typed row payload");
            string edit=JsonSerializer.Serialize(new PokemonDatabaseEdit("delete",[file.Id]),PokemonDatabaseJson.Default.PokemonDatabaseEdit);
            var ticket=JsonSerializer.Deserialize(PokemonDatabaseRuntime.Prepare(input,bytes,sources,edit),PokemonDatabaseJson.Default.PokemonDatabaseTicket)!;
            var confirmation=new PokemonDatabaseCommitRequest(descriptors,ticket.Confirmation);
            string confirmationJson=JsonSerializer.Serialize(confirmation,PokemonDatabaseJson.Default.PokemonDatabaseCommitRequest);
            var output=JsonSerializer.Deserialize(PokemonDatabaseRuntime.Commit(input,bytes,confirmationJson),PokemonDatabaseJson.Default.PokemonDatabaseCommit)!;
            Check(output.Save.SequenceEqual(input) && output.Files.Length==0,"JSON exact frozen local-file deletion output");
            Reject(()=>PokemonDatabaseRuntime.Commit(input,bytes,confirmationJson));
            Reject(()=>PokemonDatabaseRuntime.Read("{}"));Reject(()=>PokemonDatabaseRuntime.Read("{\"query\":null}"));
            Reject(()=>PokemonDatabaseRuntime.Open(input,bytes,"{\"files\":[]}"));
            Reject(()=>PokemonDatabaseRuntime.Read("{}"));
            Reject(()=>PokemonDatabaseRuntime.Files(bytes,[descriptors[0] with{Offset=1}]));
            Reject(()=>PokemonDatabaseRuntime.Files(bytes,[descriptors[0] with{Length=bytes.Length+1}]));
            Check(input.SequenceEqual(original) && bytes.SequenceEqual(before),"Runtime load/read/export/prepare/commit/reject preserve both buffers");
            PokemonDatabaseRuntime.Reset();
            Console.WriteLine($"PASS database runtime {fixture}: required JSON, binary slices, page/typed rows/filter/export, source bindings/frozen confirmation and immutable buffers");
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid database runtime request accepted");}
}
