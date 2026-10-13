// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonDatabasePreparedTests
{
    internal static void Run()
    {
        foreach(string fixture in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"}) {
            byte[] input=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav"),original=input.ToArray();
            var save=SaveService.OpenDatabaseSave(input.ToArray());var p=save.BlankPKM;p.Species=25;p.Version=save.Version;p.CurrentLevel=5;p.ForcePartyData();p.Valid=true;
            var data=new byte[p.SIZE_PARTY];p.WriteDecryptedDataParty(data);byte[] originalEntity=data.ToArray();
            var descriptors=new[]{new PokemonDatabaseDescriptor("file","original."+p.Extension,0,data.Length,true,UseFileFormat:true)};
            string opening=JsonSerializer.Serialize(new PokemonDatabaseOpenRequest(descriptors,new(FilterUnavailableSpecies:false)),PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest);
            var view=JsonSerializer.Deserialize(SaveService.OpenPokemonDatabase(input,data,opening),PokemonDatabaseJson.Default.PokemonDatabaseView)!;
            int id=view.Rows.First(r=>r.FileId=="file").Id;
            var before=SaveService.ExportPokemonDatabaseEntity(input,id);
            var file=JsonSerializer.Deserialize(SaveService.ViewPokemonDatabaseEntity(input,id),PokemonDatabaseJson.Default.PokemonFile)!;
            var prepared=StandalonePokemon.Open(Convert.FromBase64String(file.Data),file.FileName,false,true).Entity;
            Check(prepared.GetType()==save.PKMType && prepared.Valid && prepared.ChecksumValid,"Source conversion yields current save type and valid checksum");
            Check(SaveService.ExportPokemonDatabaseEntity(input,id)==before && input.SequenceEqual(original) && data.SequenceEqual(originalEntity),"View conversion keeps database rows and both input buffers unchanged");
            prepared.CurrentLevel=12;prepared.ForcePartyData();prepared.Valid=true;
            var changed=new byte[prepared.SIZE_PARTY];prepared.WriteDecryptedDataParty(changed);
            var added=new PokemonDatabaseFile("prepared","edited."+prepared.Extension,changed,true,1,true);
            foreach(string action in new[]{"add","import"}) {
                var edit=new PokemonDatabaseEdit(action,Add:added,Settings:EntityImportSettings.None);
                var request=new PokemonDatabasePreviewRequest(descriptors,edit);
                var ticket=JsonSerializer.Deserialize(SaveService.PreviewPokemonDatabase(input,data,JsonSerializer.Serialize(request,PokemonDatabaseJson.Default.PokemonDatabasePreviewRequest)),PokemonDatabaseJson.Default.PokemonDatabaseTicket)!;
                var output=JsonSerializer.Deserialize(SaveService.CommitPokemonDatabase(input,data,JsonSerializer.Serialize(new PokemonDatabaseCommitRequest(descriptors,ticket.Confirmation),PokemonDatabaseJson.Default.PokemonDatabaseCommitRequest)),PokemonDatabaseJson.Default.PokemonDatabaseCommitDelta)!;
                if(action=="add") {
                    Check(output.Save.SequenceEqual(input) && output.Added.Length==1 && output.Added[0].UseFileFormat && output.Added[0].Data.SequenceEqual(changed),"Prepared editor adds exact declared file without save writes");
                    var loaded=PokemonDatabaseFiles.Load(save,output.Added);Check(loaded.Slots.Length==1&&loaded.Slots[0].Entity.GetType()==prepared.GetType()&&loaded.Slots[0].Entity.CurrentLevel==12,"Declared prepared file reload retains edited type and fields");
                } else {
                    var oracle=PokemonDatabase.Copy(save);int count=oracle.LoadBoxes([prepared.Clone()],out _,0,false,false,EntityImportSettings.None);
                    Check(ticket.Imported==count && output.Save.SequenceEqual(oracle.Write().ToArray()) && output.Added.Length==0,"Prepared import exact Core whole-file output without library changes");
                }
            }
            Check(input.SequenceEqual(original)&&data.SequenceEqual(originalEntity),"All prepared workflows preserve source buffers");PokemonDatabaseRuntime.Reset();
        }
        var ambiguous=new PK7{Species=25,Version=GameVersion.Any};ambiguous.CurrentLevel=5;ambiguous.Valid=true;
        var raw=new byte[ambiguous.SIZE_PARTY];ambiguous.WriteDecryptedDataParty(raw);
        var destination=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/US.sav"));
        var stored=new PokemonDatabaseFile("declared","edited.pk7",raw,true,UseFileFormat:true);
        Check(PokemonDatabaseFiles.Load(destination,[stored]).Slots.Single().Entity is PK7,"Changed format clues never reinterpret an explicitly prepared PK7");
        Check(PokemonDatabaseSession.HashFiles([stored])!=PokemonDatabaseSession.HashFiles([stored with {UseFileFormat=false}]),"Format interpretation is bound to confirmation file hash");
        foreach(bool japanese in new[]{false,true})foreach(int partition in new[]{0,1})foreach(int profile in Enumerable.Range(0,4)) {
            byte[] input=Br4EditingTests.Fixture(japanese,partition),original=input.ToArray();SaveService.ConfigureBRProfile(profile);
            var save=SaveService.OpenDatabaseSave(input.ToArray());var p=save.BlankPKM;p.Species=25;p.Version=GameVersion.D;p.CurrentLevel=5;p.Valid=true;
            var bytes=new byte[p.SIZE_PARTY];p.WriteDecryptedDataParty(bytes);
            var descriptors=new[]{new PokemonDatabaseDescriptor("br","input.bk4",0,bytes.Length,true,UseFileFormat:true)};
            var view=JsonSerializer.Deserialize(SaveService.OpenPokemonDatabase(input,bytes,JsonSerializer.Serialize(new PokemonDatabaseOpenRequest(descriptors,new(FilterUnavailableSpecies:false)),PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest)),PokemonDatabaseJson.Default.PokemonDatabaseView)!;
            int id=view.Rows.First(r=>r.FileId=="br").Id;
            var output=JsonSerializer.Deserialize(SaveService.ViewPokemonDatabaseEntity(input,id),PokemonDatabaseJson.Default.PokemonFile)!;
            var converted=StandalonePokemon.Open(Convert.FromBase64String(output.Data),output.FileName,false,true).Entity;
            Check(converted is BK4 && converted.Valid && input.SequenceEqual(original),"BR converted editor preserves both regions/partitions and selected profile input");
            SaveService.ConfigureBRProfile((profile+1)%4);bool rejected=false;try{SaveService.ViewPokemonDatabaseEntity(input,id);}catch(ArgumentException){rejected=true;}Check(rejected,"BR view rejects changed profile with unchanged encrypted bytes");
            PokemonDatabaseRuntime.Reset();SaveService.ResetBRProfile();
        }
        Console.WriteLine("PASS database prepared editor: 13 current-format source conversions, add/import whole outputs, declared reload, ambiguous clues and immutable source buffers");
    }
    private static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
}
