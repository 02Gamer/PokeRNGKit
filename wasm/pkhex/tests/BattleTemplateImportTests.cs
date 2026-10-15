// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class BattleTemplateImportTests
{
    private const string Text="Pikachu @ Light Ball\nAbility: Static\nLevel: 35\nTimid Nature\nEVs: 4 HP / 252 SpA / 252 Spe\nIVs: 0 Atk\n- Thunderbolt\n- Protect";
    internal static void Run()
    {
        foreach(var format in new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US","BD","GP","GE"}) {
            var save=SaveService.OpenDatabaseSave(File.ReadAllBytes($".tmp/pkhex-fixtures/{format}.sav"));
            var original=save.BlankPKM;original.Species=1;original.PID=0x12345678;original.OriginalTrainerName="ORIG";
            save.SetBoxSlotAtIndex(original,0,EntityImportSettings.None);
            var input=save.Write().ToArray();var before=input.ToArray();var target=new BattleTemplateTarget("save",0,0);
            var ticket=Prepare(input,target,Text);var confirmation=Confirm(ticket);
            Check(input.SequenceEqual(before),"Preview changed input");
            Check(ticket.Result.En.Contains("Pikachu")&&ticket.ResultPid.Length==8&&ticket.ResultEncryptionConstant.Length==8,"Missing complete result preview");
            var output=Commit(input,confirmation);var reopened=SaveService.OpenDatabaseSave(output);
            var p=reopened.GetBoxSlotAtIndex(0);
            Check(Br4Editing.Hash(output)==ticket.TargetHash&&p.Species==25&&p.CurrentLevel==35&&p.Move1==85&&p.Move2==182&&p.OriginalTrainerName=="ORIG"&&SaveChecksums.Valid(reopened)&&input.SequenceEqual(before),"Import metadata, frozen bytes, trainer or checksum differs");
            Reject(()=>Commit(input,confirmation));
            var second=Prepare(input,target,Text);var third=Prepare(input,target,Text);
            Reject(()=>Commit(input,Confirm(second)));BattleTemplateImport.Discard(third.Token);Reject(()=>Commit(input,Confirm(third)));
            var stale=Prepare(input,target,Text);var changed=input.ToArray();changed[^1]^=1;Reject(()=>Commit(changed,Confirm(stale)));
            var issue=Prepare(input,target,Text+"\nDefinitely invalid template line");
            Check(issue.Issues.Length>0,"Invalid source line not reported");Reject(()=>Commit(input,Confirm(issue)));Commit(input,Confirm(issue) with{AcceptIssues=true});
            var removed=Prepare(input,target,Text);Reject(()=>Prepare(input,target,"https://pokepast.es/no-network"));Reject(()=>Commit(input,Confirm(removed)));
            var empty=Prepare(input,target with{Slot=1},Text);var emptyOutput=Commit(input,Confirm(empty));
            Check(SaveService.OpenDatabaseSave(emptyOutput).GetBoxSlotAtIndex(0,1).Species==25,"Empty box target import missing");
            original.RefreshChecksum();var file=new byte[original.SIZE_STORED];original.WriteDecryptedDataStored(file);var fileBefore=file.ToArray();
            var fileTarget=new BattleTemplateTarget("file",FileName:"test."+original.Extension,UseFileFormat:true);
            var fileTicket=Prepare(file,fileTarget,Text);var fileOutput=Commit(file,Confirm(fileTicket));
            var entity=StandalonePokemon.Open(fileOutput,"test."+original.Extension,useFileFormat:true).Entity;
            Check(entity.Species==25&&entity.CurrentLevel==35&&entity.OriginalTrainerName=="ORIG"&&file.SequenceEqual(fileBefore)&&Br4Editing.Hash(fileOutput)==fileTicket.TargetHash,"Standalone source/frozen output differs");
            Console.WriteLine($"PASS battle template import {format}: save/entity, frozen output, trainer/input preservation, empty slot, invalid lines acknowledgement, stale/replaced/discard/one-use and no URL fetching");
        }
        foreach(PKM p in new PKM[]{new PK1(),new PK1(true),new PK2(),new PK2(true),new CK3(),new XK3(),new BK4(),new PK8(),new PA8(),new PK9(),new PA9()}) {
            p.Species=1;p.CurrentLevel=5;p.Nickname="A";p.OriginalTrainerName="A";p.PID=0x12345678;p.RefreshChecksum();
            var input=p is GBPKML gb?StandaloneGb.Write(gb):new byte[p.SIZE_STORED];
            if(p is not GBPKML)p.WriteDecryptedDataStored(input);
            var original=input.ToArray();var target=new BattleTemplateTarget("file",FileName:"test."+p.Extension,UseFileFormat:true);
            var ticket=Prepare(input,target,Text);var output=Commit(input,Confirm(ticket));
            var check=StandalonePokemon.Open(output,"test."+p.Extension,useFileFormat:true).Entity;
            Check(check.Species==25&&check.CurrentLevel==35&&Br4Editing.Hash(output)==ticket.TargetHash&&input.SequenceEqual(original),"Additional entity template import differs");
            Console.WriteLine($"PASS additional template entity {p.GetType().Name}: frozen complete output, full list/name containers and input preservation");
        }
        foreach(var language in new[]{LanguageID.English,LanguageID.Japanese})
        foreach(var version in new[]{GameVersion.RB,GameVersion.C}) {
            SaveFile save=version==GameVersion.RB?new SAV1(language,version):new SAV2(language,version);
            save.OT=language==LanguageID.Japanese?"ア":"A";var p=save.BlankPKM;p.Species=25;p.CurrentLevel=5;save.PartyData=[p];save.SetBoxSlotAtIndex(p,0,0);
            if(save is SAV1 g1){g1.Data[g1.Japanese?0x29B9:0x29C3]=0x99;g1.Data[g1.Japanese?0x2712:0x271C]=0;}
            var input=save.Write().ToArray();var original=input.ToArray();
            foreach(var target in new[]{new BattleTemplateTarget("save",0,0),new("save",-1,0)}) {
                var ticket=Prepare(input,target,Text);var output=Commit(input,Confirm(ticket));
                var result=SaveService.OpenDatabaseSave(output);var entity=PokemonEditing.Read(result,target.Box,target.Slot);
                Check(entity.Species==25&&entity.CurrentLevel==35&&SaveChecksums.Valid(result)&&input.SequenceEqual(original),"GB save template import differs");
            }
            Console.WriteLine($"PASS GB save template {version}/{language}: party/box, names/list serialization, source/full output/checksum and input preservation");
        }
        var realPath=Environment.GetEnvironmentVariable("PKHEX_REAL_SAVE_PATH");
        if(!string.IsNullOrEmpty(realPath)) {
            var input=File.ReadAllBytes(realPath);var before=input.ToArray();
            var save=SaveService.OpenDatabaseSave(input.ToArray());var source=save.GetBoxSlotAtIndex(0,0);
            var text=ShowdownParsing.GetShowdownText(source);
            var ticket=Prepare(input,new("save",0,0),text);var output=Commit(input,Confirm(ticket));
            Check(input.SequenceEqual(before)&&File.ReadAllBytes(realPath).SequenceEqual(before)&&SaveChecksums.Valid(SaveService.OpenDatabaseSave(output))&&Br4Editing.Hash(output)==ticket.TargetHash,"Real save import modified original or invalid export");
            Console.WriteLine("PASS real E.sav import: frozen working-copy export/checksum and original file/input preservation");
        }
        var multilingual=new PK6{Species=25,Version=GameVersion.OR,Nickname="Pikachu",OriginalTrainerName="A",Move1=85};multilingual.CurrentLevel=35;
        var multilingualData=new byte[multilingual.SIZE_STORED];multilingual.WriteDecryptedDataStored(multilingualData);
        var multilingualTarget=new BattleTemplateTarget("file",FileName:"text.pk6",UseFileFormat:true);
        foreach(var language in new[]{LanguageID.ChineseS,LanguageID.English,LanguageID.Japanese}) {
            var text=ShowdownParsing.GetShowdownText(multilingual,new BattleTemplateExportSettings(language));
            var ticket=Prepare(multilingualData,multilingualTarget,text+"\n\nBulbasaur\nLevel: 10");
            var result=StandalonePokemon.Open(Commit(multilingualData,Confirm(ticket)),"text.pk6",useFileFormat:true).Entity;
            Check(result.Species==25&&result.CurrentLevel==35&&result.Move1==85,"Localized import or first-set-only behavior differs");
        }
        Reject(()=>Prepare(multilingualData,multilingualTarget,""));
        Reject(()=>Prepare(multilingualData,multilingualTarget,new string('A',BattleTemplateImport.MaximumTextLength+1)));
        Console.WriteLine("PASS template languages and boundaries: Chinese/English/Japanese source text, first set only, empty/oversized input rejection");
        var fixture=File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav");var policyTicket=Prepare(fixture,new("save",0,0),Text);
        var settings=SaveProgramSettingsCodec.Defaults();settings.Import.ApplyMarkings=!settings.Import.ApplyMarkings;
        SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
        try{Reject(()=>Commit(fixture,Confirm(policyTicket)));}finally{SaveProgramSettingsRuntime.Reset();}
        BattleTemplateImport.Reset();
    }
    private static BattleTemplateImportTicket Prepare(byte[] input,BattleTemplateTarget target,string text)=>JsonSerializer.Deserialize(SaveService.PreviewBattleTemplateImport(input,JsonSerializer.Serialize(new BattleTemplateImportRequest(Br4Editing.Hash(input),target,text),BattleTemplateImportJson.Default.BattleTemplateImportRequest)),BattleTemplateImportJson.Default.BattleTemplateImportTicket)!;
    private static BattleTemplateImportConfirmation Confirm(BattleTemplateImportTicket ticket)=>new(ticket.Token,ticket.SourceHash,ticket.TargetHash,ticket.Target);
    private static byte[] Commit(byte[] input,BattleTemplateImportConfirmation confirmation)=>SaveService.CommitBattleTemplateImport(input,JsonSerializer.Serialize(confirmation,BattleTemplateImportJson.Default.BattleTemplateImportConfirmation));
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid import request accepted");}
}
