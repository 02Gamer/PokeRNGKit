// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Trainer9Confirmation([property:JsonRequired]string Token,[property:JsonRequired]string SourceHash,[property:JsonRequired]string TargetHash);
public sealed record Trainer9Ticket(string Token,string SourceHash,string TargetHash,Trainer9Catalog Before,Trainer9Catalog Result,int[] ChangedOffsets,string[] Operations);
internal static class Trainer9Session
{
    private static byte[]? output;private static Trainer9Confirmation? current;private static long revision;
    internal static void Reset(){output=null;current=null;}
    internal static Trainer9Ticket Prepare(byte[] original,Trainer9Request request)=>Prepare(SaveDetectionContext.OpenCurrent(original)as SAV9SV??throw new ArgumentException("Trainer9 save is unrecognized."),original,request);
    internal static Trainer9Ticket Prepare(SAV9SV source,byte[] original,Trainer9Request request)
    {
        Reset();string hash=Br4Editing.Hash(original);if(request.SourceHash!=hash)throw new ArgumentException("Trainer9 preview is stale.");var before=Trainer9Editing.Read(source,hash);var prepared=Trainer9Actions.Prepare(source,original,request);string target=Br4Editing.Hash(prepared);var after=new SAV9SV(prepared.ToArray());var result=Trainer9Editing.Read(after,target);string token="trainer9:"+(++revision).ToString(CultureInfo.InvariantCulture);var ticket=new Trainer9Ticket(token,hash,target,before,result,Enumerable.Range(0,original.Length).Where(i=>original[i]!=prepared[i]).ToArray(),request.Operations?.ToArray()??[]);output=prepared;current=new(token,hash,target);return ticket;
    }
    internal static byte[] Commit(byte[] original,Trainer9Confirmation confirmation)
    {
        if(current is null||output is null||confirmation!=current)throw new ArgumentException("Trainer9 preview is missing or replaced.");if(Br4Editing.Hash(original)!=current.SourceHash)throw new ArgumentException("Trainer9 preview is stale.");if(Br4Editing.Hash(output)!=current.TargetHash)throw new InvalidOperationException("Trainer9 frozen output verification failed.");var result=output.ToArray();Reset();return result;
    }
    internal static void Discard(string token){if(current?.Token==token)Reset();}
}
public static partial class SaveService
{
    public static string ReadTrainer9(byte[] data)=>JsonSerializer.Serialize(Trainer9Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Trainer9Catalog);
    public static string PreviewTrainer9(byte[] data,string json)
    {
        Trainer9Session.Reset();if(json.Length>4*1024*1024)throw new ArgumentException("Trainer9 request is too large.");var request=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Trainer9Request)??throw new ArgumentException("Missing Trainer9 request.");return JsonSerializer.Serialize(Trainer9Session.Prepare(data,request),SaveJsonContext.Default.Trainer9Ticket);
    }
    public static byte[] CommitTrainer9(byte[] data,string json)
    {
        if(json.Length>4096)throw new ArgumentException("Trainer9 confirmation is too large.");return Trainer9Session.Commit(data,JsonSerializer.Deserialize(json,SaveJsonContext.Default.Trainer9Confirmation)??throw new ArgumentException("Missing Trainer9 confirmation."));
    }
    public static void DiscardTrainer9(string token)=>Trainer9Session.Discard(token);
}
