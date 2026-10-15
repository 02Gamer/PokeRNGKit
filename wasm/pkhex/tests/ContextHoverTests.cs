// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class ContextHoverTests
{
    internal static void Run()
    {
        var save=SaveService.OpenDatabaseSave(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"));
        var pk=save.BlankPKM;pk.Species=25;pk.CurrentLevel=25;pk.Move1=33;pk.Nickname="HOVER";
        save.SetBoxSlotAtIndex(pk,0,EntityImportSettings.None);var input=save.Write().ToArray();var original=input.ToArray();
        var bytes=new byte[pk.SIZE_PARTY];pk.WriteDecryptedDataParty(bytes);
        var descriptors=new[]{new PokemonDatabaseDescriptor("entity","hover.pk3",0,bytes.Length,true,UseFileFormat:true)};
        var opening=JsonSerializer.Serialize(new PokemonDatabaseOpenRequest(descriptors,new(false)),PokemonDatabaseJson.Default.PokemonDatabaseOpenRequest);
        using var view=JsonDocument.Parse(SaveService.OpenPokemonDatabase(input,bytes,opening));
        var rows=view.RootElement.GetProperty("rows").EnumerateArray().ToArray();
        int current=rows.First(row=>row.GetProperty("source").GetString()=="current").GetProperty("id").GetInt32();
        int file=rows.First(row=>row.GetProperty("source").GetString()=="file").GetProperty("id").GetInt32();
        var request=new PokemonDatabasePreviewRequest(descriptors,new("delete",[current]));
        var ticket=JsonSerializer.Deserialize(SaveService.PreviewPokemonDatabase(input,bytes,JsonSerializer.Serialize(request,PokemonDatabaseJson.Default.PokemonDatabasePreviewRequest)),PokemonDatabaseJson.Default.PokemonDatabaseTicket)!;
        foreach(int id in new[]{current,file}) {
            var report=Read(input,new("database",Id:id));
            Check(report.Box is null&&report.Slot is null&&report.Target is {Kind:"database"}&&report.Target.Id==id&&report.Artwork?.Species==25,"Database hover keeps entry identity without fabricated box positions");
            Check(report.SourceHash==Br4Editing.Hash(input)&&report.Mode=="pokemon"&&report.Text.En.Title.Length!=0,"Database hover source binding and Pokemon mode");
        }
        var confirmation=new PokemonDatabaseCommitRequest(descriptors,ticket.Confirmation);
        var committed=SaveService.CommitPokemonDatabase(input,bytes,JsonSerializer.Serialize(confirmation,PokemonDatabaseJson.Default.PokemonDatabaseCommitRequest));
        Check(committed.Length>0&&input.SequenceEqual(original),"Database hover preserves frozen confirmation and all source bytes");
        Reject(()=>Read(input,new("database",Id:int.MaxValue)));
        Reject(()=>Read(input,new("database",Box:0,Id:0)));
        PokemonDatabaseRuntime.Reset();
        Check(Read(input,new("slot",Box:0,Slot:0)).Target?.Kind=="slot","Unified entry also supports real slot namespace");

        SaveService.OpenPokemonEncounters(input,[],"{}");
        var search=new PokemonEncounterReadRequest(new(25,(int)GameVersion.E));
        using var found=JsonDocument.Parse(SaveService.ReadPokemonEncounters(input,JsonSerializer.Serialize(search,PokemonEncounterJson.Default.PokemonEncounterReadRequest)));
        Check(found.RootElement.GetProperty("matches").GetInt32()>0,"Actual encounter query produces candidates");
        var encounter=PokemonEncounterRuntime.HoverEntry(input,0);
        var prepared=JsonSerializer.Deserialize(SaveService.PreviewPokemonEncounter(input,0),PokemonEncounterJson.Default.PokemonEncounterTicket)!;
        CheckCandidate(input,new("encounter",Id:0),encounter,false);
        var output=SaveService.CommitPokemonEncounter(input,JsonSerializer.Serialize(prepared.Confirmation,PokemonEncounterJson.Default.PokemonEncounterConfirmation));
        using(var frozen=JsonDocument.Parse(output))Check(Br4Editing.Hash(Convert.FromBase64String(frozen.RootElement.GetProperty("data").GetString()!))==prepared.Confirmation.OutputHash&&input.SequenceEqual(original),"Encounter hover does not regenerate or invalidate exact frozen entity bytes");
        PokemonEncounterRuntime.Reset();

        var x=File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav");var before=x.ToArray();
        SaveService.OpenMysteryGiftDatabase(x,"{\"options\":{\"filterUnavailableSpecies\":false}}");
        var gift=MysteryGiftDatabaseRuntime.HoverEntry(x,0);var raw=((DataMysteryGift)gift).Data.ToArray();
        var giftTicket=JsonSerializer.Deserialize(SaveService.PreviewMysteryGiftDatabase(x,"{\"id\":0,\"convertToSave\":false}"),MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseTicket)!;
        CheckCandidate(x,new("gift",Id:0),gift,false);
        using(var frozen=JsonDocument.Parse(SaveService.CommitMysteryGiftDatabase(x,JsonSerializer.Serialize(giftTicket.Confirmation,MysteryGiftDatabaseJson.Default.MysteryGiftDatabaseConfirmation))))Check(Br4Editing.Hash(Convert.FromBase64String(frozen.RootElement.GetProperty("data").GetString()!))==giftTicket.Confirmation.OutputHash,"Gift hover retains exact frozen entity bytes");
        Check(((DataMysteryGift)gift).Data.SequenceEqual(raw)&&x.SequenceEqual(before),"Gift hover preserves template and frozen generation");
        var settings=SaveProgramSettingsCodec.Defaults();settings.Hover.HoverSlotShowEncounterVerbose=true;
        SaveProgramSettingsRuntime.Reset();SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
        try {
            CheckCandidate(x,new("gift",Id:0),gift,true);
            SaveService.OpenPokemonEncounters(input,[],"{}");
            SaveService.ReadPokemonEncounters(input,JsonSerializer.Serialize(search,PokemonEncounterJson.Default.PokemonEncounterReadRequest));
            var verboseEncounter=PokemonEncounterRuntime.HoverEntry(input,0);
            CheckCandidate(input,new("encounter",Id:0),verboseEncounter,true);
            var verbose=Read(input,new("encounter",Id:0));
            Check(verbose.Text.En.Tooltip.Length>string.Join(Environment.NewLine,verboseEncounter.GetTextLines(false,"en")).Length,"Verbose mode expands actual non-gift encounter record properties");
            PokemonEncounterRuntime.Reset();
        }finally{SaveProgramSettingsRuntime.Reset();}
        settings.Hover.HoverSlotShowText=false;
        SaveProgramSettingsRuntime.Configure(JsonSerializer.Serialize(settings,SaveProgramSettingsJson.Default.SaveProgramSettings));
        try {
            var hidden=Read(x,new("gift",Id:0));Check(hidden.Text.Zh.Tooltip==""&&hidden.Text.En.Tooltip==""&&hidden.Text.Ja.Tooltip=="","Candidate text switch suppresses display content");
        }finally{SaveProgramSettingsRuntime.Reset();MysteryGiftDatabaseRuntime.Reset();}
        foreach(string json in new[]{"{}","{\"kind\":\"gift\"}","{\"kind\":\"gift\",\"id\":-1}","{\"kind\":\"registered\",\"group\":0}","{\"kind\":\"other\",\"id\":0}","{\"kind\":\"slot\",\"box\":0,\"slot\":0,\"id\":1}"})Reject(()=>SaveService.ReadContextHover(input,json));
        Reject(()=>SaveService.ReadContextHover(input,new string(' ',1025)));
        Console.WriteLine("PASS context hover: database current/file ownership, independent namespaces, three-language source candidate text and verbose mode, frozen commits, hidden text, bounds and original/template bytes");
    }
    private static void CheckCandidate(byte[] input,PokemonHoverTarget target,IEncounterInfo source,bool verbose)
    {
        var result=Read(input,target);Check(result.Mode=="encounter"&&result.Box is null&&result.Slot is null,"Candidates have no fabricated Pokemon position or generated set");
        foreach(var pair in new[]{("zh-Hans",result.Text.Zh),("en",result.Text.En),("ja",result.Text.Ja)})Check(pair.Item2.Tooltip==string.Join(Environment.NewLine,source.GetTextLines(verbose,pair.Item1))&&pair.Item2.Moves.Length==0,"Exact source candidate details in all languages");
    }
    private static PokemonHoverReport Read(byte[] input,PokemonHoverTarget target)=>JsonSerializer.Deserialize(SaveService.ReadContextHover(input,JsonSerializer.Serialize(target,PokemonHoverJson.Default.PokemonHoverTarget)),PokemonHoverJson.Default.PokemonHoverReport)!;
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();}catch(ArgumentException){return;}catch(JsonException){return;}throw new Exception("Invalid context hover accepted");}
}
