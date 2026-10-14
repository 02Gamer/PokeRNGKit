// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class MailboxSessionTests
{
    internal static void Run()
    {
        Check(SaveService.ApiVersion == 161,"Mailbox product protocol");
        foreach(string version in new[]{"E","D","Pt","HG","B","B2"})
        {
            var original=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");var copy=original.ToArray();
            var catalog=JsonSerializer.Deserialize(SaveService.ReadMailbox(original),SaveJsonContext.Default.MailboxCatalog)!;int index=catalog.HeldCount;
            var request=new MailboxRequest(catalog.SourceHash,[new("delete",index,ModifyHeldItem:false)]);
            var ticket=JsonSerializer.Deserialize(SaveService.PreviewMailbox(original,JsonSerializer.Serialize(request,SaveJsonContext.Default.MailboxRequest)),SaveJsonContext.Default.MailboxTicket)!;
            var confirmation=new MailboxConfirmation(ticket.Token,ticket.SourceHash,ticket.TargetHash,true);
            if(ticket.Issues.Length>0)Reject(()=>MailboxSession.Commit(original,confirmation with{AcceptIssues=false}));
            var output=SaveService.CommitMailbox(original,JsonSerializer.Serialize(confirmation,SaveJsonContext.Default.MailboxConfirmation));
            Check(output.AsSpan().SequenceEqual(MailboxEditing.Prepare(original,request.Actions).Output)&&Br4Editing.Hash(output)==ticket.TargetHash,"Frozen exact output/hash");
            Reject(()=>MailboxSession.Commit(original,confirmation));
            var old=MailboxSession.Prepare(original,request);var fresh=MailboxSession.Prepare(original,request);MailboxSession.Discard(old.Token);
            Reject(()=>MailboxSession.Commit(original,new(old.Token,old.SourceHash,old.TargetHash,true)));
            var stale=original.ToArray();stale[0]^=1;Reject(()=>MailboxSession.Commit(stale,new(fresh.Token,fresh.SourceHash,fresh.TargetHash,true)));
            MailboxSession.Commit(original,new(fresh.Token,fresh.SourceHash,fresh.TargetHash,true));
            var invalid=MailboxSession.Prepare(original,request);Reject(()=>SaveService.PreviewMailbox(original,"{}"));Reject(()=>MailboxSession.Commit(original,new(invalid.Token,invalid.SourceHash,invalid.TargetHash,true)));
            foreach(string json in new[]{"{\"sourceHash\":\""+catalog.SourceHash+"\",\"actions\":[{}]}","{\"sourceHash\":\""+catalog.SourceHash+"\",\"actions\":null}"})Reject(()=>SaveService.PreviewMailbox(original,json));
            Check(original.AsSpan().SequenceEqual(copy),"Mailbox original immutable");
            Console.WriteLine($"PASS Mailbox session {version}: public JSON, frozen complete bytes, issue acknowledgment, stale/replacement/discard/one-time/failed preview and original");
        }
    }
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid mailbox session accepted");}catch(ArgumentException){}catch(JsonException){}}
}
