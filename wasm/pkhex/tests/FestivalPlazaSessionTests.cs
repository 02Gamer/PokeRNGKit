// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PokeRNGKit.SaveEditor;
internal static class FestivalPlazaSessionTests
{
    internal static void Run()
    {
        Check(SaveService.ApiVersion == 172,"Festival product protocol");
        foreach(string version in new[]{"SN","US"})
        {
            var original=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");var copy=original.ToArray();var catalog=JsonSerializer.Deserialize(SaveService.ReadFestivalPlaza(original),SaveJsonContext.Default.FestaCatalog)!;var facility=catalog.Facilities[0] with{Type=0,Color=0,Npc=0,TrainerName="",LuckyRank=0,LuckyPlace=0,ExchangeLeft=0};var request=new FestaRequest(catalog.SourceHash,[new("coins",0,123)],0,facility);var ticket=JsonSerializer.Deserialize(SaveService.PreviewFestivalPlaza(original,JsonSerializer.Serialize(request,SaveJsonContext.Default.FestaRequest)),SaveJsonContext.Default.FestaTicket)!;var confirm=new FestaConfirmation(ticket.Token,ticket.SourceHash,ticket.TargetHash);var output=SaveService.CommitFestivalPlaza(original,JsonSerializer.Serialize(confirm,SaveJsonContext.Default.FestaConfirmation));Check(output.AsSpan().SequenceEqual(FestivalPlazaActions.Prepare(original,request.Actions,request.Selected,request.Facility))&&Br4Editing.Hash(output)==ticket.TargetHash,"Frozen exact bytes/hash");Check(ticket.Files.Length==(catalog.Usum?6:0),"All agency formats in frozen preview");Reject(()=>FestivalPlazaSession.Commit(original,confirm));var old=FestivalPlazaSession.Prepare(original,request);var fresh=FestivalPlazaSession.Prepare(original,request);FestivalPlazaSession.Discard(old.Token);Reject(()=>FestivalPlazaSession.Commit(original,new(old.Token,old.SourceHash,old.TargetHash)));var stale=original.ToArray();stale[0]^=1;Reject(()=>FestivalPlazaSession.Commit(stale,new(fresh.Token,fresh.SourceHash,fresh.TargetHash)));FestivalPlazaSession.Commit(original,new(fresh.Token,fresh.SourceHash,fresh.TargetHash));var invalid=FestivalPlazaSession.Prepare(original,request);Reject(()=>SaveService.PreviewFestivalPlaza(original,"{}"));Reject(()=>FestivalPlazaSession.Commit(original,new(invalid.Token,invalid.SourceHash,invalid.TargetHash)));Check(original.AsSpan().SequenceEqual(copy),"Original immutable");Console.WriteLine($"PASS Festival session {version}: required JSON, frozen complete output/agency exports, one-time/stale/replaced/targeted discard/failed preview and original");
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Festival session accepted");}catch(ArgumentException){}catch(JsonException){}}
}
