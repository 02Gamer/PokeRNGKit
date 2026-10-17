// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokemonEncounterTrainerFilesTests
{
    internal static void Run()
    {
        var directory=Path.GetFullPath(".tmp/pkhex-trainer-source-reference");Directory.CreateDirectory(directory);
        foreach(var (fixture,pk) in new (string,PKM)[]{("E",new PK3()),("X",new PK6()),("X",new PK9()),("US",new PK7()),("US",new PK9())}) {
            var input=File.ReadAllBytes($".tmp/pkhex-fixtures/{fixture}.sav");var original=input.ToArray();
            var save=SaveService.OpenDatabaseSave(input.ToArray());var version=Enum.Parse<GameVersion>(fixture);
            pk.Species=25;pk.Version=version;pk.OriginalTrainerName="REMOTE";pk.TID16=43210;pk.SID16=12345;pk.OriginalTrainerGender=1;
            pk.Language=pk is PK9?(int)LanguageID.Japanese:(int)LanguageID.English;pk.CurrentLevel=10;
            if(pk is IRegionOrigin region){region.ConsoleRegion=1;region.Country=7;region.Region=49;}
            pk.RefreshChecksum();
            foreach(bool party in new[]{false,true})foreach(bool encrypted in new[]{false,true}) {
                var bytes=new byte[party?pk.SIZE_PARTY:pk.SIZE_STORED];
                if(party){if(encrypted)pk.WriteEncryptedDataParty(bytes);else pk.WriteDecryptedDataParty(bytes);}
                else {if(encrypted)pk.WriteEncryptedDataStored(bytes);else pk.WriteDecryptedDataStored(bytes);}
                var before=pk.Data.ToArray();
                string path=Path.Combine(directory,$"{fixture}-{pk.GetType().Name}-{party}-{encrypted}.{pk.Extension}");File.WriteAllBytes(path,bytes);
                var reference=BoxUtil.GetPKMsFromPaths([path],save.Context).ToArray();
                var file=new PokemonFile(Path.GetFileName(path),Convert.ToBase64String(bytes));
                var parsed=PokemonEncounterTrainerFiles.Read([file],save.Context);
                Check(reference.Length==1&&parsed.Length==1&&parsed[0].GetType()==reference[0].GetType()&&parsed[0].Data.SequenceEqual(reference[0].Data),"Byte adapter matches upstream BoxUtil file loading for both layouts and encryption modes");
                var expected=new TrainerDatabase();expected.RegisterCopy(reference[0]);
                var db=new PokemonEncounterDatabase(save,save.BlankPKM,options:new(UseTabsAsCriteria:false),trainerPokemon:parsed);
                var rows=db.Search(new(25,(int)version));int id=Array.FindIndex(rows,e=>e.GetType().Name.StartsWith("EncounterSlot",StringComparison.Ordinal)&&e.Version.Contains(version));
                Check(id>=0&&db.TrainerFileCount==1,"File trainers registered separately from encounter results");
                var trainer=expected.GetTrainer(rows[id].Version)!;
                Check(Identity(db.TrainerFor(rows[id]))==Identity(trainer),"Core trainer copy preserves original identity, generation and region fallback");
                parsed[0].OriginalTrainerName="MUTATED";parsed[0].TID16=0;
                Check(Identity(db.TrainerFor(rows[id]))==Identity(trainer),"Registered file trainer is detached from editor mutations");
                var generated=db.Generate(id);Check(generated.OriginalTrainerName==trainer.OT&&generated.TID16==trainer.TID16&&generated.SID16==trainer.SID16&&generated.OriginalTrainerGender==trainer.Gender,"Encounter generation uses the file trainer");
                var request=new PokemonEncounterOpenRequest(TrainerFiles:[file]);
                var view=JsonSerializer.Deserialize(SaveService.OpenPokemonEncounters(input,[],JsonSerializer.Serialize(request,PokemonEncounterJson.Default.PokemonEncounterOpenRequest)),PokemonEncounterJson.Default.PokemonEncounterView)!;
                Check(view.TrainerFileCount==1&&view.SourceHash==Br4Editing.Hash(input),"Public API reports registered file trainers and retains save source binding");
                Check(File.ReadAllBytes(path).SequenceEqual(bytes)&&pk.Data.SequenceEqual(before)&&input.SequenceEqual(original),"Source Pokémon, picked file and save bytes remain unchanged");
            }
            Console.WriteLine($"PASS encounter trainer files {fixture}/{pk.GetType().Name}: BoxUtil parity, original trainer, region, ownership, source protection and public API");
        }
        var gb=new PK1{Species=25,OriginalTrainerName="TRAINER",TID16=3333,CurrentLevel=5};var gbData=StandaloneGb.Write(gb);var gbPath=Path.Combine(directory,"reference.pk1");File.WriteAllBytes(gbPath,gbData);
        var gbExpected=BoxUtil.GetPKMsFromPaths([gbPath],EntityContext.Gen3).Single();
        var gbActual=PokemonEncounterTrainerFiles.Read([new("reference.pk1",Convert.ToBase64String(gbData))],EntityContext.Gen3).Single();
        Check(gbExpected.OriginalTrainerName==gbActual.OriginalTrainerName&&gbExpected.TID16==gbActual.TID16,"GB list retains external trainer names");
        Check(PokemonEncounterTrainerFiles.Read([new("notes.txt",Convert.ToBase64String([1,2,3]))],EntityContext.Gen3).Length==0,"Non-Pokémon bytes are ignored as in BoxUtil");
        Reject(()=>PokemonEncounterTrainerFiles.Read(new PokemonFile[1025],EntityContext.Gen3));
        Reject(()=>PokemonEncounterTrainerFiles.Read([new("p.pk3","invalid base64")],EntityContext.Gen3));
        Reject(()=>PokemonEncounterTrainerFiles.Read([new("p.pk3",Convert.ToBase64String(new byte[PokemonFiles.MaximumSize+1]))],EntityContext.Gen3));
        Reject(()=>PokemonEncounterTrainerFiles.Read(Enumerable.Range(0,3).Select(_=>new PokemonFile("large.bin",Convert.ToBase64String(new byte[PokemonFiles.MaximumSize]))).ToArray(),EntityContext.Gen3));
        var sourceSave=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
        Reject(()=>new PokemonEncounterDatabase(sourceSave,sourceSave.BlankPKM,training:Enumerable.Range(0,1024).Select(_=>(ITrainerInfo)new SimpleTrainerInfo(GameVersion.E)).ToArray(),trainerPokemon:[new PK3()]));
        RealWorkingCopy();
        PokemonEncounterRuntime.Reset();
    }
    private static void RealWorkingCopy()
    {
        var path=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");if(string.IsNullOrWhiteSpace(path))return;
        var input=File.ReadAllBytes(path);var before=input.ToArray();var save=SaveService.OpenDatabaseSave(input.ToArray());
        Check(save.Version==GameVersion.E,"Expected owner-selected Emerald working copy");
        var pk=(save.BoxData.Concat(save.PartyData).FirstOrDefault(p=>p.Species>0)??save.BlankPKM).Clone();
        pk.Species=25;pk.Version=save.Version;pk.OriginalTrainerName="LIBFILE";pk.TID16=(ushort)(save.TID16^0xA5A5);pk.SID16=(ushort)(save.SID16^0x5A5A);pk.RefreshChecksum();
        var data=new byte[pk.SIZE_STORED];pk.WriteDecryptedDataStored(data);
        var request=new PokemonEncounterOpenRequest(TrainerFiles:[new("real-source.pk3",Convert.ToBase64String(data))]);
        var view=JsonSerializer.Deserialize(SaveService.OpenPokemonEncounters(input,[],JsonSerializer.Serialize(request,PokemonEncounterJson.Default.PokemonEncounterOpenRequest)),PokemonEncounterJson.Default.PokemonEncounterView)!;
        Check(view.TrainerFileCount==1,"Real save context registers the picked file trainer");
        view=JsonSerializer.Deserialize(SaveService.ReadPokemonEncounters(input,JsonSerializer.Serialize(new PokemonEncounterReadRequest(new(25,(int)save.Version)),PokemonEncounterJson.Default.PokemonEncounterReadRequest)),PokemonEncounterJson.Default.PokemonEncounterView)!;
        int id=view.Rows.First(r=>r.Type.StartsWith("EncounterSlot",StringComparison.Ordinal)).Id;
        var ticket=JsonSerializer.Deserialize(SaveService.PreviewPokemonEncounter(input,id),PokemonEncounterJson.Default.PokemonEncounterTicket)!;
        var output=JsonSerializer.Deserialize(SaveService.CommitPokemonEncounter(input,JsonSerializer.Serialize(ticket.Confirmation,PokemonEncounterJson.Default.PokemonEncounterConfirmation)),PokemonEncounterJson.Default.PokemonFile)!;
        var generated=StandalonePokemon.Open(Convert.FromBase64String(output.Data),output.FileName,false,true).Entity;
        Check(generated.OriginalTrainerName==pk.OriginalTrainerName&&generated.TID16==pk.TID16&&generated.SID16==pk.SID16,"Public real-save generation and frozen confirmation use file trainer rather than save fallback");
        Check(input.SequenceEqual(before)&&File.ReadAllBytes(path).SequenceEqual(before),"Real working copy remains unchanged");
        Console.WriteLine("PASS encounter trainer files real working copy: public source, generation, frozen confirmation and unchanged bytes");
    }
    private static string Identity(ITrainerInfo t)=>$"{t.Version}:{t.Generation}:{t.OT}:{t.ID32}:{t.Gender}:{t.Language}:"+(t is IRegionOriginReadOnly r?$"{r.ConsoleRegion}:{r.Country}:{r.Region}":"");
    private static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(Exception e)when(e is ArgumentException or FormatException){return;}throw new Exception("Invalid trainer file input accepted");}
}
