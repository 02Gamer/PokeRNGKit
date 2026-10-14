// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;
public sealed record MailboxRequest([property:JsonRequired]string SourceHash,[property:JsonRequired]MailboxAction[] Actions);
public sealed record MailboxConfirmation([property:JsonRequired]string Token,[property:JsonRequired]string SourceHash,[property:JsonRequired]string TargetHash,[property:JsonRequired]bool AcceptIssues);
public sealed record MailboxTicket(string Token,string SourceHash,string TargetHash,MailboxCatalog Before,MailboxCatalog Result,int[] ChangedOffsets,string[] Issues);
internal static class MailboxSession
{
    private static byte[]? output;
    private static MailboxTicket? current;
    private static long revision;
    internal static void Reset(){output=null;current=null;}
    internal static MailboxTicket Prepare(byte[] original,MailboxRequest request)
    {
        Reset();string hash=Br4Editing.Hash(original);if(request.SourceHash!=hash)throw new ArgumentException("Mailbox preview is stale.");
        var source=SaveDetectionContext.OpenCurrent(original)??throw new ArgumentException("Mailbox save is unrecognized.");
        var before=new MailboxEditing(source).Read(hash);var prepared=MailboxEditing.Prepare(original,request.Actions);string target=Br4Editing.Hash(prepared.Output);
        var reopened=SaveDetectionContext.OpenDerived(prepared.Output)??throw new InvalidOperationException("Mailbox prepared save is unrecognized.");
        var result=new MailboxEditing(reopened).Read(target);string token="mailbox:"+(++revision).ToString(CultureInfo.InvariantCulture);
        var ticket=new MailboxTicket(token,hash,target,before,result,Enumerable.Range(0,original.Length).Where(i=>original[i]!=prepared.Output[i]).ToArray(),prepared.Issues);
        output=prepared.Output;current=ticket;return ticket;
    }
    internal static byte[] Commit(byte[] original,MailboxConfirmation confirmation)
    {
        if(current is null||output is null||confirmation.Token!=current.Token||confirmation.SourceHash!=current.SourceHash||confirmation.TargetHash!=current.TargetHash)throw new ArgumentException("Mailbox preview is missing or replaced.");
        if(Br4Editing.Hash(original)!=current.SourceHash)throw new ArgumentException("Mailbox preview is stale.");
        if(current.Issues.Length>0&&!confirmation.AcceptIssues)throw new ArgumentException("Mailbox validation issues require explicit acceptance.");
        if(Br4Editing.Hash(output)!=current.TargetHash)throw new InvalidOperationException("Mailbox frozen output verification failed.");
        var result=output.ToArray();Reset();return result;
    }
    internal static void Discard(string token){if(current?.Token==token)Reset();}
}
public static partial class SaveService
{
    public static string ReadMailbox(byte[] data)=>JsonSerializer.Serialize(new MailboxEditing(Open(data)).Read(Br4Editing.Hash(data)),SaveJsonContext.Default.MailboxCatalog);
    public static string PreviewMailbox(byte[] data,string json)
    {
        MailboxSession.Reset();if(json.Length>4*1024*1024)throw new ArgumentException("Mailbox request is too large.");
        var request=JsonSerializer.Deserialize(json,SaveJsonContext.Default.MailboxRequest)??throw new ArgumentException("Missing Mailbox request.");
        return JsonSerializer.Serialize(MailboxSession.Prepare(data,request),SaveJsonContext.Default.MailboxTicket);
    }
    public static byte[] CommitMailbox(byte[] data,string json)
    {
        if(json.Length>4096)throw new ArgumentException("Mailbox confirmation is too large.");
        return MailboxSession.Commit(data,JsonSerializer.Deserialize(json,SaveJsonContext.Default.MailboxConfirmation)??throw new ArgumentException("Missing Mailbox confirmation."));
    }
    public static void DiscardMailbox(string token)=>MailboxSession.Discard(token);
}
