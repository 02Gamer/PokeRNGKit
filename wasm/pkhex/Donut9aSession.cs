// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Dn9aTicket(string Token,string SourceHash,string TargetHash,Dn9aCatalog Result,int[] ChangedEntries,int[] ChangedOffsets,string[] IgnoredFields);
public sealed record Dn9aConfirmation(string Token,string SourceHash,string TargetHash);
internal static class Donut9aSession
{
    private static byte[]? output;
    private static Dn9aConfirmation? current;
    private static long revision;
    internal static void Reset(){output=null;current=null;}
    internal static Dn9aTicket Prepare(SaveFile save,Dn9aEdit e,string hash,int length)
    {
        Reset();var prepared=Donut9aEditing.Prepare(save,e,hash,length,out var ignored);var target=Br4Editing.Hash(prepared);var before=Donut9aEditing.Save(save);var after=new SAV9ZA(prepared.ToArray());var indices=Enumerable.Range(0,999).Where(i=>!before.Donuts.GetDonut(i).Data.SequenceEqual(after.Donuts.GetDonut(i).Data)).ToArray();var beforeFile=before.Write().ToArray();var offsets=Enumerable.Range(0,length).Where(i=>beforeFile[i]!=prepared[i]).ToArray();string token="donut:"+(++revision).ToString(CultureInfo.InvariantCulture);output=prepared;current=new(token,hash,target);return new(token,hash,target,Donut9aEditing.Read(after,target),indices,offsets,ignored);
    }
    internal static byte[] Commit(byte[] data,Dn9aConfirmation confirmation)
    {
        if(output is null||current is null||confirmation!=current)throw new ArgumentException("Donut9a preview is missing or replaced.");if(Br4Editing.Hash(data)!=current.SourceHash)throw new ArgumentException("Donut9a preview is stale.");if(Br4Editing.Hash(output)!=current.TargetHash)throw new InvalidOperationException("Donut9a frozen output verification failed.");var result=output.ToArray();output=null;current=null;return result;
    }
    internal static void Discard(string token){if(current?.Token==token){output=null;current=null;}}
}
public static partial class SaveService
{
    private static Dn9aEdit ParseDonut9a(string json)=>json.Length>300000?throw new ArgumentException("Donut9a request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Dn9aEdit)??throw new ArgumentException("Missing Donut9a request.");
    public static string ReadDonut9a(byte[] data)=>JsonSerializer.Serialize(Donut9aEditing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Dn9aCatalog);
    public static string PreviewDonut9a(byte[] data,string json){Donut9aSession.Reset();return JsonSerializer.Serialize(Donut9aSession.Prepare(Open(data),ParseDonut9a(json),Br4Editing.Hash(data),data.Length),SaveJsonContext.Default.Dn9aTicket);}
    public static byte[] CommitDonut9a(byte[] data,string json)=>json.Length>4096?throw new ArgumentException("Donut9a confirmation too large."):Donut9aSession.Commit(data,JsonSerializer.Deserialize(json,SaveJsonContext.Default.Dn9aConfirmation)??throw new ArgumentException("Missing Donut9a confirmation."));
    public static void DiscardDonut9a(string token)=>Donut9aSession.Discard(token);
    public static byte[] ExportDonut9a(byte[] data,int index){if((uint)index>=999)throw new ArgumentException("Invalid Donut9a export index.");var s=Donut9aEditing.Save(Open(data));if(!Donut9aEditing.Available(s))throw new ArgumentException("Donut9a block is unavailable.");var bytes=s.Donuts.GetDonut(index).Data.ToArray();Donut9aEditing.Resave(new Donut9a(bytes));return bytes;}
}
